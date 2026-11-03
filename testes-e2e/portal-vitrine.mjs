/**
 * Verificação de ponta a ponta — etapa 5 do §5.10.2: um curso de professor
 * parceiro vendido na NOSSA vitrine, do catálogo à aula liberada, sem
 * abrir a porta que a trava de isolamento fechava.
 *
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimore \
 *   BASE_URL=http://localhost:3010 node testes-e2e/portal-vitrine.mjs
 *
 * Usa o portal de demonstração `jackson`; deixa-o como encontrou.
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
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimore',
});
let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };
const sufixo = randomBytes(3).toString('hex');
const EMAIL = `e2e-vitrine-${sufixo}@exemplo.com`;

const { rows: [jackson] } = await pool.query(`SELECT id::int AS id FROM portal WHERE mascara = 'jackson'`);
const { rows: [mat] } = await pool.query(
  `SELECT id::int AS id, slug FROM materia WHERE portal_id = $1 ORDER BY id LIMIT 1`, [jackson.id]);

// Cenário: o curso do jackson vai à vitrine, com uma aula publicada.
const { rows: [ass] } = await pool.query(
  `INSERT INTO assunto (portal_id, materia_id, slug, nome) VALUES ($1, $2, 'e2e-vitrine', 'Tema') RETURNING id`,
  [jackson.id, mat.id]);
const AULA = `e2e-aula-vitrine-${sufixo}`;
await pool.query(
  `INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, status)
   VALUES ($1, $2, $3, 'Aula do parceiro', 60, 'Aula criada pelo teste de ponta a ponta da vitrine.', 'publicado')`,
  [jackson.id, ass.id, AULA]);
await pool.query(`UPDATE materia SET na_vitrine_plataforma = true WHERE id = $1`, [mat.id]);
// O portal de demonstração não tem contrato — e sem contrato não há
// comissão nem venda na vitrine. Um contrato só para este teste.
const { rows: [contrato] } = await pool.query(
  `INSERT INTO portal_contrato
     (portal_id, plano_id, licenca_mensal_centavos, percentual_base, vigente_de, aceito_em, registrado_por)
   VALUES ($1, (SELECT id FROM portal_plano ORDER BY id LIMIT 1), 14900, 10, current_date, now(), 'e2e')
   RETURNING id`, [jackson.id]);

const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
try {
  // ---------- a vitrine ----------
  await p.goto(base + '/catalogo', { waitUntil: 'load' });
  const parceiros = p.locator('#parceiros');
  check(await parceiros.isVisible(), 'o catálogo da plataforma tem a seção de parceiros');
  const card = parceiros.locator(`a[href="/parceiros/jackson/materia/${mat.slug}"]`);
  check(await card.count() === 1, 'o curso do jackson aparece com link de parceiro');

  // Isolamento continua: o curso da plataforma com o MESMO slug é outro.
  await p.goto(`${base}/materia/${mat.slug}`, { waitUntil: 'load' });
  check(!(await p.textContent('body')).includes('Professor parceiro'),
    'o /materia/<slug> da plataforma continua sendo o curso da plataforma');
  const r404 = await p.goto(`${base}/aula/${AULA}`, { waitUntil: 'load' });
  check(r404.status() === 404, 'a aula do parceiro não existe no namespace da plataforma');

  // ---------- a página do parceiro ----------
  await p.goto(`${base}/parceiros/jackson/materia/${mat.slug}`, { waitUntil: 'load' });
  let corpo = await p.textContent('body');
  check(corpo.includes('Professor parceiro'), 'a página do curso credita o parceiro');
  check(corpo.includes('Criar conta para assinar'), 'visitante é convidado a criar conta');
  check(corpo.includes('passe completo da plataforma não inclui'), 'e avisa que o passe não cobre');

  await p.goto(`${base}/parceiros/jackson/aula/${AULA}`, { waitUntil: 'load' });
  corpo = await p.textContent('body');
  check(corpo.includes('Ver o curso'), 'aula bloqueada manda para o curso do parceiro, não para /planos');

  // ---------- compra por aluno da plataforma ----------
  await p.goto(base + '/cadastrar', { waitUntil: 'load' });
  await p.fill('input[name=nome]', 'Aluna Vitrine');
  await p.fill('input[name=email]', EMAIL);
  await p.fill('input[name=senha]', 'senha-bem-longa');
  await p.click('form.formulario button[type=submit]');
  await p.waitForURL('**/painel*', { timeout: 20000 });

  await p.goto(`${base}/parceiros/jackson/materia/${mat.slug}`, { waitUntil: 'load' });
  check(await p.locator('aside form input[name=cpf]').count() === 1,
    'aluna nova ainda não tem CPF: a compra pede');
  await p.fill('aside form input[name=cpf]', '529.982.247-25');
  await p.click('aside form button[type=submit]');
  await p.waitForURL('**/checkout/**', { timeout: 20000 });
  const referencia = p.url().split('/').pop();
  check(referencia.startsWith('AD-'), `compra abriu no NOSSO checkout (${referencia})`);
  const { rows: [ped] } = await pool.query(
    `SELECT portal_id::int AS p, materia_portal_id::int AS mp, comissao_professor_pp AS c, centavos
       FROM pedido WHERE referencia = $1`, [referencia]);
  check(ped.p === 0 && ped.mp === jackson.id, 'pedido: aluno nosso, curso do parceiro');
  check(Number(ped.c) === 50, 'comissão do professor gravada (50%)');
  check(ped.centavos === 2490, 'pelo nosso preço');

  const corpoWh = JSON.stringify({ eventoId: 'e2e-vit-' + sufixo, tipo: 'pagamento.confirmado', referencia, centavos: 2490 });
  const assinatura = 'sha256=' + createHmac('sha256', segredo).update(corpoWh).digest('hex');
  const wh = await (await fetch(`${base}/api/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-assinatura': assinatura }, body: corpoWh,
  })).json();
  check(wh.processado && wh.licencaId, 'webhook emitiu a licença');

  await p.goto(`${base}/parceiros/jackson/aula/${AULA}`, { waitUntil: 'load' });
  corpo = await p.textContent('body');
  check(!corpo.includes('Ver o curso') && corpo.includes('Aula do parceiro'), 'a aula do parceiro abriu para o aluno');

  await p.goto(base + '/painel', { waitUntil: 'load' });
  check(await p.locator(`a[href="/parceiros/jackson/materia/${mat.slug}"]`).count() > 0,
    'o painel linka o curso pelo caminho do parceiro');

  // Tirar da vitrine não tira o acesso de quem comprou.
  await pool.query(`UPDATE materia SET na_vitrine_plataforma = false WHERE id = $1`, [mat.id]);
  await p.goto(`${base}/parceiros/jackson/aula/${AULA}`, { waitUntil: 'load' });
  check((await p.textContent('body')).includes('Aula do parceiro'), 'fora da vitrine, a licença comprada continua valendo');

  // Sem licença, fora da vitrine, o curso não existe para o visitante.
  const anon = await (await b.newContext()).newPage();
  const r = await anon.goto(`${base}/parceiros/jackson/materia/${mat.slug}`, { waitUntil: 'load' });
  check(r.status() === 404, 'visitante não vê curso retirado da vitrine');
  await anon.context().close();

  // ---------- apuração da comissão (§5.6.1), pelo admin ----------
  const adm = await (await b.newContext()).newPage();
  await adm.goto(base + '/entrar', { waitUntil: 'load' });
  await adm.fill('input[name=email]', 'admin@aprimoreosaber.com.br');
  await adm.fill('input[name=senha]', process.env.SENHA_ADMIN ?? '');
  await adm.click('form.formulario button[type=submit]');
  await adm.waitForURL('**/painel*', { timeout: 20000 }).catch(() => {});
  if (process.env.SENHA_ADMIN) {
    await adm.goto(`${base}/admin/portais/${jackson.id}/financeiro`, { waitUntil: 'load' });
    const mesAtual = new Date().toISOString().slice(0, 7);
    await adm.fill('#apurar input[name=mes]', mesAtual);
    await adm.click('#apurar button[type=submit]');
    await adm.waitForSelector('.alerta-ok:has-text("Competência apurada")', { timeout: 15000 });
    const { rows: [ap] } = await pool.query(
      `SELECT status, centavos_comissao AS c FROM apuracao WHERE portal_id = $1 AND competencia = $2`,
      [jackson.id, mesAtual + '-01']);
    check(ap && Number(ap.c) === 1245 && ap.status === 'ACUMULADA',
      `comissão apurada: R$ 12,45 (50% de R$ 24,90), abaixo do mínimo → acumula`);
    await pool.query(`DELETE FROM apuracao WHERE portal_id = $1`, [jackson.id]);
  } else {
    console.log('· (SENHA_ADMIN ausente: apuração pelo admin não verificada)');
  }
  await adm.context().close();

  // O portal do jackson segue inalterado.
  await p.goto(`http://jackson.localhost:${porta}/materia/${mat.slug}`, { waitUntil: 'load' });
  check(!(await p.textContent('body')).includes('Professor parceiro'),
    'no portal do professor, o curso é o curso — sem selo de parceiro');
} finally {
  await ctx.close();
  await b.close();
  await pool.query(`UPDATE materia SET na_vitrine_plataforma = false WHERE id = $1`, [mat.id]);
  await pool.query(`DELETE FROM usuario WHERE email = $1`, [EMAIL]);   // licenças e pedidos caem em cascata
  await pool.query(`DELETE FROM assunto WHERE id = $1`, [ass.id]);
  await pool.query(`DELETE FROM portal_contrato WHERE id = $1`, [contrato.id]);
  await pool.end();
}
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
