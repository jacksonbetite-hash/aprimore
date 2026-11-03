/**
 * Verificação de ponta a ponta — perfis de operação e o cadastro de
 * usuários (docs/plano-perfis-e-acessos.md, etapas 1 e 2).
 *
 * O que só aparece no navegador: o menu de /admin encolhendo conforme o
 * papel, a tela que redireciona quem não tem a permissão, o formulário
 * que some para quem só vê, e o caminho inteiro admin → cria conta →
 * senha provisória → a pessoa entra com ela.
 *
 * Cria três contas da equipe (admin, financeiro, suporte) direto no banco
 * e as apaga no fim, junto com o que o roteiro cadastrou — não depende de
 * SENHA_ADMIN.
 *
 *   BASE_URL=http://localhost:3010 \
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimore \
 *   CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" \
 *   node testes-e2e/perfis-e-usuarios.mjs
 */
import { chromium } from 'playwright-core';
import pg from 'pg';
import { gerarHashSenha } from '../lib/auth.ts';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimore',
});

let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };

const PREFIXO = 'e2e-perfis-';
const SENHA = 'perfis-e-usuarios-2026';
const CONTAS = {
  admin:      { email: `${PREFIXO}admin@exemplo.com`,      papel: 'admin' },
  financeiro: { email: `${PREFIXO}financeiro@exemplo.com`, papel: 'financeiro' },
  suporte:    { email: `${PREFIXO}suporte@exemplo.com`,    papel: 'suporte' },
};
const ALUNO_NOVO = `${PREFIXO}aluno-criado@exemplo.com`;

async function limpar() {
  await pool.query('DELETE FROM usuario WHERE email LIKE $1', [`${PREFIXO}%`]);
}
await limpar();
const hash = await gerarHashSenha(SENHA);
for (const c of Object.values(CONTAS)) {
  // A senha mora na conta (db/045); o papel, no perfil da plataforma.
  const { rows: [conta] } = await pool.query(
    `INSERT INTO conta (email, nome, senha_hash) VALUES ($1, $2, $3) RETURNING id`,
    [c.email, `Equipe ${c.papel}`, hash]);
  await pool.query(
    `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
     VALUES (0, $1, $2, $3, $4::papel_usuario)`,
    [conta.id, `Equipe ${c.papel}`, c.email, c.papel]);
}

async function entrar(email, senha = SENHA) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto(`${base}/entrar`, { waitUntil: 'networkidle' });
  await p.fill('input[name=email]', email);
  await p.fill('input[name=senha]', senha);
  await p.click('form.formulario button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 20000 }).catch(() => {});
  return [ctx, p];
}
const itensDoMenu = async (p) =>
  (await p.locator('aside.lateral a').allTextContents()).map((t) => t.trim());
const caminho = (p) => new URL(p.url()).pathname + new URL(p.url()).search;

try {
  // -------------------------------------------------------------- admin
  console.log('\n— admin —');
  let [ctx, p] = await entrar(CONTAS.admin.email);
  check(caminho(p) === '/admin', `admin cai em /admin (${caminho(p)})`);
  let menu = await itensDoMenu(p);
  check(menu.includes('Usuários'), 'admin vê "Usuários" no menu');
  check(menu.includes('Cursos e aulas') && menu.includes('Financeiro'), 'admin vê conteúdo e financeiro');

  await p.goto(`${base}/admin/usuarios/novo`, { waitUntil: 'networkidle' });
  check(await p.locator('.cartao-tipo', { hasText: 'Equipe da plataforma' }).isVisible(),
    'admin vê a opção de criar equipe');
  await p.click('.cartao-tipo:has-text("Aluno ou colaborador")');
  await p.selectOption('select[name=portalId]', '0');
  await p.fill('input[name=nome]', 'Aluno Criado Pelo Admin');
  await p.fill('input[name=email]', ALUNO_NOVO);
  await p.fill('input[name=senha]', 'senha-inicial-123');
  await p.fill('input[name=cpf]', '529.982.247-25');
  await p.click('form.form-editor button[type=submit]');
  await Promise.race([
    p.waitForURL((u) => /\/admin\/usuarios\/\d+/.test(u.pathname), { timeout: 20000 }),
    p.waitForSelector('.alerta-erro', { timeout: 20000 }),
  ]).catch(() => {});
  const erroCriar = await p.locator('.alerta-erro').textContent().catch(() => null);
  check(/\/admin\/usuarios\/\d+\?criado=1/.test(caminho(p)), `cria o aluno e abre a ficha (${caminho(p)}${erroCriar ? ' — ' + erroCriar : ''})`);
  check(await p.locator('h1').textContent() === 'Aluno Criado Pelo Admin', 'a ficha tem o nome');
  check((await p.locator('input[name=cpf]').inputValue()) === '529.982.247-25', 'o CPF aparece inteiro na ficha');
  const fichaUrl = p.url();

  // senha provisória pela ficha
  await p.fill('form.form-linha input[name=senha]', 'senha-provisoria-9');
  await p.click('form.form-linha button:has-text("Definir e encerrar")');
  // O alerta 'Conta criada' do topo também é .alerta-ok: o que interessa é o do formulário.
  await p.waitForSelector('form.form-linha .alerta-ok', { timeout: 15000 });
  check((await p.locator('form.form-linha .alerta-ok').first().textContent()).includes('senha-provisoria-9'),
    'a senha provisória é mostrada uma vez');

  // duplicado é recusado sem limpar o formulário
  await p.goto(`${base}/admin/usuarios/novo`, { waitUntil: 'networkidle' });
  await p.click('.cartao-tipo:has-text("Aluno ou colaborador")');
  await p.fill('input[name=nome]', 'Repetido');
  await p.fill('input[name=email]', ALUNO_NOVO);
  await p.fill('input[name=senha]', 'senha-inicial-123');
  await p.click('form.form-editor button[type=submit]');
  await p.waitForSelector('.alerta-erro', { timeout: 15000 });
  check((await p.locator('.alerta-erro').textContent()).includes('já tem conta'), 'e-mail repetido é recusado');
  check((await p.locator('input[name=nome]').inputValue()) === 'Repetido', 'o formulário não perde o que foi digitado');

  // a lista acha pelo CPF e a busca em /admin/alunos leva à ficha
  await p.goto(`${base}/admin/usuarios?q=529982`, { waitUntil: 'networkidle' });
  check(await p.locator('table a', { hasText: 'Aluno Criado Pelo Admin' }).isVisible(), 'a lista acha pelo CPF');
  check((await p.locator('td.mono').first().textContent()).includes('***.***.247-25'), 'na lista o CPF vai mascarado');
  await ctx.close();

  // o aluno criado entra com a senha provisória
  [ctx, p] = await entrar(ALUNO_NOVO, 'senha-provisoria-9');
  check(caminho(p).startsWith('/painel'), `o aluno criado entra com a senha provisória (${caminho(p)})`);
  await ctx.close();

  // -------------------------------------------------------------- financeiro
  console.log('\n— financeiro —');
  [ctx, p] = await entrar(CONTAS.financeiro.email);
  check(caminho(p) === '/admin', `financeiro cai em /admin (${caminho(p)})`);
  menu = await itensDoMenu(p);
  check(menu.includes('Financeiro') && menu.includes('Usuários'), 'financeiro vê Financeiro e Usuários');
  check(!menu.includes('Cursos e aulas') && !menu.includes('Blog'), 'financeiro não vê conteúdo no menu');

  await p.goto(`${base}/admin/cursos`, { waitUntil: 'networkidle' });
  check(caminho(p) === '/admin?sem-permissao=1', `financeiro em /admin/cursos é devolvido (${caminho(p)})`);
  check(await p.locator('.alerta-erro').isVisible(), 'com o aviso de permissão');

  await p.goto(`${base}/admin/precos`, { waitUntil: 'networkidle' });
  check(await p.locator('h1', { hasText: 'Tabela de valores' }).isVisible(), 'financeiro lê a tabela de preços');
  check((await p.locator('form.form-linha').count()) === 0, 'sem o formulário de alterar preço');

  await p.goto(`${base}/admin/financeiro`, { waitUntil: 'networkidle' });
  check(await p.locator('h1', { hasText: 'Financeiro' }).isVisible(), 'a visão consolidada abre');
  check(await p.locator('.aviso', { hasText: 'Só leitura' }).isVisible(), 'e diz que é só leitura');
  check(await p.locator('h2', { hasText: 'Receita por fonte' }).isVisible(), 'com a receita por fonte');

  await p.goto(`${base}/admin/licencas`, { waitUntil: 'networkidle' });
  check((await p.locator('.acoes-linha').count()) === 0 && (await p.locator('form.form-linha').count()) === 0,
    'em licenças, nem cortesia nem estender/suspender');

  await p.goto(`${base}/admin/usuarios/novo`, { waitUntil: 'networkidle' });
  check(caminho(p) === '/admin?sem-permissao=1', 'financeiro não cria usuário');
  await p.goto(fichaUrl.replace(/\?.*$/, ''), { waitUntil: 'networkidle' });
  check((await p.locator('form.form-editor').count()) === 0 && await p.locator('.lista-dados').first().isVisible(),
    'na ficha, financeiro vê os dados sem formulário');
  await ctx.close();

  // -------------------------------------------------------------- suporte
  console.log('\n— suporte —');
  [ctx, p] = await entrar(CONTAS.suporte.email);
  check(caminho(p) === '/admin', `suporte cai em /admin (${caminho(p)})`);
  menu = await itensDoMenu(p);
  check(menu.includes('Usuários') && menu.includes('Licenças'), 'suporte vê Usuários e Licenças');
  check(!menu.includes('Financeiro') && !menu.includes('Preços'), 'suporte não vê o financeiro no menu');

  await p.goto(`${base}/admin/financeiro`, { waitUntil: 'networkidle' });
  check(caminho(p) === '/admin?sem-permissao=1', 'suporte em /admin/financeiro é devolvido');

  await p.goto(`${base}/admin/licencas`, { waitUntil: 'networkidle' });
  check((await p.locator('form.form-linha').count()) === 0, 'suporte não vê "conceder cortesia"');

  await p.goto(`${base}/admin/usuarios/novo`, { waitUntil: 'networkidle' });
  check(caminho(p) === '/admin/usuarios/novo', 'suporte abre o cadastro');
  check((await p.locator('.cartao-tipo', { hasText: 'Equipe da plataforma' }).count()) === 0,
    'mas não vê a opção de criar equipe');

  await p.goto(fichaUrl.replace(/\?.*$/, ''), { waitUntil: 'networkidle' });
  check(await p.locator('form.form-editor').first().isVisible(), 'suporte edita os dados na ficha');
  check(await p.locator('button', { hasText: 'Encerrar' }).first().isVisible(), 'e pode encerrar a conta');
  check((await p.locator('h3', { hasText: 'Conceder cortesia' }).count()) === 0, 'sem conceder cortesia');
  check((await p.locator('select[name=papel]').count()) === 0, 'sem trocar papel');
  await ctx.close();

  // -------------------------------------------------------------- aluno
  console.log('\n— aluno —');
  [ctx, p] = await entrar(ALUNO_NOVO, 'senha-provisoria-9');
  await p.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  check(caminho(p) === '/painel?sem-acesso=1', `aluno em /admin é devolvido ao painel (${caminho(p)})`);
  await ctx.close();
} finally {
  await limpar();
  await pool.end();
  await b.close();
}

console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
