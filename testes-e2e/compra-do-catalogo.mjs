/**
 * Verificação de ponta a ponta — a compra de cursos do catálogo pela
 * EMPRESA (etapa 6 do plano de perfis, db/047).
 *
 * O caminho inteiro no navegador: o RH da Aurora abre a loja em
 * /empresa/catalogo → compra 2 vagas de um curso da plataforma → paga
 * (webhook assinado, como o gateway faria) → distribui uma vaga a uma
 * colaboradora em Liberar trilhas → a colaboradora entra no portal da
 * Aurora e vê o curso como "curso da plataforma" → abre a página do curso
 * pela rota de parceiro dentro do portal fechado → o visitante anônimo
 * toma 404 nessa mesma rota → o RH pede um orçamento acima do limite →
 * o admin propõe um valor → o RH vê "Aceitar e pagar".
 *
 * Contas de demonstração (scripts/demo/LEIA-ME.md): gestor e colaboradora
 * da Aurora. Cria um admin temporário e apaga tudo que gerou no fim.
 *
 *   BASE_URL=http://localhost:3010 \
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimoreosaber \
 *   CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" \
 *   node testes-e2e/compra-do-catalogo.mjs
 */
import { chromium } from 'playwright-core';
import { createHmac, randomBytes } from 'node:crypto';
import pg from 'pg';
import { gerarHashSenha } from '../lib/auth.ts';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const porta = new URL(base).port ? `:${new URL(base).port}` : '';
const EMPRESA = `http://aurora.localhost${porta}`;
const segredo = process.env.WEBHOOK_SEGREDO ?? 'segredo-de-desenvolvimento';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});

let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };
const caminho = (p) => new URL(p.url()).pathname + new URL(p.url()).search;

const GESTOR = { email: 'treinamento@grupoaurora.com.br', senha: 'universidade-aurora-2026' };
const COLAB = { email: 'tereza.souza@grupoaurora.com.br', senha: 'minha-senha-aurora' };
const ADMIN = { email: 'e2e-vagas-admin@exemplo.com', senha: 'admin-vagas-2026' };

const { rows: [aurora] } = await pool.query(`SELECT id FROM portal WHERE mascara = 'aurora'`);
const { rows: [gestorRow] } = await pool.query(`SELECT id FROM usuario WHERE portal_id = 0 AND email = $1`, [GESTOR.email]);
const { rows: [colabRow] } = await pool.query(`SELECT id FROM usuario WHERE portal_id = $1 AND email = $2`, [aurora.id, COLAB.email]);
// O curso da plataforma que a loja vende: o primeiro publicado da casa, com aula.
const { rows: [curso] } = await pool.query(
  `SELECT m.id, m.slug, m.nome, m.vagas_sem_orcamento AS limite FROM materia m
    WHERE m.portal_id = 0 AND m.status = 'publicado' AND m.professor_id IS NULL
      AND EXISTS (SELECT 1 FROM aula a JOIN assunto s ON s.id = a.assunto_id WHERE s.materia_id = m.id AND a.status = 'publicado')
    ORDER BY m.ordem, m.id LIMIT 1`);

async function limpar() {
  await pool.query(`DELETE FROM licenca WHERE lote_id IN (SELECT id FROM licenca_lote WHERE portal_id = $1)`, [aurora.id]);
  await pool.query(`DELETE FROM licenca_lote WHERE portal_id = $1`, [aurora.id]);
  await pool.query(`DELETE FROM orcamento_empresa WHERE portal_id = $1`, [aurora.id]);
  await pool.query(`DELETE FROM pedido WHERE empresa_portal_id = $1`, [aurora.id]);
  await pool.query(`DELETE FROM usuario WHERE email = $1`, [ADMIN.email]);
}
await limpar();
{
  const { rows: [conta] } = await pool.query(
    `INSERT INTO conta (email, nome, senha_hash) VALUES ($1, 'Admin e2e', $2) RETURNING id`,
    [ADMIN.email, await gerarHashSenha(ADMIN.senha)]);
  await pool.query(`INSERT INTO usuario (portal_id, conta_id, nome, email, papel) VALUES (0, $1, 'Admin e2e', $2, 'admin')`,
    [conta.id, ADMIN.email]);
}

async function confirmar(referencia) {
  const corpo = JSON.stringify({ eventoId: 'e2e_' + randomBytes(8).toString('hex'), tipo: 'pagamento.confirmado', referencia, centavos: 0 });
  const r = await fetch(`${base}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-assinatura': 'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex') },
    body: corpo,
  });
  return { status: r.status, corpo: await r.json().catch(() => ({})) };
}

async function entrar(endereco, email, senha) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto(`${endereco}/entrar`, { waitUntil: 'networkidle' });
  await p.fill('input[name=email]', email);
  await p.fill('input[name=senha]', senha);
  await p.click('form.formulario button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 20000 }).catch(() => {});
  return [ctx, p];
}

try {
  // ------------------------------------------------------------ a loja e a compra
  console.log('\n— loja do catálogo, compra e pagamento —');
  let [ctx, p] = await entrar(base, GESTOR.email, GESTOR.senha);
  check(caminho(p) === '/empresa', `o gestor entra no painel da empresa (${caminho(p)})`);
  check(await p.locator('aside.lateral a', { hasText: 'Catálogo da plataforma' }).isVisible(), 'o menu tem "Catálogo da plataforma"');
  await p.goto(`${base}/empresa/catalogo`, { waitUntil: 'networkidle' });
  const cartao = p.locator('.cartao', { hasText: curso.nome }).last();
  check(await cartao.isVisible(), `o curso "${curso.nome}" está à venda`);
  check((await cartao.textContent()).includes(`até ${curso.limite} vaga(s) na hora`), `a loja diz o limite do curso (${curso.limite})`);

  // acima do limite o botão vira "Pedir orçamento" antes de qualquer envio
  await cartao.locator('input[name=quantidade]').fill(String(curso.limite + 1));
  check(await cartao.locator('button', { hasText: 'Pedir orçamento' }).isVisible(), 'acima do limite, o botão vira "Pedir orçamento"');
  await cartao.locator('input[name=quantidade]').fill('2');
  check(await cartao.locator('button', { hasText: 'Comprar' }).isVisible(), 'dentro do limite, "Comprar"');
  await cartao.locator('button', { hasText: 'Comprar' }).click();
  await p.waitForURL('**/checkout/**', { timeout: 20000 });
  const referencia = caminho(p).split('/checkout/')[1];
  check(Boolean(referencia), `vai ao checkout (${caminho(p)})`);
  check((await p.locator('.sub').first().textContent()).includes('2 vaga(s)'), 'o checkout diz que são 2 vagas para a equipe');
  const { rows: [pedido] } = await pool.query(
    `SELECT quantidade, empresa_portal_id, portal_id, centavos FROM pedido WHERE referencia = $1`, [referencia]);
  check(pedido && pedido.quantidade === 2 && Number(pedido.empresa_portal_id) === Number(aurora.id) && Number(pedido.portal_id) === 0,
    'o pedido é da plataforma, com 2 vagas para a Aurora');

  const pago = await confirmar(referencia);
  check(pago.status === 200, 'o webhook confirmou o pagamento');
  await p.reload({ waitUntil: 'networkidle' });
  check(await p.locator('a', { hasText: 'Distribuir as vagas' }).isVisible(), 'o checkout pago manda distribuir as vagas');
  const { rows: [lote] } = await pool.query(`SELECT id, quantidade FROM licenca_lote WHERE portal_id = $1 ORDER BY id DESC LIMIT 1`, [aurora.id]);
  check(lote && lote.quantidade === 2, 'nasceu o lote de 2 vagas');
  check((await pool.query(`SELECT 1 FROM licenca WHERE pedido_id = (SELECT id FROM pedido WHERE referencia = $1)`, [referencia])).rowCount === 0,
    'o gestor não ganhou licença para ele mesmo');

  // ------------------------------------------------------------ distribuir
  console.log('\n— distribuição da vaga —');
  await p.goto(`${base}/empresa/atribuicoes`, { waitUntil: 'networkidle' });
  check(await p.locator('#vagas').isVisible(), 'Liberar trilhas mostra as vagas compradas');
  await p.selectOption('#vagas select[name=loteId]', String(lote.id));
  await p.selectOption('#vagas select[name=usuarioId]', String(colabRow.id));
  await p.click('#vagas form.form-linha button[type=submit]');
  await p.waitForSelector('#vagas .alerta-ok', { timeout: 15000 });
  await p.reload({ waitUntil: 'networkidle' });
  check((await p.locator('#vagas table').textContent()).includes(COLAB.email), 'a colaboradora aparece com a vaga');
  await p.goto(`${base}/empresa/catalogo`, { waitUntil: 'networkidle' });
  check((await p.locator('table').first().textContent()).includes('1 livre'), 'a loja mostra 1 vaga livre no lote');

  // ------------------------------------------------------------ orçamento
  console.log('\n— orçamento acima do limite —');
  const cartao2 = p.locator('.cartao', { hasText: curso.nome }).last();
  await cartao2.locator('input[name=quantidade]').fill(String(curso.limite + 5));
  await cartao2.locator('input[name=mensagem]').fill('para toda a operação');
  await cartao2.locator('button', { hasText: 'Pedir orçamento' }).click();
  await p.waitForSelector('.alerta-ok', { timeout: 15000 });
  await p.reload({ waitUntil: 'networkidle' });
  check((await p.locator('body').textContent()).includes('aguardando'), 'o orçamento aparece aguardando resposta');
  await ctx.close();

  [ctx, p] = await entrar(base, ADMIN.email, ADMIN.senha);
  await p.goto(`${base}/admin/empresas`, { waitUntil: 'networkidle' });
  const linhaOrc = p.locator('tr', { hasText: 'para toda a operação' }).first();
  check(await linhaOrc.isVisible(), 'o admin vê o orçamento na fila');
  await linhaOrc.locator('input[name=valor]').fill('1.234,50');
  await linhaOrc.locator('input[name=resposta]').first().fill('desconto de volume');
  await linhaOrc.locator('button', { hasText: 'Propor' }).click();
  await p.waitForSelector('.alerta-ok', { timeout: 15000 });
  const { rows: [orc] } = await pool.query(`SELECT status, valor_centavos FROM orcamento_empresa WHERE portal_id = $1 ORDER BY id DESC LIMIT 1`, [aurora.id]);
  check(orc.status === 'proposto' && orc.valor_centavos === 123450, 'a proposta foi gravada (R$ 1.234,50)');
  await ctx.close();

  [ctx, p] = await entrar(base, GESTOR.email, GESTOR.senha);
  await p.goto(`${base}/empresa/catalogo`, { waitUntil: 'networkidle' });
  check(await p.locator('button', { hasText: 'Aceitar e pagar' }).isVisible(), 'o RH vê "Aceitar e pagar" com a proposta');
  check((await p.locator('body').textContent()).includes('1.234,50'), 'e o valor proposto');
  await ctx.close();

  // ------------------------------------------------------------ a colaboradora
  console.log('\n— a colaboradora no portal da empresa —');
  [ctx, p] = await entrar(EMPRESA, COLAB.email, COLAB.senha);
  check(caminho(p).startsWith('/painel'), `entra no portal da Aurora (${caminho(p)})`);
  // O redirecionamento do login resolve antes de o painel terminar de
  // renderizar: abre a rota de novo, esperando a rede sossegar.
  await p.goto(`${EMPRESA}/painel`, { waitUntil: 'networkidle' });
  const painel = await p.locator('body').innerText();
  check(painel.includes(curso.nome) && painel.includes('curso da plataforma'), 'o painel lista o curso comprado, marcado como curso da plataforma');
  await p.click(`a[href="/parceiros/plataforma/materia/${curso.slug}"]`);
  // Navegação de cliente (next/link): espera a URL, não só a rede.
  await p.waitForURL(`**/parceiros/plataforma/materia/${curso.slug}`, { timeout: 20000 }).catch(() => {});
  await p.waitForLoadState('networkidle');
  check(caminho(p) === `/parceiros/plataforma/materia/${curso.slug}`, 'o link leva à rota do curso da plataforma dentro do portal');
  check(await p.locator('h1', { hasText: curso.nome }).first().isVisible(), 'a página do curso abre para quem tem a vaga');
  check(!(await p.locator('body').textContent()).includes('R$'), 'sem preço: a vaga já foi paga pela empresa');
  await ctx.close();

  // anônimo, na mesma rota: 404
  ctx = await b.newContext();
  p = await ctx.newPage();
  const r = await p.goto(`${EMPRESA}/parceiros/plataforma/materia/${curso.slug}`, { waitUntil: 'load' });
  check(r.status() === 404 || caminho(p).startsWith('/entrar'), `anônimo não vê o curso no portal fechado (${r.status()})`);
  await ctx.close();
} finally {
  await limpar();
  await pool.end();
  await b.close();
}

console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
