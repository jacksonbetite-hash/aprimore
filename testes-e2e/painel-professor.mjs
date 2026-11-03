/**
 * Verificação de ponta a ponta — o painel do professor e a página do
 * portal (§5.10): contrata, paga, aprova a conta, personaliza a página,
 * cria área → curso → assunto → aula → questão, publica, e vê tudo no ar
 * no endereço dele — com a marca dele, sem o nosso blog.
 *
 *   DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimore \
 *   BASE_URL=http://localhost:3010 node testes-e2e/painel-professor.mjs
 */
import { createHmac, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import pg from 'pg';

/**
 * O arquivo que sobe como aula.
 *
 * Com ffmpeg por perto, sobe um MP4 de verdade — e aí dá para conferir o
 * que o professor vê depois de enviar: a capa do cartão saindo sozinha de
 * um quadro do vídeo (lib/capa-video.ts). Sem ffmpeg, sobe ruído, como
 * antes: o teste continua valendo para o upload, e a capa cai no desenho
 * da área, que é o comportamento correto para arquivo que não é vídeo.
 */
function videoDeTeste() {
  const dir = mkdtempSync(path.join(tmpdir(), 'e2e-video-'));
  const arquivo = path.join(dir, 'aula.mp4');
  const r = spawnSync(process.env.FFMPEG || 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'testsrc=size=640x360:rate=15:duration=3', '-pix_fmt', 'yuv420p', '-y', arquivo,
  ]);
  if (r.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    return { buffer: randomBytes(96 * 1024), real: false };
  }
  const buffer = readFileSync(arquivo);
  rmSync(dir, { recursive: true, force: true });
  return { buffer, real: true };
}
const VIDEO = videoDeTeste();

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
const MASCARA = `e2e-painel-${sufixo}`;
const EMAIL = `e2e-painel-${sufixo}@exemplo.com`;
const PORTAL = `http://${MASCARA}.localhost:${porta}`;

async function webhook(obj) {
  const corpo = JSON.stringify(obj);
  const assinatura = 'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex');
  return (await fetch(`${base}/api/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-assinatura': assinatura }, body: corpo,
  })).json();
}

let videoEnviado = null;
let fotoEnviada = null;
const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
const p = await ctx.newPage();
try {
  // ---------- contrata, paga, aprova ----------
  await p.goto(base + '/para-professores', { waitUntil: 'load' });
  await p.fill('input[name=nome]', 'Profa. Painel');
  await p.fill('input[name=email]', EMAIL);
  await p.fill('input[name=senha]', 'senha-bem-longa');
  await p.fill('input[name=cnpj]', '11.222.333/0001-81');
  await p.fill('input[name=telefone]', '(11) 98765-4321');
  await p.fill('input[name=renda]', '8000');
  await p.fill('input[name=cep]', '01310-100');
  await p.fill('input[name=logradouro]', 'Av. Paulista');
  await p.fill('input[name=numero]', '1000');
  await p.fill('input[name=bairro]', 'Bela Vista');
  await p.fill('input[name=nomeExibicao]', 'Direito com a Profa. Painel');
  await p.fill('input[name=mascara]', MASCARA);
  await p.check('input[name=aceite]');
  await p.click('#contratar button[type=submit]');
  await p.waitForURL('**/para-professores/pagamento/**', { timeout: 20000 });
  const referencia = p.url().split('/').pop();
  const rf = await webhook({ eventoId: 'e2e-pan-fat-' + sufixo, tipo: 'pagamento.confirmado', referencia, centavos: 14900 });
  check(rf.portalAtivado, 'portal ativado');
  const { rows: [{ id: subId }] } = await pool.query(`SELECT gateway_subconta_id AS id FROM portal WHERE mascara = $1`, [MASCARA]);
  await webhook({ eventoId: 'e2e-pan-sub-' + sufixo, tipo: 'subconta.aprovada', referencia: subId, centavos: 0 });

  await p.goto(`${base}/para-professores/pagamento/${referencia}`, { waitUntil: 'load' });
  check(await p.locator('a.btn-bloco[href="/professor"]').isVisible(), 'a tela de pagamento leva ao painel');
  check(await p.locator('.topo a[href="/professor"]').isVisible(), 'o cabeçalho ganhou o atalho "Meu portal"');

  // ---------- visão geral ----------
  await p.goto(base + '/professor', { waitUntil: 'load' });
  let corpo = await p.textContent('body');
  check(corpo.includes('Painel do professor') && corpo.includes('Profa'), 'painel abre para o professor');
  check(corpo.includes('aprovada'), 'e mostra a conta de recebimento aprovada');

  // ---------- minha página ----------
  await p.goto(base + '/professor/site', { waitUntil: 'load' });
  await p.fill('input[name=chamada]', 'Direito Penal descomplicado');
  await p.fill('textarea[name=proposito]', 'Aulas curtas, com a lei ao lado.');
  await p.fill('textarea[name=sobre]', 'Professora há dez anos.');
  await p.fill('input[name=contato]', 'contato@exemplo.com');
  await p.fill('input[name=corPrimaria]', '#0f766e');
  await p.click('form.form-editor button[type=submit]');
  await p.waitForTimeout(1500);
  // `.first()`: o FormSite repete o aviso no topo E no rodapé de
  // propósito (o formulário é longo, e confirmação só no topo passa
  // despercebida). Sem isso, o modo estrito do Playwright reclama de dois
  // elementos e derruba o teste por um acerto do produto.
  check((await p.locator('.alerta-ok').first().textContent() ?? '').includes('salva'),
    'página personalizada salva');

  // foto de apresentação, pelo painel (PNG mínimo válido: 1×1)
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('input[type=file][accept*="image"]', { name: 'foto.png', mimeType: 'image/png', buffer: png });
  await p.waitForSelector('.alerta-ok:has-text("Foto enviada")', { timeout: 15000 });
  const { rows: [fotoDb] } = await pool.query(
    `SELECT personalizacao->>'foto' AS foto FROM portal WHERE mascara = $1`, [MASCARA]);
  check((fotoDb.foto ?? '').startsWith('/api/imagem/p'), `foto vinculada à página (${fotoDb.foto})`);
  const rImg = await fetch(base + fotoDb.foto);
  check(rImg.status === 200 && rImg.headers.get('content-type') === 'image/png', 'a foto é servida como imagem pública');
  fotoEnviada = fotoDb.foto.replace('/api/imagem/', '');

  // ---------- acervo: área → curso → assunto → aula → questão ----------
  await p.goto(base + '/professor/cursos', { waitUntil: 'load' });
  await p.fill('form.form-linha input[name=nome]', 'Penal');
  await p.click('form.form-linha button[type=submit]');
  await p.waitForTimeout(1200);
  check((await p.textContent('body')).includes('Área criada'), 'área criada pelo professor');

  await p.reload({ waitUntil: 'load' });
  const formCurso = p.locator('form.form-editor').last();
  await formCurso.locator('input[name=nome]').fill('Teoria do Crime');
  await formCurso.locator('select[name=areaId]').selectOption({ index: 1 });
  await formCurso.locator('textarea[name=ementa]').fill(
    'Do fato típico à culpabilidade: conduta, resultado, nexo causal e tipicidade, com casos práticos comentados em cada aula.');
  await formCurso.locator('button[type=submit]').click();
  try {
    await p.waitForURL('**/professor/cursos/**', { timeout: 20000 });
  } catch {
    console.log('  erro do formulário:', await p.locator('.alerta-erro').first().textContent().catch(() => '(nenhum)'));
    throw new Error('curso não foi criado');
  }
  check(p.url().includes('criada=1'), 'curso criado e aberto');
  const cursoUrl = p.url().split('?')[0];

  await p.locator('form.form-linha input[name=nome]').first().fill('Fato típico');
  await p.locator('form.form-linha button[type=submit]').first().click();
  await p.waitForTimeout(1200);
  await p.reload({ waitUntil: 'load' });
  check((await p.textContent('body')).includes('Fato típico'), 'assunto criado');

  const formAula = p.locator('form.form-editor').last();
  await formAula.locator('input[name=titulo]').fill('Conduta e resultado');
  await formAula.locator('textarea[name=resumo]').fill('A conduta humana voluntária e o resultado naturalístico: o ponto de partida do fato típico.');
  await formAula.locator('input[name=minutos]').fill('12');
  await formAula.locator('button[type=submit]').click();
  await p.waitForURL('**/professor/cursos/aula/**', { timeout: 20000 });
  check(p.url().includes('criada=1'), 'aula criada');

  // questão: abre o formulário de nova questão
  await p.click('button:has-text("Nova questão"), button:has-text("Adicionar questão"), button:has-text("questão")');
  await p.waitForTimeout(500);
  await p.fill('textarea[name=enunciado]', 'A conduta, para o Direito Penal, exige:');
  await p.fill('input[name=texto0]', 'Voluntariedade');
  await p.fill('textarea[name=comentario0], input[name=comentario0]', 'Correta: sem vontade não há conduta.');
  await p.fill('input[name=texto1]', 'Resultado material sempre');
  await p.fill('textarea[name=comentario1], input[name=comentario1]', 'Errada: crimes de mera conduta dispensam resultado.');
  await p.check('input[name=correta][value="0"]');
  await p.click('form:has(textarea[name=enunciado]) button[type=submit]');
  await p.waitForTimeout(1500);
  check((await p.textContent('body')).includes('Questão criada') || (await p.textContent('body')).includes('Questão 1'), 'questão criada');

  // ---------- vídeo da aula, pelo painel ----------
  const aulaId = parseInt(p.url().split('/aula/')[1], 10);
  await p.setInputFiles('input[type=file][accept*="video"]', {
    name: 'aula-teste.mp4', mimeType: 'video/mp4', buffer: VIDEO.buffer,
  });
  await p.waitForSelector('.alerta-ok:has-text("Vídeo enviado")', { timeout: 30000 });
  const { rows: [aulaDb] } = await pool.query(
    `SELECT video_provedor AS prov, video_id AS vid FROM aula WHERE id = $1`, [aulaId]);
  check(aulaDb.prov === 'LOCAL' && /^p\d+-a\d+-[0-9a-f]+\.mp4$/.test(aulaDb.vid ?? ''),
    `vídeo enviado e vinculado à aula (${aulaDb.vid})`);
  videoEnviado = aulaDb.vid;
  const bruto = await fetch(`${base}/api/upload?tipo=video&aulaId=${aulaId}&nome=x.exe`, { method: 'POST', body: 'x' });
  check(bruto.status === 401, 'sem sessão, o upload é recusado');

  // publica a aula e o curso
  await p.click('.cabecalho-tela form button:has-text("Publicar")');
  await p.waitForTimeout(1200);
  await p.goto(cursoUrl, { waitUntil: 'load' });
  await p.goto(base + '/professor/cursos', { waitUntil: 'load' });
  await p.click('table form button:has-text("Publicar")');
  await p.waitForTimeout(1200);

  // ---------- no ar, no endereço dele ----------
  const anon = await (await b.newContext()).newPage();
  await anon.goto(PORTAL + '/', { waitUntil: 'load' });
  corpo = await anon.textContent('body');
  check(corpo.includes('Direito Penal descomplicado'), 'a home do portal mostra a chamada personalizada');
  // A abertura deixou de exibir o retrato de 220px: o lugar da direita
  // passou a ser do PRODUTO em uso (o app aberto numa aula). A foto do
  // professor virou o selo de 44px sobre essa mídia, e ganhou tamanho de
  // gente em "Quem ensina" — docs/plano-vitrine-do-professor.md, fase 1.
  check(await anon.locator(`.hero-selo img[src="/api/imagem/${fotoEnviada}"]`).count() === 1,
    'com a foto enviada no selo da abertura');
  check(await anon.locator(`#sobre img[src="/api/imagem/${fotoEnviada}"]`).count() === 1,
    'e em tamanho de gente em "Quem ensina"');
  /* A mídia da abertura passou a ser a foto de estudo em grupo, e o
     celular desceu para a seção do método (layout de 09/09/2026). As
     duas continuam com o selo de conteúdo ilustrativo. */
  check(await anon.locator('.hero-foto img[src="/imagens/estudo-em-grupo.jpg"]').count() === 1,
    'e a mídia da abertura é a foto de estudo em grupo');
  check(await anon.locator('.vitrine-app-figura img[src="/imagens/aula-no-celular.jpg"]').count() === 1,
    'com o app aberto numa aula na seção do método');
  /* O acervo da home virou prateleira de cartões (fase 1 de
     `docs/plano-catalogo-em-prateleiras.md`): área no título da fila,
     curso no cartão, com capa, preço e "Ver o curso". O título da AULA
     saiu daqui — ele agora só aparece na página do curso, que é onde a
     verificação seguinte vai buscá-lo. */
  check(corpo.includes('Penal') && corpo.includes('Teoria do Crime'),
    'e o acervo publicado, por área e curso');
  check(await anon.locator('.prateleira .cartao-vitrine .capa-curso').count() >= 1,
    'o curso aparece em cartão com capa');
  if (VIDEO.real) {
    /* A capa é gerada fora do caminho da resposta do upload: pode chegar
       um instante depois dele. Duas tentativas bastam — o quadro sai em
       milissegundos num vídeo de três segundos. */
    let comFoto = await anon.locator('.cartao-vitrine .capa-foto').count();
    if (!comFoto) {
      await anon.waitForTimeout(2500);
      await anon.reload({ waitUntil: 'load' });
      comFoto = await anon.locator('.cartao-vitrine .capa-foto').count();
    }
    check(comFoto === 1, 'e a capa é um quadro do vídeo enviado, gerado sozinho');
  } else {
    console.log('· (ffmpeg ausente: capa a partir do vídeo não verificada)');
  }
  check((await anon.locator('.rodape-vitrine strong').first().textContent())?.includes('R$'),
    'com o preço no pé do cartão');
  check(await anon.locator('.cartao-vitrine:has-text("Teoria do Crime") .btn:has-text("Ver o curso")').count() === 1,
    'e o botão "Ver o curso"');

  const destinoCartao = await anon.locator('.cartao-vitrine:has-text("Teoria do Crime")')
    .first().getAttribute('href');
  await anon.goto(PORTAL + destinoCartao, { waitUntil: 'load' });
  check((await anon.textContent('body')).includes('Conduta e resultado'),
    'e o cartão leva ao curso, onde a aula publicada está listada');
  await anon.goto(PORTAL + '/', { waitUntil: 'load' });
  const rodape = await anon.locator('footer').textContent();
  const okRodape = rodape.includes('Responsável pelo conteúdo') && rodape.includes('11.222.333/0001-81');
  check(okRodape, 'rodapé identifica o responsável com CNPJ');
  if (!okRodape) console.log('  rodapé visto:', rodape.replace(/\s+/g, ' ').slice(0, 300));
  check(!(await anon.locator('nav a[href="/blog"]').count()), 'o blog da plataforma não aparece no portal');
  check((await anon.locator('.marca .rotulo').first().textContent()).includes('Profa. Painel'), 'a marca no topo é a do professor');
  check((await anon.content()).includes('--primary:#0f766e'), 'a cor principal escolhida entra no tema');
  await anon.context().close();
} finally {
  await ctx.close();
  await b.close();
  const { rows: [pt] } = await pool.query(`SELECT id FROM portal WHERE mascara = $1`, [MASCARA]);
  if (pt) {
    // A ordem segue as chaves estrangeiras, e `preco` precisa sair antes
    // do portal: `semearPrecosDaPlataforma` cria uma tabela de preço em
    // todo portal novo, e sem apagá-la a limpeza falhava — escondendo,
    // no `finally`, o erro que de fato derrubou o teste.
    await pool.query(`DELETE FROM aula WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM assunto WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM materia WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM area WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM preco WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM portal_fatura WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM portal_contrato WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM usuario WHERE portal_id = $1`, [pt.id]);
    await pool.query(`DELETE FROM portal WHERE id = $1`, [pt.id]);
  }
  await pool.query(`DELETE FROM usuario WHERE email = $1`, [EMAIL]);
  await pool.end();
  // Os arquivos enviados vivem no volume do container; apagar é
  // cortesia (best effort) — sem Docker no PATH, ficam órfãos e pequenos.
  try {
    const { execSync } = await import('node:child_process');
    const alvos = [videoEnviado && `/midia/video/${videoEnviado}`, fotoEnviada && `/midia/imagem/${fotoEnviada}`].filter(Boolean);
    if (alvos.length) execSync(`docker exec aprimore-web-1 rm -f ${alvos.join(' ')}`, { stdio: 'ignore' });
  } catch { /* sem docker por perto */ }
}
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTodas as verificações passaram');
process.exit(falhas ? 1 : 0);
