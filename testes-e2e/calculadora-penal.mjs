/**
 * Verificação de ponta a ponta — Calculadora Penal (§5.12).
 *
 * Roda contra a aplicação de pé, com Playwright:
 *
 *   BASE_URL=http://localhost:3010 node testes-e2e/calculadora-penal.mjs
 *
 * O roteiro é o do plano: o aluno escolhe roubo majorado tentado, preenche
 * o caso, confere pena, regime e prescrição na tela, abre o artigo no
 * vade-mécum pelo link e vê o botão de voltar para a calculadora. Sem
 * sessão: a ferramenta é pública, como o vade-mécum.
 */
import { chromium } from 'playwright-core';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const base = process.env.BASE_URL ?? 'http://localhost:3000';
let falhas = 0;
const check = (c, m) => { if (!c) falhas++; console.log((c ? '✔' : '✘') + ' ' + m); };

const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
const p = await ctx.newPage();

// ---------- o menu leva até a ferramenta ----------
await p.goto(base + '/', { waitUntil: 'load' });
await p.click('.menu-ferramentas > button');
check(await p.locator('.menu-caixa a[href="/calculadora-penal"]').isVisible(), 'o menu Ferramentas mostra a Calculadora Penal');
await p.click('.menu-caixa a[href="/calculadora-penal"]');
await p.waitForURL('**/calculadora-penal', { timeout: 20000 });
check(await p.locator('h1', { hasText: 'Calculadora Penal' }).isVisible(), 'a página abre com o título');
check(await p.locator('.calc-vazio').isVisible(), 'sem caso, a área do resultado explica o que fazer');

// ---------- monta o caso: roubo majorado tentado ----------
// O formulário é de cliente: preencher antes da hidratação perde o valor.
await p.waitForLoadState('networkidle');
await p.fill('input[type=date] >> nth=0', '2026-06-10');
check(await p.locator('input[type=date] >> nth=0').inputValue() === '2026-06-10', 'a data do fato aceita o valor digitado');
await p.click('.calc-form button:has-text("Adicionar crime")');
await p.fill('.calc-crime input[type=search]', 'roubo');
await p.selectOption('.calc-crime select[size]', 'cp-157');
check((await p.locator('.calc-pena-cominada').textContent())?.includes('6 anos'), 'mostra a pena cominada do roubo (6 a 10 anos, redação de 2026)');

await p.click('.calc-crime summary:has-text("3ª fase")');
await p.check('.calc-causa:has-text("Concurso de pessoas") input[type=checkbox]');
await p.check('.calc-causa:has-text("Tentativa") input[type=checkbox]');
await p.selectOption('.calc-causa:has-text("Tentativa") select', '1/2');
const previa = (await p.locator('.calc-previa .numero').textContent()) ?? '';
check(previa.includes('4 anos'), `a prévia atualiza sozinha (${previa.trim()})`);

// datas do processo e agente
await p.fill('label:has-text("Nascimento do agente") input', '2006-01-15');
await p.fill('label:has-text("Recebimento da denúncia") input', '2026-07-15');
await p.fill('label:has-text("Sentença condenatória") input', '2026-08-20');

await p.click('.calc-previa button[type=submit]');
await p.waitForURL('**/calculadora-penal?c=*', { timeout: 20000 });
await p.waitForSelector('.calc-topo');
await p.screenshot({ path: '/tmp/cp-resultado.png', fullPage: true });

// ---------- o resultado ----------
const topo = (await p.locator('.calc-topo .pena').textContent()) ?? '';
check(topo.includes('4 anos'), `pena definitiva no topo (${topo.trim().slice(0, 40)})`);
check(((await p.locator('.calc-topo .chips').textContent()) ?? '').includes('fato em 10/06/2026'), 'a data do fato informada chegou ao resultado');
check(await p.locator('.calc-topo .chip', { hasText: 'regime inicial' }).isVisible(), 'regime inicial em destaque');
check((await p.locator('.calc-memoria').first().locator('tbody tr').count()) >= 5, 'memória de cálculo com as três fases');
check(await p.locator('.calc-memoria a.calc-ref').first().isVisible(), 'cada passo cita o artigo com link');
check(await p.locator('.calc-artigo[open] .vade-pena').first().isVisible(), 'o artigo do crime aparece aberto com a linha da pena');
check((await p.locator('.calc-trecho').count()) >= 3, 'a linha do tempo tem os trechos do processo');
check(await p.locator('.calc-trecho.INTERROMPIDO').first().isVisible(), 'trecho interrompido pela denúncia');
check(await p.locator('.calc-trecho.CORRENDO').first().isVisible(), 'trecho em curso desde a sentença');
check((await p.locator('.calc-memoria', { hasText: 'retroativa' }).count()) >= 1, 'tabela de prazos com as modalidades');
check((await p.locator('.calc-ficha').textContent())?.includes('20 anos'), 'a ficha mostra a idade do agente na data do fato');
check((await p.locator('.calc-ficha').textContent())?.includes('art. 115'), 'e diz que a prescrição cai pela metade');
check(await p.locator('.calc-cartao', { hasText: 'Decadência' }).locator('.chip', { hasText: 'não se aplica' }).isVisible(), 'decadência: não se aplica ao roubo, com o motivo');
check(await p.locator('.calc-cartao', { hasText: 'Perempção' }).locator('.chip', { hasText: 'não se aplica' }).isVisible(), 'perempção: não se aplica, com o motivo');
// com sessão (ALUNO_DEMO em desenvolvimento) aparece o formulário de guardar; sem sessão, o convite para entrar
const logado = (await p.locator('.calc-salvar-form').count()) > 0;
check(logado || await p.locator('.calc-salvar-aviso a[href^="/entrar"]').isVisible(), logado ? 'com sessão, oferece guardar o cálculo' : 'sem sessão, oferece entrar para guardar');

// ---------- o link é o cálculo ----------
const url = p.url();
const p2 = await ctx.newPage();
await p2.goto(url, { waitUntil: 'load' });
check(((await p2.locator('.calc-topo .pena').textContent()) ?? '').includes('4 anos'), 'o mesmo link reabre o mesmo cálculo');
await p2.close();

// ---------- vade-mécum ↔ calculadora ----------
await p.click('.calc-memoria a.calc-ref >> nth=0');
await p.waitForURL('**/vademecum?*', { timeout: 20000 });
check(await p.locator('.vade-artigo.destacado').isVisible(), 'o link abre o artigo no vade-mécum, destacado');
const volta = p.locator('.vade-artigo.destacado a[href^="/calculadora-penal?tipo="]');
check((await volta.count()) > 0, 'o artigo do crime tem o botão "Calcular a pena"');
if (await volta.count()) {
  // as ações do artigo só aparecem com o ponteiro sobre ele
  await p.locator('.vade-artigo.destacado').hover();
  const destino = await volta.first().getAttribute('href');
  await p.goto(base + destino, { waitUntil: 'load' });
  check(await p.locator('.calc-topo').isVisible(), 'o botão do vade-mécum abre a calculadora já com o crime calculado');
  check(((await p.locator('.calc-topo .chips').textContent()) ?? '').includes('Roubo'), 'e o crime pré-selecionado é o do artigo');
}

// ---------- acessibilidade básica ----------
await p.goto(base + '/calculadora-penal', { waitUntil: 'load' });
check((await p.locator('form[aria-label="Dados do caso"] fieldset legend').count()) >= 5, 'o formulário tem as cinco seções com legenda');

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
