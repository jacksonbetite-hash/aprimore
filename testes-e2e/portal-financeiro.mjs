/**
 * Verificação de ponta a ponta — etapa 4 do §5.10.2: indicação pelo link
 * rastreado, telas de alunos e financeiro no admin, e o portal suspenso.
 *
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimore \
 *   BASE_URL=http://localhost:3010 SENHA_ADMIN=... node testes-e2e/portal-financeiro.mjs
 *
 * Usa o portal de demonstração `jackson`; deixa-o como encontrou.
 */
import { chromium } from 'playwright-core';
import pg from 'pg';

const senhaAdmin = process.env.SENHA_ADMIN;
if (!senhaAdmin) { console.error('defina SENHA_ADMIN'); process.exit(1); }

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const porta = new URL(base).port || '80';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimore',
});
let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };

const { rows: [jackson] } = await pool.query(`SELECT id, status FROM portal WHERE mascara = 'jackson'`);
if (!jackson) { console.error('portal de demonstração "jackson" não existe'); process.exit(1); }

const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
const p = await ctx.newPage();

// ---------- o link rastreado (§5.10.1) ----------
const antes = (await pool.query(`SELECT count(*)::int AS c FROM indicacao WHERE portal_id = $1`, [jackson.id])).rows[0].c;
const resp = await p.goto(`${base}/ir/jackson?canal=teste`, { waitUntil: 'load' });
check(p.url().startsWith(`http://jackson.localhost:${porta}/`), `o clique redireciona ao portal (${p.url()})`);
check(!p.url().includes('i='), 'o token saiu da URL');
const cookies = await ctx.cookies(`http://jackson.localhost:${porta}`);
check(cookies.some((c) => c.name === 'ad_indicacao' && c.httpOnly), 'o token virou cookie httpOnly do portal');
const depois = (await pool.query(`SELECT count(*)::int AS c FROM indicacao WHERE portal_id = $1`, [jackson.id])).rows[0].c;
check(depois === antes + 1, 'a indicação nasceu no clique, antes de qualquer cadastro');
const { rows: [ind] } = await pool.query(
  `SELECT canal, expira_em > now() + interval '80 days' AS longa FROM indicacao
    WHERE portal_id = $1 ORDER BY id DESC LIMIT 1`, [jackson.id]);
check(ind.canal === 'TESTE' && ind.longa, 'canal registrado e validade do contrato aplicada');

// ---------- admin: alunos e financeiro ----------
await p.goto(base + '/entrar', { waitUntil: 'load' });
await p.fill('input[name=email]', 'admin@aprimoreosaber.com.br');
await p.fill('input[name=senha]', senhaAdmin);
await p.click('form.formulario button[type=submit]');
await p.waitForURL('**/painel*', { timeout: 20000 });

await p.goto(`${base}/admin/portais/${jackson.id}`, { waitUntil: 'load' });
check(await p.locator(`a[href="/admin/portais/${jackson.id}/alunos"]`).isVisible(), 'o portal linka para Alunos');
check(await p.locator(`a[href="/admin/portais/${jackson.id}/financeiro"]`).isVisible(), 'e para Financeiro');

await p.goto(`${base}/admin/portais/${jackson.id}/alunos`, { waitUntil: 'load' });
check((await p.textContent('h1')).includes('Alunos'), 'tela de alunos carrega');
check((await p.locator('.aviso').textContent()).includes('LGPD'), 'e avisa que a base é do professor (LGPD)');

await p.goto(`${base}/admin/portais/${jackson.id}/financeiro`, { waitUntil: 'load' });
check((await p.textContent('h1')).includes('Financeiro'), 'tela financeira carrega');
const texto = await p.textContent('main, body');
check(texto.includes('Extrato venda a venda') && texto.includes('Faturas'), 'com extrato e faturas');
await p.click('form button:has-text("Medir armazenamento")');
await p.waitForTimeout(1500);
check((await p.textContent('body')).includes('medido'), 'medição de armazenamento roda pelo botão');
await p.screenshot({ path: '/tmp/ad-portal-financeiro.png', fullPage: true });

// ---------- portal suspenso (§5.10) ----------
// Uma aula publicada no portal de demonstração, só para este teste: o
// banco de desenvolvimento tem a matéria do jackson sem aula nenhuma.
const { rows: [mat] } = await pool.query(
  `SELECT id FROM materia WHERE portal_id = $1 ORDER BY id LIMIT 1`, [jackson.id]);
const { rows: [ass] } = await pool.query(
  `INSERT INTO assunto (portal_id, materia_id, slug, nome) VALUES ($1, $2, 'e2e-tema', 'Tema e2e') RETURNING id`,
  [jackson.id, mat.id]);
await pool.query(
  `INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, status)
   VALUES ($1, $2, 'e2e-aula-suspensa', 'Aula e2e', 60,
           'Aula criada pelo teste de ponta a ponta do portal suspenso.', 'publicado')`,
  [jackson.id, ass.id]);
await pool.query(`UPDATE portal SET status = 'SUSPENSO', suspenso_em = now() WHERE id = $1`, [jackson.id]);
try {
  const anon = await (await b.newContext()).newPage();
  await anon.goto(`http://jackson.localhost:${porta}/catalogo`, { waitUntil: 'load' });
  const corpo = await anon.textContent('body');
  check(corpo.includes('temporariamente indisponível'), 'visitante vê o portal suspenso fora do ar');
  check(!corpo.includes('Introducao (Jackson)'), 'e não vê o catálogo');
  await anon.goto(`http://jackson.localhost:${porta}/aula/e2e-aula-suspensa`, { waitUntil: 'load' });
  check((await anon.textContent('body')).includes('temporariamente indisponível'),
    'aula bloqueada no portal suspenso mostra o aviso, não a oferta');
  await anon.context().close();
} finally {
  await pool.query(`UPDATE portal SET status = 'ATIVO', suspenso_em = NULL WHERE id = $1`, [jackson.id]);
  await pool.query(`DELETE FROM assunto WHERE id = $1`, [ass.id]);   // a aula cai em cascata
}
const { rows: [volta] } = await pool.query(`SELECT status FROM portal WHERE id = $1`, [jackson.id]);
check(volta.status === 'ATIVO', 'portal de demonstração devolvido como estava');

await ctx.close();
await b.close();
await pool.query(`DELETE FROM indicacao WHERE portal_id = $1 AND canal = 'TESTE'`, [jackson.id]);
await pool.end();
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
