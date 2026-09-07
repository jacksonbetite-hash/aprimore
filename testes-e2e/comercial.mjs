/**
 * Verificação de ponta a ponta — jornada comercial (§8 e §6.6).
 *
 * Cobre o caminho que faz a operação funcionar: cadastro → teste grátis
 * → paywall → compra → pagamento confirmado pelo webhook → acesso
 * liberado → cancelamento → reembolso.
 *
 *   node testes-e2e/comercial.mjs
 */
import { chromium } from 'playwright-core';
import { createHmac, randomBytes } from 'node:crypto';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const segredo = process.env.WEBHOOK_SEGREDO ?? 'segredo-de-desenvolvimento';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };

/** Confirma um pagamento como o gateway faria, com assinatura válida. */
async function confirmar(referencia, tipo = 'pagamento.confirmado') {
  const corpo = JSON.stringify({
    eventoId: 'e2e_' + randomBytes(8).toString('hex'), tipo, referencia, centavos: 0,
  });
  const r = await fetch(`${base}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-assinatura': 'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex'),
    },
    body: corpo,
  });
  return { status: r.status, corpo: await r.json().catch(() => ({})) };
}

// ---------- webhook: segurança antes de tudo ----------
const semAssinatura = await fetch(`${base}/api/webhook`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventoId: 'x', tipo: 'pagamento.confirmado', referencia: 'AD-0-0' }),
});
check(semAssinatura.status === 401, 'webhook sem assinatura é recusado (401)');

const assinaturaErrada = await fetch(`${base}/api/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-assinatura': 'sha256=' + 'a'.repeat(64) },
  body: JSON.stringify({ eventoId: 'x', tipo: 'pagamento.confirmado', referencia: 'AD-0-0' }),
});
check(assinaturaErrada.status === 401, 'webhook com assinatura errada é recusado (401)');

// ---------- jornada do aluno ----------
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
const email = `compra${Date.now()}@exemplo.com`;

await p.goto(base + '/cadastrar', { waitUntil: 'load' });
await p.fill('input[name=nome]', 'Carla Compradora');
await p.fill('input[name=email]', email);
await p.fill('input[name=senha]', 'constitucional-2026');
await p.click('form.formulario button[type=submit]');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(true, 'conta criada');

// aula licenciada bloqueada para conta nova
await p.goto(base + '/aula/clausulas-petreas', { waitUntil: 'load' });
check(await p.getByText('curso licenciado').first().isVisible().catch(() => false)
   || await p.getByText('teste gratuito libera').first().isVisible().catch(() => false),
  'conta nova esbarra no paywall');

// ---------- teste gratuito ----------
await p.goto(base + '/planos', { waitUntil: 'load' });
await p.click('form:has(select[name=materiaId]) button:has-text("Ativar meus 7 dias")');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(await p.getByText('Teste de 7 dias ativado').first().isVisible(), 'teste de 7 dias ativado');
check(await p.getByText('Teste Grátis:').first().isVisible(), 'painel mostra os dias restantes');

// segunda ativação é recusada
await p.goto(base + '/planos', { waitUntil: 'load' });
const temBotaoTrial = await p.locator('button:has-text("Ativar meus 7 dias")').count();
check(temBotaoTrial === 0, 'o teste não é oferecido duas vezes');

// ---------- compra ----------
// compra a matéria que contém a aula bloqueada, não a primeira da lista:
// licença de outra matéria não pode abrir esta, e o teste precisa checar
// o caso que importa
await p.selectOption('form:has(input[value=MATERIA]) select[name=materiaId]',
  { label: 'Noções de Direito Constitucional' });
await p.fill('form:has(input[value=MATERIA]) input[name=cpf]', '529.982.247-25');
await p.click('form:has(input[value=MATERIA]) button:has-text("Assinar este curso")');
await p.waitForURL('**/checkout/**', { timeout: 20000 });
const referencia = p.url().split('/checkout/')[1];
check(/^AD-\d{8}-[A-F0-9]{6}$/.test(referencia), `pedido aberto (${referencia})`);
check(await p.getByText('Pague com Pix').isVisible(), 'checkout mostra o Pix');
check(await p.getByText('demonstração').first().isVisible(),
  'a tela avisa que nenhuma cobrança real acontece');
await p.screenshot({ path: '/tmp/ad-checkout.png', fullPage: true });

// ---------- confirmação pelo webhook ----------
const primeira = await confirmar(referencia);
check(primeira.status === 200 && primeira.corpo.processado, 'webhook confirmou o pagamento');
check(Boolean(primeira.corpo.licencaId), 'licença emitida');

const repetida = await confirmar(referencia);
check(repetida.corpo.jaProcessado || repetida.corpo.processado === false,
  'reenvio do MESMO tipo de evento não emite segunda licença');

await p.goto(base + '/checkout/' + referencia, { waitUntil: 'load' });
check(await p.getByText('Pagamento confirmado').isVisible(), 'checkout reflete o pagamento');

// acesso liberado na matéria comprada
await p.goto(base + '/aula/clausulas-petreas', { waitUntil: 'load' });
check(await p.locator('.alternativa').first().isVisible(),
  'a aula antes bloqueada abriu com a licença comprada');

// E a licença de uma matéria NÃO abre outra.
//
// A aula escolhida precisa cumprir três condições ao mesmo tempo: ser de
// OUTRA matéria (Introdução ao Direito), não ser amostra gratuita, e
// estar FORA da cota do teste de 7 dias — que esta conta ativou lá em
// cima, na matéria padrão da lista. Se uma onda de conteúdo puser esta
// aula no teste, o certo é trocar a aula aqui, não afrouxar a asserção:
// o que está sob teste é o vazamento de licença, não a cota.
await p.goto(base + '/aula/sete-dicas-para-quem-esta-comecando', { waitUntil: 'load' });
check(!(await p.locator('.alternativa').first().isVisible().catch(() => false)),
  'licença de uma matéria não vaza para outra');

// ---------- conta: pedidos, cancelamento e reembolso ----------
await p.goto(base + '/conta', { waitUntil: 'load' });
check((await p.getByText(referencia).count()) > 0, 'o pedido aparece em Minha conta');
check(await p.getByText('pago').first().isVisible(), 'o pedido consta como pago');
await p.screenshot({ path: '/tmp/ad-conta.png', fullPage: true });

await p.click('button:has-text("Pedir reembolso")');
await p.waitForTimeout(2000);
check(await p.getByText('reembolsado').first().isVisible(), 'reembolso em 7 dias aplicado');

await p.goto(base + '/aula/clausulas-petreas', { waitUntil: 'load' });
check(!(await p.locator('.alternativa').first().isVisible().catch(() => false)),
  'depois do reembolso o acesso é encerrado');

await b.close();
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
