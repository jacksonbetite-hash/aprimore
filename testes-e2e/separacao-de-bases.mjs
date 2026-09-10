/**
 * Verificação de ponta a ponta — quem entra onde (§5.10 e §5.11).
 *
 * A mesma rota /entrar responde em três endereços, e cada um autentica
 * contra UMA base: a da plataforma (portal 0), a do professor, a da
 * empresa. Este roteiro cruza as seis contas de demonstração com os três
 * endereços e confere, um a um, quem entra, quem é recusado e onde cada
 * um cai. É a tabela que o discovery descreve em prosa, executada.
 *
 * Contas (scripts/demo/LEIA-ME.md):
 *   admin      — `SENHA_ADMIN` se houver; senão uma conta temporária
 *                criada aqui e apagada no fim
 *   professor  — otavio.lins@exemplo.com.br (portal 0)
 *   gestor     — treinamento@grupoaurora.com.br (portal 0, RH da Aurora)
 *   aluna      — camila.ferraz@exemplo.com.br (portal 0)
 *   aluna do professor — ana.prado@aluno-demo.com.br (portal otaviolins)
 *   colaboradora — tereza.souza@grupoaurora.com.br (portal aurora)
 *
 *   BASE_URL=http://localhost:3010 \
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimoreosaber \
 *   CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" \
 *   node testes-e2e/separacao-de-bases.mjs
 */
import { chromium } from 'playwright-core';
import pg from 'pg';
import { gerarHashSenha } from '../lib/auth.ts';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const porta = new URL(base).port ? `:${new URL(base).port}` : '';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});

let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };

// ---- o admin: a senha real, ou uma conta descartável ----
const ADMIN_TEMP = 'admin-e2e-separacao@exemplo.com';
let admin;
if (process.env.SENHA_ADMIN) {
  admin = { email: 'admin@aprimoreosaber.com.br', senha: process.env.SENHA_ADMIN };
} else {
  const senha = 'separacao-de-bases-2026';
  await pool.query('DELETE FROM usuario WHERE email = $1', [ADMIN_TEMP]);
  // A senha mora na conta (db/045); o papel, no perfil da plataforma.
  const { rows: [conta] } = await pool.query(
    `INSERT INTO conta (email, nome, senha_hash) VALUES ($1, 'Admin e2e', $2) RETURNING id`,
    [ADMIN_TEMP, await gerarHashSenha(senha)]);
  await pool.query(
    `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
     VALUES (0, $1, 'Admin e2e', $2, 'admin')`, [conta.id, ADMIN_TEMP]);
  admin = { email: ADMIN_TEMP, senha };
}

const CONTAS = {
  admin,
  professor:    { email: 'otavio.lins@exemplo.com.br',        senha: 'aulas-de-penal-2026' },
  gestor:       { email: 'treinamento@grupoaurora.com.br',    senha: 'universidade-aurora-2026' },
  aluna:        { email: 'camila.ferraz@exemplo.com.br',      senha: 'estudar-todo-dia-2026' },
  alunaPortal:  { email: 'ana.prado@aluno-demo.com.br',       senha: 'aluno-demo-2026' },
  colaboradora: { email: 'tereza.souza@grupoaurora.com.br',   senha: 'minha-senha-aurora' },
};

const ENDERECOS = {
  plataforma: `http://localhost${porta}`,
  professor:  `http://otaviolins.localhost${porta}`,
  empresa:    `http://aurora.localhost${porta}`,
};

/**
 * Tenta entrar e devolve o caminho em que a pessoa parou — ou 'recusado'
 * quando a tela devolveu erro. `aba` clica num papel antes de enviar.
 */
async function tentar(endereco, conta, aba) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(`${endereco}/entrar`, { waitUntil: 'networkidle' });
  if (aba) await p.click(`#aba-${aba}`);
  await p.fill('input[name=email]', conta.email);
  await p.fill('input[name=senha]', conta.senha);
  await p.click('form.formulario button[type=submit]');
  await Promise.race([
    p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 20000 }),
    p.waitForSelector('.alerta-erro', { timeout: 20000 }),
  ]).catch(() => {});
  const resultado = p.url().includes('/entrar') ? 'recusado' : new URL(p.url()).pathname;
  const cookies = await ctx.cookies();
  await ctx.close();
  return { resultado, sessao: cookies.find((c) => c.name === 'ad_sessao')?.value };
}

// ---------------------------------------------------------------- 1
// A tabela inteira: quem cada endereço aceita, e para onde manda.
//
// Desde db/045 a CREDENCIAL é uma só (a senha vale em todo portal) e o
// PERFIL continua por portal. Na plataforma e no portal de um professor,
// quem tem a senha certa e ainda não tem perfil ali ganha um perfil de
// aluno na hora e cai em /painel?bemvindo=1. No portal de uma EMPRESA a
// porta é fechada: só entra quem tem perfil lá, ou quem tem e-mail do
// domínio autorizado (o gestor da Aurora tem, e vira colaborador dele
// mesmo — é a regra do autocadastro por domínio, §5.11).
console.log('\n— quem entra onde —');
const ESPERADO = {
  plataforma: { admin: '/admin', professor: '/professor', gestor: '/empresa', aluna: '/painel',
                alunaPortal: '/painel', colaboradora: '/painel' },
  professor:  { admin: '/painel', professor: '/painel', gestor: '/painel', aluna: '/painel',
                alunaPortal: '/painel', colaboradora: '/painel' },
  empresa:    { admin: 'recusado', professor: 'recusado', gestor: '/painel', aluna: 'recusado',
                alunaPortal: 'recusado', colaboradora: '/painel' },
};
// O perfil que nasce na primeira entrada precisa ser apagado no fim, senão
// o roteiro seguinte encontra a pessoa "já cadastrada" no portal.
const perfisNovos = [];
const sessoes = {};
for (const [lugar, endereco] of Object.entries(ENDERECOS)) {
  for (const [quem, conta] of Object.entries(CONTAS)) {
    const { rows: antes } = await pool.query(
      `SELECT u.id FROM usuario u JOIN conta c ON c.id = u.conta_id
        WHERE lower(c.email) = lower($1)`, [conta.email]);
    const { resultado, sessao } = await tentar(endereco, conta);
    if (sessao) sessoes[`${quem}@${lugar}`] = sessao;
    const esperado = ESPERADO[lugar][quem];
    check(resultado.replace(/\?.*$/, '') === esperado,
      `${lugar.padEnd(10)} ${quem.padEnd(12)} → ${resultado.padEnd(18)} (esperado ${esperado})`);
    const { rows: depois } = await pool.query(
      `SELECT u.id FROM usuario u JOIN conta c ON c.id = u.conta_id
        WHERE lower(c.email) = lower($1)`, [conta.email]);
    for (const r of depois) if (!antes.some((a) => a.id === r.id)) perfisNovos.push(r.id);
  }
}
check(perfisNovos.length > 0, `${perfisNovos.length} perfil(is) nasceram na primeira entrada (credencial global)`);

// ---------------------------------------------------------------- 2
// O cookie não atravessa portal: a sessão da aluna do professor,
// transplantada para a plataforma, não abre nada (lib/auth.ts,
// usuarioPorToken confere o portal_id).
console.log('\n— o cookie não atravessa portal —');
{
  const ctx = await b.newContext();
  await ctx.addCookies([{
    name: 'ad_sessao', value: sessoes['alunaPortal@professor'],
    domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax',
  }]);
  const p = await ctx.newPage();
  await p.goto(`${ENDERECOS.plataforma}/painel`, { waitUntil: 'load' });
  check(p.url().includes('/entrar'),
    'sessão aberta no portal do professor não vale na plataforma');
  await ctx.close();
}
{
  const ctx = await b.newContext();
  await ctx.addCookies([{
    name: 'ad_sessao', value: sessoes['aluna@plataforma'],
    domain: 'aurora.localhost', path: '/', httpOnly: true, sameSite: 'Lax',
  }]);
  const p = await ctx.newPage();
  await p.goto(`${ENDERECOS.empresa}/painel`, { waitUntil: 'load' });
  check(p.url().includes('/entrar'),
    'sessão da plataforma não abre o portal da empresa');
  await ctx.close();
}

// ---------------------------------------------------------------- 3
// A aba escolhida só rebaixa, nunca promove — e só quando clicada.
console.log('\n— o que a aba faz com cada papel —');
check((await tentar(ENDERECOS.plataforma, CONTAS.admin, 'professor')).resultado === '/admin',
  'admin clicando "sou professor" continua indo para /admin (a aba não promove nem muda o papel)');
check((await tentar(ENDERECOS.plataforma, CONTAS.admin, 'aluno')).resultado === '/painel',
  'admin clicando "sou aluno" vai estudar em /painel');
check((await tentar(ENDERECOS.plataforma, CONTAS.gestor, 'professor')).resultado === '/empresa',
  'gestor clicando "sou professor" continua em /empresa (papel decide)');
check((await tentar(ENDERECOS.plataforma, CONTAS.gestor, 'aluno')).resultado === '/painel',
  'gestor clicando "sou aluno" cai em /painel');
check((await tentar(ENDERECOS.plataforma, CONTAS.aluna, 'professor')).resultado === '/painel',
  'aluna clicando "sou professor" NÃO ganha /professor — cai no painel dela');

// ---------------------------------------------------------------- 4
// Sessão feita pela aba do aluno não vira privilégio: o admin que
// escolheu estudar continua admin quando abre /admin à mão.
{
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(`${ENDERECOS.plataforma}/entrar`, { waitUntil: 'networkidle' });
  await p.click('#aba-aluno');
  await p.fill('input[name=email]', CONTAS.admin.email);
  await p.fill('input[name=senha]', CONTAS.admin.senha);
  await p.click('form.formulario button[type=submit]');
  await p.waitForURL('**/painel*', { timeout: 20000 });
  await p.goto(`${ENDERECOS.plataforma}/admin`, { waitUntil: 'load' });
  check(p.url().endsWith('/admin'),
    'o admin que entrou pela aba do aluno ainda abre /admin — a aba não tira papel, só muda a porta');
  await ctx.close();
}

await b.close();
if (perfisNovos.length) await pool.query('DELETE FROM usuario WHERE id = ANY($1::bigint[])', [perfisNovos]);
if (!process.env.SENHA_ADMIN) await pool.query('DELETE FROM usuario WHERE email = $1', [ADMIN_TEMP]);
await pool.end();
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
