/**
 * Verificação de ponta a ponta — a tela de acesso (/entrar), no layout de
 * 09/09/2026.
 *
 * O que só aparece no navegador, e por isso está aqui e não em teste de
 * unidade: o seletor de papel, o olho da senha, o cookie que muda de
 * validade conforme "continuar conectado", e — o principal — as TRÊS
 * portas diferentes que a mesma rota serve, conforme o endereço:
 *
 *   localhost              plataforma: aluno e professor entram aqui
 *   otaviolins.localhost   portal do professor: só os alunos DELE; a
 *                          conta do professor fica na plataforma
 *   aurora.localhost       portal de empresa: uma porta só, sem cadastro
 *
 * Depende do conteúdo de demonstração (scripts/demo/LEIA-ME.md), com o
 * quarto roteiro rodado para o portal `otaviolins`:
 *
 *   BASE_URL=http://localhost:3010 \
 *   CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" \
 *   node testes-e2e/tela-de-acesso.mjs
 */
import { chromium } from 'playwright-core';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const porta = new URL(base).port ? `:${new URL(base).port}` : '';
const PORTAL = `http://otaviolins.localhost${porta}`;
const EMPRESA = `http://aurora.localhost${porta}`;

let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };

/** Contexto limpo por cenário: cookie de um portal não vale no outro. */
async function novaAba() {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  return [ctx, await ctx.newPage()];
}

const entrar = async (p, email, senha) => {
  await p.fill('input[name=email]', email);
  await p.fill('input[name=senha]', senha);
  await p.click('form.formulario button[type=submit]');
};

// ---------------------------------------------------------------- 1
console.log('\n— plataforma —');
let [ctx, p] = await novaAba();
await p.goto(base + '/entrar', { waitUntil: 'load' });

check(await p.locator('.migalhas [aria-current]').textContent() === 'Meu acesso',
  'a trilha de migalhas diz onde a pessoa está');
check(await p.locator('.auth-selo svg').isVisible(), 'o selo do cabeçalho desenha o ícone');
check(await p.locator('.seletor-papel button').count() === 3,
  'o seletor oferece as três portas: aluno, professor e empresa');
check(await p.locator('#aba-empresa').isVisible(), 'a aba da empresa existe no site principal');
check(await p.locator('#aba-aluno').getAttribute('aria-selected') === 'true',
  'a aba do aluno abre selecionada');
check(/Minha jornada/.test(await p.locator('.pilula-destino').textContent()),
  'o aviso de direcionamento aponta o painel do aluno');
check(/Entrar no meu painel/.test(await p.locator('form.formulario button[type=submit]').textContent()),
  'o botão promete o painel do aluno');
check(await p.locator('.faixa-professor').isVisible(),
  'o convite "monte o seu portal" aparece no site principal');

// troca de aba
await p.click('#aba-professor');
check(await p.locator('#aba-professor').getAttribute('aria-selected') === 'true',
  'clicar na aba do professor a seleciona');
check(/painel do professor/.test(await p.locator('.pilula-destino').textContent()),
  'o direcionamento acompanha a aba');
check(/área do professor/.test(await p.locator('form.formulario button[type=submit]').textContent()),
  'o botão acompanha a aba');
check(await p.locator('.rodape-form a[href="/para-professores"]').isVisible(),
  'o rodapé do formulário passa a oferecer os planos do professor');
await p.click('#aba-aluno');
check(await p.locator('.rodape-form a[href="/cadastrar"]').isVisible(),
  'e volta a oferecer criar conta na aba do aluno');

// olho da senha
await p.fill('input[name=senha]', 'segredo');
check(await p.locator('input[name=senha]').getAttribute('type') === 'password',
  'a senha começa oculta');
await p.click('.btn-olho');
check(await p.locator('input[name=senha]').getAttribute('type') === 'text',
  'o olho revela a senha');
check(await p.locator('input[name=senha]').inputValue() === 'segredo',
  'e não perde o que já estava digitado');
await p.click('.btn-olho');
check(await p.locator('input[name=senha]').getAttribute('type') === 'password',
  'e volta a ocultar');

// senha esquecida — sem link morto: diz quem repõe o acesso
await p.click('.link-senha');
check(/suporte/i.test(await p.locator('.aviso-senha').textContent()),
  '"esqueceu a senha?" explica quem repõe o acesso, em vez de abrir um formulário que não existe');

// o defeito que a memória do projeto registra: erro não pode limpar o campo
await entrar(p, 'camila.ferraz@exemplo.com.br', 'senha-errada');
await p.waitForSelector('.alerta-erro', { timeout: 15000 });
check(await p.locator('input[name=email]').inputValue() === 'camila.ferraz@exemplo.com.br',
  'erro de senha NÃO apaga o e-mail já digitado');

// ---------------------------------------------------------------- 2
// "continuar conectado" desmarcado: cookie morre com o navegador
await p.locator('.lembrar input').uncheck();
await entrar(p, 'camila.ferraz@exemplo.com.br', 'estudar-todo-dia-2026');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(p.url().includes('/painel'), 'aluna da plataforma entra no painel dela');
let cookie = (await ctx.cookies()).find((c) => c.name === 'ad_sessao');
check(cookie?.expires === -1, 'sem "continuar conectado", o cookie é de sessão do navegador');
await ctx.close();

[ctx, p] = await novaAba();
await p.goto(base + '/entrar', { waitUntil: 'load' });
await entrar(p, 'camila.ferraz@exemplo.com.br', 'estudar-todo-dia-2026');
await p.waitForURL('**/painel*', { timeout: 20000 });
cookie = (await ctx.cookies()).find((c) => c.name === 'ad_sessao');
check(cookie?.expires > 0, 'com "continuar conectado" (padrão), o cookie ganha validade');
await ctx.close();

// ---------------------------------------------------------------- 3
// professor na plataforma: a aba escolhida decide o destino
console.log('\n— professor na plataforma —');
[ctx, p] = await novaAba();
await p.goto(base + '/entrar', { waitUntil: 'load' });
await p.click('#aba-professor');
await entrar(p, 'otavio.lins@exemplo.com.br', 'aulas-de-penal-2026');
await p.waitForURL('**/professor*', { timeout: 20000 });
check(p.url().includes('/professor'), 'a aba do professor leva ao painel do professor');
await ctx.close();

[ctx, p] = await novaAba();
await p.goto(base + '/entrar', { waitUntil: 'load' });
await p.click('#aba-aluno');
await entrar(p, 'otavio.lins@exemplo.com.br', 'aulas-de-penal-2026');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(p.url().includes('/painel') && !p.url().includes('/professor'),
  'o mesmo professor, ESCOLHENDO a aba do aluno, vai estudar em vez de operar');
await ctx.close();

// e sem tocar em aba nenhuma o papel da conta continua mandando: a aba
// do aluno vem aberta como padrão visual, não como escolha — é o que
// mantém o administrador caindo em /admin, e não em "Minha jornada".
[ctx, p] = await novaAba();
await p.goto(base + '/entrar', { waitUntil: 'load' });
await entrar(p, 'otavio.lins@exemplo.com.br', 'aulas-de-penal-2026');
await p.waitForURL('**/professor*', { timeout: 20000 });
check(p.url().includes('/professor'),
  'sem clicar em aba nenhuma, o papel gravado na conta decide o destino');
await ctx.close();

// ---------------------------------------------------------------- 4
console.log('\n— portal do professor —');
[ctx, p] = await novaAba();
await p.goto(PORTAL + '/entrar', { waitUntil: 'load' });
check(!(await p.locator('.faixa-professor').isVisible().catch(() => false)),
  'dentro do portal, o convite "monte o seu portal" some (§5.10.2)');
check(/Otávio Lins/.test(await p.locator('.auth-corpo .sub').textContent()),
  'a chamada nomeia o portal em que a pessoa está');

await p.click('#aba-professor');
check(await p.locator('.porta-de-fora').isVisible(),
  'a aba do professor mostra a porta de serviço em vez de um formulário');
check(await p.locator('.porta-de-fora + *, form.formulario').count() === 0
   || !(await p.locator('form.formulario').isVisible().catch(() => false)),
  'e não deixa nenhum campo de login que jamais autenticaria aqui');
check(await p.locator('a[href="/para-professores"]').count() === 0,
  'e a aba do professor, dentro do portal dele, não anuncia "monte o seu portal"');
const destinoProf = await p.locator('.porta-de-fora a').getAttribute('href');
check(destinoProf === `http://localhost${porta}/entrar?destino=%2Fprofessor`,
  `a porta de serviço aponta para a plataforma (${destinoProf})`);

// A credencial é uma só (db/045): a senha da plataforma ENTRA aqui, mas
// abre só um perfil de ALUNO deste portal, nascido agora — não o painel
// do professor, que continua do outro lado da porta de serviço.
await p.click('#aba-aluno');
await entrar(p, 'otavio.lins@exemplo.com.br', 'aulas-de-penal-2026');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(p.url().startsWith(PORTAL + '/painel') && p.url().includes('bemvindo=1'),
  'a senha da plataforma entra no portal como ALUNO, com o perfil nascendo na primeira entrada');
check(!p.url().includes('/professor'), 'e não abre painel de professor nenhum aqui');
await p.context().clearCookies();
await p.goto(PORTAL + '/entrar', { waitUntil: 'load' });

// e o aluno do portal entra
await entrar(p, 'ana.prado@aluno-demo.com.br', 'aluno-demo-2026');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(p.url().startsWith(PORTAL + '/painel'), 'a aluna do portal entra no painel do portal');
await ctx.close();

// o caminho completo da porta de serviço: do portal ao painel do professor
[ctx, p] = await novaAba();
await p.goto(PORTAL + '/entrar', { waitUntil: 'load' });
await p.click('#aba-professor');
await p.click('.porta-de-fora a');
await p.waitForLoadState('load');
check(p.url().startsWith(`http://localhost${porta}/entrar`),
  'a porta de serviço desemboca no login da plataforma');
await entrar(p, 'otavio.lins@exemplo.com.br', 'aulas-de-penal-2026');
await p.waitForURL('**/professor*', { timeout: 20000 });
check(p.url().includes('/professor'),
  'e o destino pedido (/professor) é respeitado depois do login');
await ctx.close();

// ---------------------------------------------------------------- 5
console.log('\n— portal de empresa —');
[ctx, p] = await novaAba();
await p.goto(EMPRESA + '/entrar', { waitUntil: 'load' });
check(await p.locator('.seletor-papel').count() === 0,
  'no portal de empresa não há papel a escolher (§5.11)');
check(!(await p.locator('.faixa-professor').isVisible().catch(() => false)),
  'nem convite ao professor');
check(!(await p.locator('.rodape-form a[href="/cadastrar"]').isVisible().catch(() => false)),
  'e nenhuma oferta de criar conta: quem libera é o RH');
await p.click('.link-senha');
check(/treinamento/i.test(await p.locator('.aviso-senha').textContent()),
  '"esqueceu a senha?" manda o colaborador ao RH, não ao nosso suporte');
await entrar(p, 'tereza.souza@grupoaurora.com.br', 'minha-senha-aurora');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(p.url().startsWith(EMPRESA + '/painel'), 'a colaboradora entra no portal da empresa');
await ctx.close();

await b.close();
// O perfil de aluno do professor no portal dele nasceu neste roteiro; some com ele.
if (process.env.DATABASE_URL) {
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(
    `DELETE FROM usuario u USING portal p
      WHERE p.id = u.portal_id AND p.mascara = 'otaviolins'
        AND lower(u.email) = 'otavio.lins@exemplo.com.br' AND u.papel = 'aluno'`);
  await pool.end();
}
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
