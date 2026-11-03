/**
 * Peças comuns aos roteiros de demonstração (scripts/demo/*.mjs).
 *
 * Estes roteiros povoam o sistema PELOS FLUXOS DE VERDADE — os mesmos
 * formulários, ações e webhooks que um cliente usaria. É de propósito:
 * um seed em SQL prova que o banco aceita a linha; um roteiro que
 * preenche a tela prova que o produto funciona. O que sobra em SQL (as
 * dezenas de questões comentadas) entra por arquivo, para não gastar meia
 * hora de navegador digitando texto que já está escrito.
 *
 *   BASE_URL=http://localhost:3010 \
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimoreosaber \
 *   CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" \
 *   node scripts/demo/portal-professor.mjs
 */
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import pg from 'pg';

export const BASE = process.env.BASE_URL ?? 'http://localhost:3010';
export const PORTA = new URL(BASE).port || '80';
export const SEGREDO = process.env.WEBHOOK_SEGREDO ?? 'segredo-de-desenvolvimento';

/**
 * Senha das contas que os roteiros criam.
 *
 * As senhas padrão estão escritas neste repositório, que é público: servem
 * na máquina de quem desenvolve e em nenhum outro lugar. Contra um
 * endereço que não seja local, o roteiro só roda com `SENHA_DEMO`
 * definida (12+ caracteres) — e todas as contas que ele cria usam ela.
 */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/;
export function senhaDemo(padrao) {
  const s = process.env.SENHA_DEMO;
  if (s) {
    if (s.length < 12) throw new Error('SENHA_DEMO precisa de pelo menos 12 caracteres');
    return s;
  }
  if (!LOCAL.test(new URL(BASE).hostname)) {
    console.error(`✖ ${BASE} não é local: defina SENHA_DEMO — as senhas padrão estão no repositório público.`);
    process.exit(1);
  }
  return padrao;
}
/**
 * Onde estão os arquivos que os roteiros enviam: `imagens/` (foto do
 * professor, logo da empresa) e `portais/` (vídeos das aulas).
 *
 * O padrão aponta para `midia/demo`, que está no .gitignore junto do
 * resto da mídia — arquivo de vídeo não se versiona. Quem for recriar a
 * demonstração noutra máquina põe os arquivos ali, ou aponta
 * `DEMO_MIDIA` para onde eles estiverem. Ver LEIA-ME.md.
 */
// `||` e não `??`: DEMO_MIDIA vazio no ambiente é ausência, não escolha —
// com `??` viraria caminho relativo e o roteiro procuraria os arquivos na
// raiz do projeto.
export const MIDIA = process.env.DEMO_MIDIA
  || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'midia', 'demo');

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5433/aprimoreosaber',
});

let falhas = 0;
export const passo = (ok, msg) => {
  if (!ok) falhas++;
  console.log((ok ? '✔' : '✘') + ' ' + msg);
};
export const contarFalhas = () => falhas;
export const fim = async (browser) => {
  if (browser) await browser.close();
  await pool.end();
  console.log(falhas === 0 ? '\ntudo certo' : `\n${falhas} passo(s) falharam`);
  process.exit(falhas === 0 ? 0 : 1);
};

export async function abrirNavegador() {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  // reducedMotion: sem isso, as seções animadas por `animation-timeline:
  // view()` ficam em opacity 0 e as capturas saem em branco.
  const ctx = await b.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  return { b, ctx, p: await ctx.newPage() };
}

/** O webhook do gateway, assinado como o de verdade. */
export async function webhook(corpo) {
  const texto = JSON.stringify(corpo);
  const assinatura = 'sha256=' + createHmac('sha256', SEGREDO).update(texto).digest('hex');
  const r = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-assinatura': assinatura },
    body: texto,
  });
  return r.json();
}

/**
 * Roda um arquivo .sql dentro do container do banco. É como o resto do
 * conteúdo entra: as questões comentadas já estão escritas, e digitá-las
 * uma a uma no navegador não provaria nada que o formulário já não tenha
 * provado na primeira.
 */
export function rodarSql(caminho) {
  const sql = readFileSync(caminho, 'utf8');
  const saida = execFileSync(
    'docker',
    ['exec', '-i', 'aprimoreosaber-db-1', 'psql', '-U', 'aprimore', '-d', 'aprimoreosaber',
     '-v', 'ON_ERROR_STOP=1', '-q'],
    { input: sql, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return saida;
}

/**
 * Espera o alerta de sucesso DO FORMULÁRIO e devolve o texto (ou lança
 * com o erro que a tela mostrou).
 *
 * O escopo é o formulário, e não a página, por um motivo que custou uma
 * rodada: as telas do painel têm avisos próprios em `.alerta-erro` (o
 * "este curso ainda não aparece no portal", por exemplo), e olhando a
 * página inteira o roteiro lia o aviso da tela como se fosse a resposta
 * do envio.
 */
export async function esperarOk(escopo, ondeEstou) {
  const ok = escopo.locator('.alerta-ok').first();
  const erro = escopo.locator('.alerta-erro').first();
  await Promise.race([
    ok.waitFor({ state: 'visible', timeout: 30000 }),
    erro.waitFor({ state: 'visible', timeout: 30000 }),
  ]).catch(() => {});
  if (await erro.isVisible().catch(() => false)) {
    throw new Error(`${ondeEstou}: ${(await erro.innerText()).trim()}`);
  }
  if (!(await ok.isVisible().catch(() => false))) {
    throw new Error(`${ondeEstou}: nem sucesso nem erro apareceram`);
  }
  return (await ok.innerText()).trim();
}

/** Preenche um `<form>` a partir de um objeto {campo: valor}. */
export async function preencher(escopo, valores) {
  for (const [nome, valor] of Object.entries(valores)) {
    const campo = escopo.locator(`[name="${nome}"]`).first();
    const tag = await campo.evaluate((el) => el.tagName.toLowerCase() + ':' + (el.type ?? ''));
    if (tag.startsWith('select')) await campo.selectOption(String(valor));
    else if (tag.endsWith(':checkbox')) valor ? await campo.check() : await campo.uncheck();
    else await campo.fill(String(valor));
  }
}

/** Cadastra uma questão pelo formulário do painel (aula ou avaliação). */
export async function cadastrarQuestao(p, q) {
  await p.click('button:has-text("Adicionar questão")');
  const form = p.locator('form:has(textarea[name=enunciado])').last();
  await form.locator('textarea[name=enunciado]').fill(q.enunciado);
  await form.locator('select[name=tipo]').selectOption(q.tipo);
  await form.locator('input[name=origem]').fill(q.origem ?? 'Autoral');
  await form.locator('select[name=dificuldade]').selectOption(q.dificuldade ?? 'introdutorio');
  for (const [i, a] of q.alternativas.entries()) {
    await form.locator(`input[name=texto${i}]`).fill(a.texto);
    await form.locator(`textarea[name=comentario${i}]`).fill(a.comentario);
    if (a.correta) await form.locator(`input[name=correta][value="${i}"]`).check();
  }
  await form.locator('button[type=submit]').click();
  // A questão nova fecha o próprio formulário ao salvar; esperar o botão
  // "Adicionar questão" voltar é esperar exatamente o fim do salvamento.
  await p.locator('button:has-text("Adicionar questão")').waitFor({ state: 'visible', timeout: 30000 });
}
