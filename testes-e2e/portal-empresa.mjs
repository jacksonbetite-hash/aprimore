/**
 * Verificação de ponta a ponta — o funil do Portal da Empresa (§5.11,
 * etapas 0 a 2): da vitrine ao painel do RH, passando pelo portal fechado.
 *
 * Roda contra a aplicação de pé (docker compose up -d), com Playwright:
 *
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimoreosaber \
 *   BASE_URL=http://localhost:3010 node testes-e2e/portal-empresa.mjs
 *
 * A parte que mais importa aqui não é o funil — é o BLOQUEIO. Um bloco
 * inteiro no fim varre, anonimamente, toda rota pública no endereço da
 * empresa e exige que nenhuma entregue nada. É a verificação que o §5.11
 * pede: a guarda é fácil de escrever e fácil de esquecer numa rota nova,
 * e esquecer significa treinamento interno de um cliente exposto na rua.
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

/** O símbolo do real, montado — literal, ele vira padrão de substituição. */
const REAL = 'R' + '$';
const sufixo = randomBytes(3).toString('hex');
const MASCARA = `e2e-rh-${sufixo}`;
const EMAIL = `e2e-rh-${sufixo}@exemplo.com`;
const SENHA = 'senha-bem-longa';

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

// ---------- a vitrine oferece a contratação, não só a proposta ----------
await p.goto(base + '/empresas', { waitUntil: 'load' });
check(await p.locator('a[href="/empresas/contratar"]').first().isVisible(),
  'a vitrine leva à contratação em autosserviço');
const textoPlanos = await p.locator('body').innerText();
check(textoPlanos.includes('380') && textoPlanos.includes('890'),
  'os preços vêm do banco, não do código');

// ---------- contratação ----------
await p.goto(base + '/empresas/contratar', { waitUntil: 'load' });
check(await p.locator('input[name=planoId]').first().isVisible(),
  'a tela pede o plano: o teto de pessoas é o que a empresa compra');
check(await p.locator('input[name=renda]').count() === 0,
  'não pede renda nem endereço: a empresa paga, não recebe');

await p.fill('input[name=nome]', 'RH de Ponta a Ponta');
await p.fill('input[name=email]', EMAIL);
await p.fill('input[name=senha]', SENHA);
await p.fill('input[name=cnpj]', '11.222.333/0001-81');
await p.fill('input[name=nomeExibicao]', 'Universidade Acme');
await p.fill('input[name=mascara]', MASCARA);
check((await p.locator('#contratar').innerText()).includes(MASCARA),
  'o endereço aparece enquanto se digita');
await p.check('input[name=aceite]');
await p.click('button[type=submit]');
await p.waitForURL(/\/empresas\/pagamento\//, { timeout: 20000 });
const referencia = p.url().split('/').pop();
check(referencia.startsWith('PF-'), `saiu logado na tela de pagamento (${referencia})`);

// ---------- o portal não existe antes de pagar ----------
const antes = await pool.query('SELECT status, tipo FROM portal WHERE mascara = $1', [MASCARA]);
check(antes.rows[0]?.status === 'RASCUNHO' && antes.rows[0]?.tipo === 'EMPRESA',
  'o portal nasce EMPRESA e em rascunho');

const pa = await (await b.newContext()).newPage();
await pa.goto(`http://${MASCARA}.localhost:${porta}/`, { waitUntil: 'load' });
check(!(await pa.locator('body').innerText()).includes('Universidade Acme'),
  'antes de pagar, o endereço não é da empresa: cai na plataforma');

// ---------- pagou, está no ar ----------
const rw = await webhook({
  eventoId: `e2e-empresa-${sufixo}`, tipo: 'pagamento.confirmado',
  referencia, centavos: 38000,
});
check(rw.processado && rw.portalAtivado, 'o webhook ativou o portal');
check(rw.subconta === undefined,
  'NÃO abriu subconta no gateway: empresa paga, não recebe');

const depois = await pool.query(
  'SELECT status, subconta_situacao FROM portal WHERE mascara = $1', [MASCARA]);
check(depois.rows[0].status === 'ATIVO' && depois.rows[0].subconta_situacao === 'PENDENTE',
  'portal ATIVO e sem conta de recebimento');

await p.reload({ waitUntil: 'load' });
check((await p.locator('body').innerText()).includes('está no ar'),
  'a tela de pagamento virou boas-vindas');

// ---------- o painel do RH ----------
await p.goto(base + '/empresa', { waitUntil: 'load' });
check((await p.locator('h1').innerText()).includes('Olá'),
  'o responsável entra no painel da empresa');
// Texto renderizado, e não HTML cru: o React intercala comentários entre
// nós de texto adjacentes, e "0 / 50" chega ao HTML como "0 / <!---->50".
const visao = await p.locator('body').innerText();
check(visao.includes('Trilha atribuída a alguém'),
  'a checklist diz que cadastrar não é liberar: atribuir é que libera');
check(/0\s*\/\s*50/.test(visao), 'o painel mostra o teto do plano contratado (0 de 50)');

await p.goto(base + '/professor', { waitUntil: 'load' });
check(!/^\/professor(\/|$)/.test(new URL(p.url()).pathname),
  'o painel do professor não abre para quem administra uma empresa');

// ---------- a Biblioteca no menu do RH (db/042) ----------
await p.goto(base + '/empresa/biblioteca', { waitUntil: 'load' });
const biblio = await p.locator('body').innerText();
check(biblio.includes('Biblioteca') && biblio.includes('Novo item'),
  'a Biblioteca do RH abre, com o formulário de envio do acervo');
check(biblio.includes('Nada no acervo ainda'),
  'e diz o que fazer quando o acervo está vazio');

// Todo item do menu tem ícone. Cinco deles apontavam para nomes que não
// existem em `app/ui.tsx`, e `Icone` devolve null para nome desconhecido:
// metade do menu do RH vinha sem ícone nenhum, sem erro em lugar algum.
const semIcone = await p.locator('aside.lateral a.item-lateral:not(:has(svg))').count();
check(semIcone === 0, 'todo item do menu do RH tem ícone — nenhum nome desconhecido');

// ---------- a marca e a política de acesso ----------
await p.goto(base + '/empresa/site', { waitUntil: 'load' });
await p.fill('input[name=chamada]', 'Treinamento e desenvolvimento na Acme');
await p.fill('input[name=contato]', 'treinamento@acme.com.br');
await p.click('button:has-text("Salvar página")');
await p.waitForSelector('.alerta-ok', { timeout: 15000 });
check(true, 'a página de entrada foi salva');

await p.fill('input[name=dominios]', 'gmail.com');
await p.click('button:has-text("Salvar política")');
await p.waitForSelector('.alerta-erro', { timeout: 15000 });
check((await p.locator('.alerta-erro').innerText()).includes('correio público'),
  'liberar o gmail é recusado com o motivo, não com erro de banco');

await p.fill('input[name=dominios]', 'acme.com.br');
await p.click('button:has-text("Salvar política")');
await p.waitForSelector('.alerta-ok', { timeout: 15000 });
check(true, 'o domínio da empresa foi aceito');

// ---------- outro gestor ----------
await p.goto(base + '/empresa/gestores', { waitUntil: 'load' });
check((await p.locator('body').innerText()).includes('responsável'),
  'quem contratou aparece como responsável');
await p.fill('input[name=nome]', 'Segundo do RH');
await p.fill('input[name=email]', `e2e-rh2-${sufixo}@exemplo.com`);
await p.fill('input[name=senha]', 'outra-senha-longa');
await p.click('button:has-text("Dar acesso")');
await p.waitForSelector('.alerta-ok', { timeout: 15000 });
check(true, 'o RH ganhou um segundo administrador');

// ==========================================================
// O BLOQUEIO — a parte que não pode falhar
// ==========================================================
const raiz = `http://${MASCARA}.localhost:${porta}`;
const pb = await (await b.newContext()).newPage();

await pb.goto(raiz + '/', { waitUntil: 'load' });
const portao = await pb.locator('body').innerText();
check(portao.includes('Universidade Acme'), 'o portão mostra a marca da empresa');
check(portao.includes('Treinamento e desenvolvimento na Acme'),
  'e a mensagem de boas-vindas que o RH escreveu');
check(!portao.includes('Criar conta') && !portao.includes(REAL),
  'sem cadastro aberto e sem preço na tela');

/**
 * A varredura: toda rota pública, anonimamente, no endereço da empresa.
 *
 * Duas exigências por rota, e as duas importam. O DESTINO tem de ser o
 * portão (/) ou o login — qualquer outro significa que a rota respondeu.
 * E o TEXTO não pode trazer o que só existe para quem compra: preço,
 * oferta de cadastro, ou o conteúdo editorial da plataforma. A segunda
 * pega o caso em que a guarda foi posta tarde demais e a página chegou a
 * renderizar antes de redirecionar.
 */
/**
 * `/cadastrar` saiu desta lista quando a etapa 4 entrou.
 *
 * Este roteiro liga o autocadastro por domínio (acme.com.br) alguns
 * passos acima; com a política ligada, a tela de cadastro passa a existir
 * — e é ela que o colaborador com e-mail da empresa usa para entrar sem
 * convite. O que ela NÃO pode fazer é aceitar gente de fora, e isso o
 * bloco seguinte confere de perto. Manter a rota aqui seria cobrar do
 * sistema o comportamento anterior à funcionalidade.
 */
// As rotas do painel do colaborador entram na lista: a Biblioteca, em
// especial, não pode entregar nem o título do que a empresa publicou.
const ROTAS = ['/painel', '/painel/trilhas', '/painel/biblioteca', '/painel/planos',
               '/painel/conta',
               '/catalogo', '/planos', '/vademecum', '/blog', '/vagas',
               '/materia/qualquer', '/aula/qualquer', '/para-professores', '/empresas'];
for (const rota of ROTAS) {
  await pb.goto(raiz + rota, { waitUntil: 'load' });
  const destino = new URL(pb.url()).pathname;
  const texto = await pb.locator('body').innerText();
  const noLugarCerto = destino === '/' || destino.startsWith('/entrar');
  const vazou = texto.includes(REAL) || texto.includes('Criar conta')
    || texto.includes('Vade-mécum Digital') || texto.includes('Mural de vagas');
  check(noLugarCerto && !vazou,
    `${rota} não entrega nada a quem não tem acesso (foi para ${destino})`);
}

// ---------- o autocadastro por domínio: existe, e é seletivo ----------
await pb.goto(raiz + '/cadastrar', { waitUntil: 'load' });
check((await pb.locator('input[name=senha]').count()) > 0,
  'com domínio autorizado, a tela de cadastro existe (etapa 4)');
check(!(await pb.locator('body').innerText()).includes(REAL),
  'e mesmo aberta, não mostra preço nenhum');
await pb.fill('input[name=nome]', 'Alguém de fora');
await pb.fill('input[name=email]', 'alguem@outroemail.com');
await pb.fill('input[name=senha]', 'senha-longa-de-fora');
await pb.click('button[type=submit]');
await pb.waitForSelector('.alerta-erro', { timeout: 20000 });
check((await pb.locator('.alerta-erro').innerText()).includes('e-mail da empresa'),
  'e-mail fora do domínio autorizado é recusado no cadastro');

// ---------- limpeza ----------
await pool.query(
  'DELETE FROM preco WHERE portal_id IN (SELECT id FROM portal WHERE mascara = $1)', [MASCARA]);
await pool.query(
  'DELETE FROM usuario WHERE portal_id IN (SELECT id FROM portal WHERE mascara = $1)', [MASCARA]);
await pool.query('DELETE FROM portal WHERE mascara = $1', [MASCARA]);
await pool.query('DELETE FROM usuario WHERE email LIKE $1', [`e2e-rh%${sufixo}@exemplo.com`]);
await pool.query('DELETE FROM evento_gateway WHERE evento_id = $1', [`e2e-empresa-${sufixo}`]);

await pool.end();
await b.close();
console.log(falhas === 0 ? '\ntudo certo' : `\n${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
