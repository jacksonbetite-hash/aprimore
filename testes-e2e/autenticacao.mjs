/**
 * Verificação de ponta a ponta — autenticação e controle de acesso.
 *
 * Roda contra a aplicação de pé (docker compose up -d), com Playwright.
 * Não substitui os testes de unidade: cobre o que só aparece no navegador
 * — redirecionamentos, cookies e propagação entre telas.
 *
 *   node testes-e2e/autenticacao.mjs
 */
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  // CHROMIUM define o navegador; sem ela, usa o do PATH.
  executablePath: process.env.CHROMIUM || undefined,
});
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const ok = (c, m) => console.log((c ? '✔' : '✘') + ' ' + m);
let falhas = 0;
const check = (c, m) => { if (!c) falhas++; ok(c, m); };

// ---------- visitante ----------
let ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
let p = await ctx.newPage();

await p.goto(base + '/painel', { waitUntil: 'load' });
check(p.url().includes('/entrar'), 'visitante em /painel é mandado para /entrar');

await p.goto(base + '/admin', { waitUntil: 'load' });
check(p.url().includes('/entrar'), 'visitante em /admin é mandado para /entrar');

await p.goto(base + '/', { waitUntil: 'load' });
check(await p.locator('a[href="/cadastrar"]').first().isVisible(), 'cabeçalho oferece criar conta');

// aula licenciada continua bloqueada para visitante
await p.goto(base + '/aula/direitos-fundamentais-na-pratica', { waitUntil: 'load' });
check(await p.getByText('faz parte de um curso licenciado').first().isVisible(),
  'visitante vê a oferta na aula licenciada');
// mas a amostra grátis abre
// O exercício mora na aba "Exercício"; a âncora a abre.
await p.goto(base + '/aula/o-que-e-uma-constituicao#exercicio', { waitUntil: 'load' });
await p.waitForLoadState('networkidle');
check(await p.locator('#exercicio .alternativa').first().isVisible(), 'amostra gratuita abre para visitante');

// ---------- login errado ----------
await p.goto(base + '/entrar', { waitUntil: 'load' });
await p.fill('input[name=email]', 'ana@exemplo.com');
await p.fill('input[name=senha]', 'senha-errada');
await p.click('form.formulario button[type=submit]');
await p.waitForTimeout(1200);
check(await p.locator('.alerta-erro').isVisible(), 'senha errada mostra erro');
const msg = await p.locator('.alerta-erro').textContent();
check(!/não existe|não encontrad/i.test(msg ?? ''), 'a mensagem não revela se o e-mail existe');

// e-mail inexistente devolve a MESMA mensagem
await p.fill('input[name=email]', 'ninguem@exemplo.com');
await p.fill('input[name=senha]', 'seja-la-o-que-for');
await p.click('form.formulario button[type=submit]');
await p.waitForTimeout(1200);
const msg2 = await p.locator('.alerta-erro').textContent();
check(msg === msg2, 'e-mail inexistente devolve mensagem idêntica (não enumera contas)');

// ---------- login do aluno ----------
await p.fill('input[name=email]', 'ana@exemplo.com');
await p.fill('input[name=senha]', 'constitucional88');
await p.click('form.formulario button[type=submit]');
await p.waitForURL('**/painel*', { timeout: 15000 });
check(p.url().includes('/painel'), 'login correto leva ao painel');
check(await p.getByText('Olá,').first().isVisible(), 'painel mostra o aluno logado');

const cookies = await ctx.cookies();
const sessao = cookies.find(c => c.name === 'ad_sessao');
check(!!sessao, 'cookie de sessão foi criado');
check(sessao?.httpOnly === true, 'cookie é httpOnly (JS da página não lê)');
check(sessao?.sameSite === 'Lax', 'cookie é SameSite=Lax (barra CSRF)');

// aluno NÃO acessa admin
await p.goto(base + '/admin', { waitUntil: 'load' });
check(!p.url().includes('/admin'), 'aluno comum é barrado em /admin');
check(await p.locator('.alerta-erro').isVisible(), 'e recebe explicação de que não tem acesso');
check(!(await p.locator('a[href="/admin"]').first().isVisible().catch(() => false)),
  'aluno comum não vê o link de admin');

await p.goto(base + '/painel', { waitUntil: 'load' });
await p.screenshot({ path: '/tmp/ad-painel-logado.png', fullPage: true });

// ---------- sair ----------
await p.click('.item-lateral.saida');
await p.waitForTimeout(1200);
await p.goto(base + '/painel', { waitUntil: 'load' });
check(p.url().includes('/entrar'), 'depois de sair, o painel volta a exigir login');
await ctx.close();

// ---------- cadastro novo ----------
ctx = await b.newContext(); p = await ctx.newPage();
const novoEmail = `teste${Date.now()}@exemplo.com`;
await p.goto(base + '/cadastrar', { waitUntil: 'load' });
await p.fill('input[name=nome]', 'Rafael Teste');
await p.fill('input[name=email]', novoEmail);
// Contorna a validação nativa do navegador para provar que o SERVIDOR
// também recusa — validação de cliente é conveniência, não controle.
await p.evaluate(() => {
  document.querySelector('input[name=senha]')?.removeAttribute('minlength');
  document.querySelector('form')?.setAttribute('novalidate', '');
});
await p.fill('input[name=senha]', '1234567');
await p.click('form.formulario button[type=submit]');
await p.waitForTimeout(1500);
check(await p.locator('.alerta-erro').isVisible(),
  'senha curta é recusada pelo servidor mesmo sem validação do cliente');
check(p.url().includes('/cadastrar'), 'e a conta não é criada');

// recarrega para isolar do estado do envio anterior
await p.goto(base + '/cadastrar', { waitUntil: 'load' });
await p.fill('input[name=nome]', 'Rafael Teste');
await p.fill('input[name=email]', novoEmail);
await p.fill('input[name=senha]', 'constitucional-2026');
await p.click('form.formulario button[type=submit]');
await p.waitForURL('**/painel*', { timeout: 20000 });
check(p.url().includes('/painel'), 'cadastro válido entra direto no painel');
check(await p.getByText('Rafael').first().isVisible(), 'painel saúda o novo aluno');
check(await p.getByText('não tem curso liberado').first().isVisible().catch(() => false)
   || await p.getByText('Você ainda não').first().isVisible().catch(() => false),
  'aluno novo vê estado vazio de progresso');

// e-mail repetido
await ctx.close(); ctx = await b.newContext(); p = await ctx.newPage();
await p.goto(base + '/cadastrar', { waitUntil: 'load' });
await p.fill('input[name=nome]', 'Outro');
await p.fill('input[name=email]', novoEmail);
await p.fill('input[name=senha]', 'outra-senha-boa');
await p.click('form.formulario button[type=submit]');
await p.waitForTimeout(1200);
check(await p.locator('.alerta-erro').isVisible(), 'e-mail já cadastrado é recusado');
await ctx.close();

await b.close();
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
