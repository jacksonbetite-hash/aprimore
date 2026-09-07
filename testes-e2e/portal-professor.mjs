/**
 * Verificação de ponta a ponta — o funil do Portal do Professor
 * (§5.10.2, etapas 1 a 3), do anúncio na home ao portal no ar.
 *
 * Roda contra a aplicação de pé (docker compose up -d), com Playwright:
 *
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimoreosaber \
 *   BASE_URL=http://localhost:3010 node testes-e2e/portal-professor.mjs
 *
 * A confirmação de pagamento e a aprovação da subconta batem no MESMO
 * webhook que o gateway real usa, com a mesma assinatura.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { chromium } from 'playwright-core';
import pg from 'pg';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const porta = new URL(base).port || '80';
const segredo = process.env.WEBHOOK_SEGREDO ?? 'segredo-de-desenvolvimento';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});
let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };

const sufixo = randomBytes(3).toString('hex');
const MASCARA = `e2e-prof-${sufixo}`;
const EMAIL = `e2e-prof-${sufixo}@exemplo.com`;

async function webhook(corpoObj) {
  const corpo = JSON.stringify(corpoObj);
  const assinatura = 'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex');
  const r = await fetch(`${base}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-assinatura': assinatura },
    body: corpo,
  });
  return r.json();
}

const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();

// ---------- a divulgação existe e leva à página ----------
await p.goto(base + '/', { waitUntil: 'load' });
check(await p.locator('a[href="/para-professores"]').first().isVisible(),
  'a home anuncia o Portal do Professor');

await p.goto(base + '/planos', { waitUntil: 'load' });
check((await p.locator('#professores').textContent() ?? '').includes('149'),
  'a seção de planos mostra o preço do plano ativo');

// ---------- a página vende com o preço do banco ----------
await p.goto(base + '/para-professores', { waitUntil: 'load' });
const preco = await p.locator('.plano .valor').textContent();
check((preco ?? '').includes('149'), `o preço vem do plano ativo (${preco?.trim()})`);
check((await p.locator('#preco').textContent() ?? '').includes('10%'),
  'o percentual está dito com todas as letras');

// ---------- contratação ----------
await p.fill('input[name=nome]', 'Prof. Funil');
await p.fill('input[name=email]', EMAIL);
await p.fill('input[name=senha]', 'senha-bem-longa');
await p.fill('input[name=cnpj]', '11.222.333/0001-81');
await p.fill('input[name=telefone]', '(11) 98765-4321');
await p.fill('input[name=renda]', '8000');
await p.fill('input[name=cep]', '01310-100');
await p.fill('input[name=logradouro]', 'Av. Paulista');
await p.fill('input[name=numero]', '1000');
await p.fill('input[name=bairro]', 'Bela Vista');
await p.fill('input[name=nomeExibicao]', 'Funil de Teste');
await p.fill('input[name=mascara]', MASCARA);
await p.check('input[name=aceite]');
await p.click('#contratar button[type=submit]');
await p.waitForURL('**/para-professores/pagamento/**', { timeout: 20000 });
const referencia = p.url().split('/').pop();
check(referencia.startsWith('PF-'), `contratou e caiu na fatura (${referencia})`);
check((await p.locator('.cartao-auth').textContent() ?? '').includes('Pague com Pix'),
  'a tela de pagamento mostra o Pix');

// CNPJ inválido não passa (numa aba à parte, sem sujar o fluxo)
const p2 = await ctx.newPage();
await p2.goto(base + '/para-professores', { waitUntil: 'load' });
await p2.fill('input[name=nome]', 'Prof. Errado');
await p2.fill('input[name=email]', `errado-${sufixo}@exemplo.com`);
await p2.fill('input[name=senha]', 'senha-bem-longa');
await p2.fill('input[name=cnpj]', '11.222.333/0001-80');
await p2.fill('input[name=telefone]', '(11) 98765-4321');
await p2.fill('input[name=renda]', '8000');
await p2.fill('input[name=cep]', '01310-100');
await p2.fill('input[name=logradouro]', 'Av. Paulista');
await p2.fill('input[name=numero]', '1000');
await p2.fill('input[name=bairro]', 'Bela Vista');
await p2.fill('input[name=nomeExibicao]', 'Não Nasce');
await p2.fill('input[name=mascara]', `nao-nasce-${sufixo}`);
await p2.check('input[name=aceite]');
await p2.click('#contratar button[type=submit]');
await p2.waitForTimeout(1500);
check((await p2.locator('.alerta-erro').textContent() ?? '').includes('CNPJ'),
  'CNPJ com dígito errado é barrado no formulário');
await p2.close();

// ---------- antes de pagar, o endereço não existe na rua ----------
await p.goto(`http://${MASCARA}.localhost:${porta}/`, { waitUntil: 'load' });
check((await p.title()).includes('Aprimore o Saber'),
  'portal não pago cai no site principal — invisível até pagar');

check((await fetch(`${base}/api/dominio-permitido?domain=${MASCARA}.localhost`)).status === 403,
  'o Caddy não emite certificado para portal que ainda não pagou');

// ---------- pagamento confirma e o portal nasce ----------
const rf = await webhook({
  eventoId: 'e2e-fat-' + sufixo, tipo: 'pagamento.confirmado', referencia, centavos: 14900,
});
check(rf.processado && rf.portalAtivado, 'webhook de pagamento ativou o portal');
check(rf.subconta === 'EM_ANALISE', 'a subconta foi pedida sozinha, em análise');
check((await fetch(`${base}/api/dominio-permitido?domain=${MASCARA}.localhost`)).status === 200,
  'portal no ar: o Caddy pode emitir o certificado do subdomínio');
check((await fetch(`${base}/api/dominio-permitido?domain=invasor.exemplo.com`)).status === 403,
  'domínio desconhecido não ganha certificado');

await p.goto(`${base}/para-professores/pagamento/${referencia}`, { waitUntil: 'load' });
const depois = await p.locator('.cartao-auth').textContent() ?? '';
check(depois.includes('Seu portal está no ar'), 'a tela vira "portal no ar"');
check(depois.includes('em análise'), 'e avisa que a venda abre quando a conta aprovar');

await p.goto(`http://${MASCARA}.localhost:${porta}/catalogo`, { waitUntil: 'load' });
check(!(await p.content()).includes('Introdução ao Direito'),
  'o catálogo do portal novo nasce isolado do nosso');
check(!(await p.locator('a[href="/para-professores"]').count()),
  'dentro do portal, o convite "monte o seu" não aparece');

// ---------- aprovação da subconta abre a venda ----------
const { rows } = await pool.query(
  `SELECT gateway_subconta_id AS id FROM portal WHERE mascara = $1`, [MASCARA]);
const rs = await webhook({
  eventoId: 'e2e-sub-' + sufixo, tipo: 'subconta.aprovada', referencia: rows[0].id, centavos: 0,
});
check(rs.processado && rs.subconta === 'APROVADA', 'webhook do gateway aprovou a subconta');

await p.goto(`${base}/para-professores/pagamento/${referencia}`, { waitUntil: 'load' });
check(!((await p.locator('.cartao-auth').textContent() ?? '').includes('em análise')),
  'aprovada, o aviso de análise some');

await p.screenshot({ path: '/tmp/ad-portal-funil.png', fullPage: true });
await ctx.close();
await b.close();

// ---------- limpeza: o funil não deixa rastro no banco ----------
// O portal nasce com tabela de preço copiada da plataforma
// (semearPrecosDaPlataforma), e `preco` não tem ON DELETE CASCADE: sem
// esta linha a limpeza falha e o portal de teste fica no banco ocupando
// o teto regulatório do autosserviço.
await pool.query(`DELETE FROM preco WHERE portal_id IN (SELECT id FROM portal WHERE mascara = $1)`, [MASCARA]);
await pool.query(`DELETE FROM portal WHERE mascara = $1`, [MASCARA]);
await pool.query(`DELETE FROM usuario WHERE email = $1`, [EMAIL]);
await pool.end();

console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
