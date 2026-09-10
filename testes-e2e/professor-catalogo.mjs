/**
 * Verificação de ponta a ponta — o professor SEM portal (etapa 5 do
 * plano de perfis, db/046).
 *
 * O caminho inteiro no navegador: cadastro em /para-professores/catalogo
 * → painel em modo catálogo → curso, assunto, aula e questão → aula
 * publicada → "enviar para revisão" → o admin publica em /admin/cursos →
 * o curso aparece no catálogo público assinado pelo professor → a ficha
 * do professor na retaguarda mostra o contrato de 40%.
 *
 * Cria uma conta de admin temporária direto no banco e apaga tudo no fim.
 *
 *   BASE_URL=http://localhost:3010 \
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimoreosaber \
 *   CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" \
 *   node testes-e2e/professor-catalogo.mjs
 */
import { chromium } from 'playwright-core';
import pg from 'pg';
import { gerarHashSenha } from '../lib/auth.ts';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});

let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };
const caminho = (p) => new URL(p.url()).pathname + new URL(p.url()).search;

const PREFIXO = 'e2e-catalogo-';
const PROF = { email: `${PREFIXO}prof@exemplo.com`, senha: 'professor-catalogo-2026', nome: 'Profa. E2E Catálogo' };
const ADMIN = { email: `${PREFIXO}admin@exemplo.com`, senha: 'admin-catalogo-2026' };
const CURSO = 'Curso E2E do Catálogo';

async function limpar() {
  await pool.query(`DELETE FROM pedido WHERE professor_id IN (SELECT id FROM usuario WHERE email LIKE $1)`, [`${PREFIXO}%`]);
  await pool.query(`DELETE FROM usuario WHERE email LIKE $1`, [`${PREFIXO}%`]);
  await pool.query(`DELETE FROM materia WHERE portal_id = 0 AND nome = $1`, [CURSO]);
}
await limpar();
{
  const { rows: [conta] } = await pool.query(
    `INSERT INTO conta (email, nome, senha_hash) VALUES ($1, 'Admin e2e', $2) RETURNING id`,
    [ADMIN.email, await gerarHashSenha(ADMIN.senha)]);
  await pool.query(
    `INSERT INTO usuario (portal_id, conta_id, nome, email, papel) VALUES (0, $1, 'Admin e2e', $2, 'admin')`,
    [conta.id, ADMIN.email]);
}

async function entrar(email, senha) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto(`${base}/entrar`, { waitUntil: 'networkidle' });
  await p.fill('input[name=email]', email);
  await p.fill('input[name=senha]', senha);
  await p.click('form.formulario button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 20000 }).catch(() => {});
  return [ctx, p];
}

try {
  // ------------------------------------------------------------ cadastro
  console.log('\n— cadastro no catálogo —');
  let ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  let p = await ctx.newPage();
  await p.goto(`${base}/para-professores`, { waitUntil: 'networkidle' });
  check(await p.locator('a[href="/para-professores/catalogo"]').isVisible(), 'a página do professor oferece a porta do catálogo');
  await p.click('a[href="/para-professores/catalogo"]');
  await p.waitForURL('**/para-professores/catalogo', { timeout: 20000 });
  await p.fill('input[name=nome]', PROF.nome);
  await p.fill('input[name=email]', PROF.email);
  await p.fill('input[name=senha]', PROF.senha);
  await p.fill('input[name=documento]', '529.982.247-25');
  await p.check('input[name=aceite]');
  await p.click('form#cadastro button[type=submit]');
  await p.waitForURL('**/professor*', { timeout: 20000 });
  check(caminho(p).startsWith('/professor'), `cadastrado, cai no painel (${caminho(p)})`);
  check(await p.locator('aside.lateral', { hasText: 'Professor do catálogo' }).isVisible(), 'o painel está em modo catálogo');
  check(await p.locator('h2', { hasText: 'Próximos passos' }).isVisible(), 'com a checklist do catálogo');
  check((await p.locator('aside.lateral a', { hasText: 'Minha página' }).count()) === 0, 'sem "Minha página" — não há portal');

  // ------------------------------------------------------------ curso
  console.log('\n— curso, assunto, aula, questão —');
  await p.goto(`${base}/professor/cursos`, { waitUntil: 'networkidle' });
  const areaId = (await pool.query('SELECT id FROM area WHERE portal_id = 0 ORDER BY ordem LIMIT 1')).rows[0].id;
  await p.selectOption('form.form-editor select[name=areaId]', String(areaId));
  await p.fill('form.form-editor input[name=nome]', CURSO);
  await p.fill('form.form-editor textarea[name=ementa]', 'Uma ementa longa o bastante para o formulário aceitar: o que o aluno aprende e para que serve na prática.');
  check((await p.locator('form.form-editor input[name=destaque]').count()) === 0, 'o formulário do catálogo não oferece destaque');
  check((await p.locator('form.form-editor select[name=status] option[value=publicado]').count()) === 0, 'nem a opção de publicar');
  await p.click('form.form-editor button[type=submit]');
  await p.waitForURL(/\/professor\/cursos\/\d+/, { timeout: 20000 });
  const cursoUrl = p.url();
  check(/criada=1/.test(cursoUrl), `curso criado (${caminho(p)})`);
  const { rows: [m] } = await pool.query('SELECT id, professor_id, professor, status FROM materia WHERE nome = $1', [CURSO]);
  check(m && m.professor_id !== null && m.professor === PROF.nome, 'o curso nasce assinado pelo professor');
  check(await p.locator('button', { hasText: 'Enviar para revisão' }).isDisabled(), 'sem aula publicada, não dá para enviar à revisão');

  // assunto
  await p.fill('form.form-linha input[name=nome]', 'Assunto único');
  await p.click('form.form-linha button[type=submit]');
  await p.waitForSelector('form.form-linha .alerta-ok', { timeout: 15000 });
  await p.reload({ waitUntil: 'networkidle' });
  check(await p.locator('table', { hasText: 'Assunto único' }).first().isVisible(), 'assunto criado');

  // aula
  await p.selectOption('select[name=assuntoId]', { index: 1 });   // o select nasce vazio e é obrigatório
  await p.fill('input[name=titulo]', 'Aula 1 do catálogo');
  await p.fill('textarea[name=resumo]', 'Resumo da aula 1, que serve ao SEO e ao aluno.');
  await p.fill('input[name=minutos]', '12');
  await p.click('form.form-editor:has(input[name=titulo]) button[type=submit]');
  await Promise.race([
    p.waitForURL(/\/professor\/cursos\/aula\/\d+/, { timeout: 20000 }),
    p.waitForSelector('form.form-editor:has(input[name=titulo]) .alerta-erro', { timeout: 20000 }),
  ]).catch(() => {});
  const erroAula = await p.locator('form.form-editor:has(input[name=titulo]) .alerta-erro').textContent().catch(() => null);
  if (erroAula) console.log('  erro ao criar a aula:', erroAula);
  check(/criada=1/.test(p.url()), `aula criada (${caminho(p)})`);

  // questão
  await p.click('button:has-text("Adicionar questão")');
  await p.fill('textarea[name=enunciado]', 'Qual alternativa está correta?');
  await p.fill('input[name=texto0]', 'A correta');
  await p.fill('textarea[name=comentario0]', 'Certa: é a correta.');
  await p.fill('input[name=texto1]', 'A errada');
  await p.fill('textarea[name=comentario1]', 'Errada: é a errada.');
  await p.check('input[name=correta][value="0"]');
  await p.click('button:has-text("Criar questão")');
  await p.waitForSelector('.alerta-ok', { timeout: 15000 });
  check(true, 'questão criada');

  // publicar a aula (ela o professor publica) e enviar o curso para revisão
  await p.click('.cabecalho-tela button:has-text("Publicar")');
  await p.waitForTimeout(1500);
  await p.reload({ waitUntil: 'networkidle' });
  check(await p.locator('.cabecalho-tela button', { hasText: 'Despublicar' }).isVisible(), 'a aula foi publicada pelo professor');
  await p.goto(cursoUrl.replace(/\?.*$/, ''), { waitUntil: 'networkidle' });
  await p.click('button:has-text("Enviar para revisão")');
  await p.waitForTimeout(1500);
  await p.reload({ waitUntil: 'networkidle' });
  check(await p.locator('.alerta', { hasText: 'Em revisão pela plataforma' }).isVisible(), 'o curso foi para revisão');
  const { rows: [m2] } = await pool.query('SELECT status FROM materia WHERE id = $1', [m.id]);
  check(m2.status === 'em_revisao', 'no banco: em_revisao');

  // não aparece no catálogo antes de publicado
  await p.goto(`${base}/catalogo`, { waitUntil: 'networkidle' });
  check(!(await p.locator('body').textContent()).includes(CURSO), 'em revisão, o curso não está no catálogo');
  await ctx.close();

  // ------------------------------------------------------------ revisão pelo admin
  console.log('\n— revisão e publicação pela plataforma —');
  [ctx, p] = await entrar(ADMIN.email, ADMIN.senha);
  await p.goto(`${base}/admin/cursos?q=${encodeURIComponent('Curso E2E')}`, { waitUntil: 'networkidle' });
  const linha = p.locator('tr', { hasText: CURSO });
  check(await linha.isVisible(), 'o admin vê o curso em revisão em Cursos e aulas');
  check((await linha.textContent()).includes(PROF.nome), 'assinado pelo professor');
  await linha.locator('button[aria-label="Publicar"]').click();
  await p.waitForTimeout(1500);
  const { rows: [m3] } = await pool.query('SELECT status FROM materia WHERE id = $1', [m.id]);
  check(m3.status === 'publicado', 'o admin publicou');

  // a ficha do professor mostra o contrato
  const { rows: [prof] } = await pool.query('SELECT id FROM usuario WHERE email = $1', [PROF.email]);
  await p.goto(`${base}/admin/usuarios/${prof.id}`, { waitUntil: 'networkidle' });
  check(await p.locator('h2', { hasText: 'Professor do catálogo' }).isVisible(), 'a ficha tem o bloco do professor do catálogo');
  check((await p.locator('table', { hasText: 'Comissão' }).first().textContent()).includes('40%'), 'com o contrato de 40%');
  await ctx.close();

  // ------------------------------------------------------------ catálogo público
  console.log('\n— catálogo público —');
  ctx = await b.newContext();
  p = await ctx.newPage();
  await p.goto(`${base}/catalogo`, { waitUntil: 'networkidle' });
  const corpo = await p.locator('body').textContent();
  check(corpo.includes(CURSO), 'publicado, o curso aparece no catálogo');
  check(corpo.includes(PROF.nome), 'assinado pelo professor');
  await ctx.close();

  // ------------------------------------------------------------ o professor vê o financeiro
  console.log('\n— financeiro do professor —');
  [ctx, p] = await entrar(PROF.email, PROF.senha);
  await p.goto(`${base}/professor/financeiro`, { waitUntil: 'networkidle' });
  check(await p.locator('h2', { hasText: 'Chave Pix do repasse' }).isVisible(), 'o financeiro do catálogo pede a chave Pix');
  await p.fill('input[name=chave]', 'profa@pix.exemplo');
  await p.click('form.form-linha button[type=submit]');
  await p.waitForSelector('form.form-linha .alerta-ok', { timeout: 15000 });
  const { rows: [c] } = await pool.query('SELECT chave_pix FROM contrato_professor WHERE usuario_id = $1 AND vigente_ate IS NULL', [prof.id]);
  check(c.chave_pix === 'profa@pix.exemplo', 'a chave Pix foi gravada no contrato');
  await p.goto(`${base}/professor/site`, { waitUntil: 'networkidle' });
  check(caminho(p) === '/professor', 'telas do portal redirecionam o professor do catálogo');
  await ctx.close();
} finally {
  await limpar();
  await pool.end();
  await b.close();
}

console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
