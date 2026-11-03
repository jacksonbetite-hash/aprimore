/**
 * Demonstração — o Portal do Professor, ponta a ponta pelos formulários.
 *
 * Cria o portal do "Prof. Otávio Lins" do jeito que um professor real
 * criaria: contrata em /para-professores, paga (webhook do gateway),
 * tem a conta de recebimento aprovada, personaliza a página com foto,
 * cria área → curso → assunto → aula, envia o vídeo, escreve o exercício
 * e publica. O acervo maior (curso de Penal + a 2ª aula de
 * Administrativo) entra pelo SQL de scripts/demo/, com as questões já
 * escritas.
 *
 *   BASE_URL=http://localhost:3010 CHROMIUM="…/chrome.exe" \
 *   DATABASE_URL=postgres://… node scripts/demo/portal-professor.mjs
 *
 * Idempotente por destruição: apaga o portal `otaviolins` antes de
 * recomeçar, para poder rodar de novo sem sujeira.
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BASE, PORTA, MIDIA, pool, passo, fim, abrirNavegador, webhook, rodarSql, senhaDemo,
  esperarOk, preencher, cadastrarQuestao,
} from './_comum.mjs';

const MASCARA = 'otaviolins';
const EMAIL = 'otavio.lins@exemplo.com.br';
const SENHA = senhaDemo('aulas-de-penal-2026');
const PORTAL_URL = `http://${MASCARA}.localhost:${PORTA}`;

// ---------------------------------------------------------------------
// Limpeza: o roteiro pode rodar quantas vezes for preciso
// ---------------------------------------------------------------------
async function limpar() {
  const alvo = `SELECT id FROM portal WHERE mascara = '${MASCARA}'`;
  const cursos = `SELECT id FROM materia WHERE portal_id IN (${alvo})`;
  for (const sql of [
    // Curso compartilhado na vitrine é vendido a ALUNOS DA PLATAFORMA
    // (portal 0): a licença e o pedido deles apontam para a matéria deste
    // portal, e sem apagá-los primeiro o portal não sai. É o preço de o
    // acervo do professor circular fora da casa dele (§5.10.2, etapa 5).
    `DELETE FROM licenca WHERE materia_id IN (${cursos})`,
    `DELETE FROM pedido WHERE materia_id IN (${cursos})`,
    `DELETE FROM progresso_aula WHERE aula_id IN (
       SELECT id FROM aula WHERE portal_id IN (${alvo}))`,
    `DELETE FROM resposta WHERE questao_id IN (
       SELECT q.id FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
         JOIN aula a ON a.id = e.aula_id WHERE a.portal_id IN (${alvo}))`,
    `DELETE FROM licenca WHERE portal_id IN (${alvo})`,
    `DELETE FROM pedido WHERE portal_id IN (${alvo})`,
    `DELETE FROM indicacao WHERE portal_id IN (${alvo})`,
    `DELETE FROM alternativa WHERE questao_id IN (
       SELECT q.id FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
         JOIN aula a ON a.id = e.aula_id WHERE a.portal_id IN (${alvo}))`,
    `DELETE FROM questao WHERE exercicio_id IN (
       SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.portal_id IN (${alvo}))`,
    `DELETE FROM exercicio WHERE aula_id IN (SELECT id FROM aula WHERE portal_id IN (${alvo}))`,
    `DELETE FROM aula_dispositivo WHERE aula_id IN (SELECT id FROM aula WHERE portal_id IN (${alvo}))`,
    `DELETE FROM aula WHERE portal_id IN (${alvo})`,
    `DELETE FROM assunto WHERE portal_id IN (${alvo})`,
    `DELETE FROM materia WHERE portal_id IN (${alvo})`,
    `DELETE FROM area WHERE portal_id IN (${alvo})`,
    `DELETE FROM preco WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal_consumo WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal_fatura WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal_contrato WHERE portal_id IN (${alvo})`,
    `DELETE FROM usuario WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal WHERE mascara = '${MASCARA}'`,
    `DELETE FROM usuario WHERE lower(email) = '${EMAIL}'`,
    `DELETE FROM evento_gateway WHERE evento_id LIKE 'demo-prof-%'`,
  ]) await pool.query(sql);
}

const { b, p } = await (async () => { await limpar(); return abrirNavegador(); })();

try {
  // -------------------------------------------------------------------
  // 1. Contratação em autosserviço
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/para-professores`, { waitUntil: 'load' });
  await preencher(p.locator('#contratar'), {
    nome: 'Otávio Lins',
    email: EMAIL,
    senha: SENHA,
    cnpj: '11.222.333/0001-81',
    telefone: '(11) 98812-4477',
    renda: '9500',
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1578',
    complemento: 'conjunto 92',
    bairro: 'Bela Vista',
    nomeExibicao: 'Direito Penal com Otávio Lins',
    mascara: MASCARA,
    aceite: true,
  });
  await p.click('#contratar button[type=submit]');
  await p.waitForURL('**/para-professores/pagamento/**', { timeout: 40000 });
  const referencia = p.url().split('/').pop();
  passo(referencia.startsWith('PF-'), `portal contratado — fatura ${referencia}`);

  const antes = await pool.query('SELECT status FROM portal WHERE mascara = $1', [MASCARA]);
  passo(antes.rows[0]?.status === 'RASCUNHO', 'nasce em rascunho: quem abre o portal é o pagamento');

  // -------------------------------------------------------------------
  // 2. Pagamento e conta de recebimento
  // -------------------------------------------------------------------
  const pago = await webhook({
    eventoId: 'demo-prof-fatura', tipo: 'pagamento.confirmado', referencia, centavos: 14900,
  });
  passo(pago.portalAtivado === true, 'webhook do gateway pagou a 1ª mensalidade e abriu o portal');
  passo(pago.subconta === 'EM_ANALISE', 'a subconta do professor foi aberta no gateway');

  const { rows: [sub] } = await pool.query(
    'SELECT gateway_subconta_id AS id FROM portal WHERE mascara = $1', [MASCARA]);
  const aprovada = await webhook({
    eventoId: 'demo-prof-subconta', tipo: 'subconta.aprovada', referencia: sub.id, centavos: 0,
  });
  passo(aprovada.subconta === 'APROVADA', 'conta de recebimento aprovada — o portal já pode vender');

  // -------------------------------------------------------------------
  // 3. Minha página: foto, chamada, propósito, sobre, contato e cor
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/professor/site`, { waitUntil: 'load' });
  await p.setInputFiles('input[type=file][accept*="image"]', join(MIDIA, 'imagens', 'otavio-lins.jpg'));
  await p.waitForSelector('.alerta-ok:has-text("Foto enviada")', { timeout: 40000 });
  const { rows: [foto] } = await pool.query(
    `SELECT personalizacao->>'foto' AS foto FROM portal WHERE mascara = $1`, [MASCARA]);
  passo((foto.foto ?? '').startsWith('/api/imagem/'), `foto de apresentação no ar (${foto.foto})`);

  await p.reload({ waitUntil: 'load' });
  const site = p.locator('form.form-editor').first();
  await preencher(site, {
    chamada: 'Direito Penal sem decoreba, do zero à prática',
    proposito: 'Aulas curtas, com a lei ao lado e exercício comentado ao final de cada uma. '
      + 'Você entende a lógica do crime e da pena antes de decorar artigo — e aí o artigo cola sozinho.',
    sobre: 'Sou Otávio Lins, advogado criminalista há doze anos e professor de Direito Penal '
      + 'desde 2016. Já preparei turmas para OAB, Defensoria e Ministério Público.\n\n'
      + 'Meu método é o mesmo em todas as aulas: um caso concreto primeiro, a regra depois, '
      + 'e o exercício comentado para você conferir se entendeu — inclusive nas alternativas '
      + 'que você não marcou.',
    contato: 'contato@otaviolins.com.br',
    corPrimaria: '#0f766e',
  });
  await site.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(site, 'salvar Minha página')), 'página do portal personalizada');

  // -------------------------------------------------------------------
  // 4. Acervo pelo painel: área → curso → assunto → aula → vídeo → questões
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/professor/cursos`, { waitUntil: 'load' });
  const formArea = p.locator('form.form-linha').first();
  await preencher(formArea, { nome: 'Direito Administrativo', ordem: 2 });
  await formArea.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(formArea, 'criar área')), 'área "Direito Administrativo" criada');

  await p.reload({ waitUntil: 'load' });
  const curso = p.locator('form.form-editor').last();
  await curso.locator('input[name=nome]').fill('Direito Administrativo para concursos');
  await curso.locator('select[name=areaId]').selectOption({ label: 'Direito Administrativo' });
  await curso.locator('textarea[name=ementa]').fill(
    'A Administração Pública por dentro: como o Estado se organiza, quem age em nome dele e '
    + 'quais limites o art. 37 da Constituição impõe a cada ato. Curso introdutório, pensado '
    + 'para quem vai prestar concurso e precisa da estrutura antes do detalhe.');
  await curso.locator('select[name=status]').selectOption('publicado');
  await curso.locator('input[name=professor]').fill('Prof. Otávio Lins');
  await curso.locator('input[name=onda]').fill('1');
  // db/043 — o nível é o que a barra de busca do catálogo oferece em
  // "Todos os níveis". Vai por texto, e não por lista fechada: o portal é
  // white-label, e "OAB e concursos" não serve ao portal de tecnologia.
  await curso.locator('input[name=nivel]').fill('OAB e concursos');
  await curso.locator('input[name=naVitrinePlataforma]').check();
  await curso.locator('button[type=submit]').click();
  await p.waitForURL('**/professor/cursos/**', { timeout: 40000 });
  passo(p.url().includes('criada=1'), 'curso criado e compartilhado com a vitrine da plataforma');
  const cursoUrl = p.url().split('?')[0];

  const formAssunto = p.locator('form.form-linha').first();
  await preencher(formAssunto, { nome: 'Estrutura da Administração Pública' });
  await formAssunto.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(formAssunto, 'criar assunto')), 'assunto "Estrutura da Administração Pública" criado');

  await p.goto(cursoUrl, { waitUntil: 'load' });
  const aula = p.locator('form.form-editor').last();
  await aula.locator('input[name=titulo]').fill('Estrutura da Administração Pública (parte 1)');
  await aula.locator('textarea[name=resumo]').fill(
    'Administração Pública direta é o próprio Estado agindo por seus órgãos: União, estados, '
    + 'Distrito Federal e municípios, com seus ministérios e secretarias. Órgão não tem '
    + 'personalidade jurídica própria — quem responde é a pessoa política a que ele pertence.\n\n'
    + 'Administração indireta é o Estado agindo por pessoas jurídicas que ele criou para isso: '
    + 'autarquias, fundações públicas, empresas públicas e sociedades de economia mista. Essas '
    + 'têm personalidade própria, patrimônio próprio e respondem pelos próprios atos.\n\n'
    + 'A diferença aparece na prática o tempo todo. Quem processa o INSS processa uma autarquia '
    + 'federal, não a União. Quem processa a prefeitura processa o município. Errar o polo '
    + 'passivo é errar a ação inteira.\n\n'
    + 'Duas expressões que caem em prova e confundem: desconcentração é distribuir competência '
    + 'DENTRO da mesma pessoa jurídica (criar uma secretaria); descentralização é transferir '
    + 'para OUTRA pessoa jurídica (criar uma autarquia). Uma é organização interna, a outra '
    + 'cria um novo sujeito de direitos.\n\n'
    + 'Vídeo: "Saber Direito Aula - Direito Administrativo - Estrutura da Administração - Aula 1", '
    + 'canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido '
    + 'com os créditos ao autor. Trecho de 0:00 a 6:00.');
  await aula.locator('input[name=minutos]').fill('6');
  await aula.locator('input[name=segundos]').fill('0');
  // Ordem 1 explícita: o padrão do formulário é 10, e a parte 2 entra por
  // SQL com ordem 2 — sem isso a parte 2 apareceria antes da parte 1.
  await aula.locator('input[name=ordem]').fill('1');
  await aula.locator('input[name=noTrial]').check();
  // Amostra gratuita: além de abrir a aula a quem não assinou (§6.1),
  // é ela que vira a PRÉVIA do cartão no catálogo — o trecho que roda na
  // capa quando alguém passa o mouse (docs/plano-catalogo-streaming.md).
  await aula.locator('input[name=amostraGratuita]').check();
  await aula.locator('button[type=submit]').click();
  await p.waitForURL('**/professor/cursos/aula/**', { timeout: 40000 });
  passo(p.url().includes('criada=1'), 'aula criada (em rascunho — falta o exercício)');
  const aulaId = Number(p.url().split('/aula/')[1].split('?')[0]);

  await p.setInputFiles('input[type=file][accept*="video"]',
    join(MIDIA, 'portais', 'otaviolins-adm-parte-1.mp4'));
  await p.waitForSelector('.alerta-ok:has-text("Vídeo enviado")', { timeout: 180000 });
  const { rows: [v] } = await pool.query(
    'SELECT video_provedor AS prov, video_id AS vid FROM aula WHERE id = $1', [aulaId]);
  passo(v.prov === 'LOCAL' && /^p\d+-a\d+-[0-9a-f]+\.mp4$/.test(v.vid ?? ''),
    `vídeo enviado pelo painel e vinculado à aula (${v.vid})`);

  const QUESTOES = JSON.parse(
    (await import('node:fs')).readFileSync(
      new URL('./professor-otaviolins-administrativo-aula-1.json', import.meta.url), 'utf8'),
  ).questoes;
  for (const q of QUESTOES) await cadastrarQuestao(p, q);
  const { rows: [qn] } = await pool.query(
    `SELECT count(*)::int AS n FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
      WHERE e.aula_id = $1`, [aulaId]);
  passo(qn.n === QUESTOES.length, `${qn.n} questões comentadas cadastradas pelo formulário`);

  // A regra do §5.3, agora cobrada pela aplicação: publicar só depois do
  // exercício. Antes dele, o botão recusa — e é isso que o passo prova.
  await p.reload({ waitUntil: 'load' });
  await p.locator('.cabecalho-tela form button:has-text("Publicar")').click();
  await p.waitForTimeout(1500);
  const { rows: [st] } = await pool.query('SELECT status FROM aula WHERE id = $1', [aulaId]);
  passo(st.status === 'publicado', 'aula publicada — com vídeo e exercício, como manda o §5.3');

  // A capa do curso, nos dois caminhos que ela tem. Primeiro o
  // automático: o envio do vídeo, lá em cima, já tirou um quadro dele.
  const { rows: [capaAuto] } = await pool.query(
    `SELECT capa FROM materia WHERE id = (SELECT materia_id FROM assunto s
       JOIN aula a ON a.assunto_id = s.id WHERE a.id = $1)`, [aulaId]);
  const materiaId = (await pool.query(
    `SELECT s.materia_id::int AS id FROM assunto s JOIN aula a ON a.assunto_id = s.id
      WHERE a.id = $1`, [aulaId])).rows[0].id;
  passo(/^\/api\/imagem\/p\d+-capa\d+-[0-9a-f]+\.jpg$/.test(capaAuto.capa ?? ''),
    `capa do curso saiu sozinha de um quadro do vídeo (${capaAuto.capa})`);

  // E agora o manual: o quadro acerta na média e erra feio no caso ruim
  // (slide preto, rosto no meio de uma palavra). Enviar a própria arte é
  // o que faltava — e o que o professor envia passa na frente do quadro.
  // A imagem é uma capa do blog: 1200×630, mesma proporção do cartão, e
  // já está no repositório com procedência registrada (public/capas/LEIA-ME.md).
  await p.goto(`${BASE}/professor/cursos/${materiaId}`, { waitUntil: 'load' });
  await p.setInputFiles('input[type=file][accept*="image"]',
    fileURLToPath(new URL('../../public/capas/prescricao-e-decadencia-sem-decoreba.jpg', import.meta.url)));
  await p.waitForSelector('.alerta-ok:has-text("Capa enviada")', { timeout: 40000 });
  const { rows: [capaMao] } = await pool.query('SELECT capa FROM materia WHERE id = $1', [materiaId]);
  passo(capaMao.capa !== capaAuto.capa
     && /^\/api\/imagem\/p\d+-capa\d+-[0-9a-f]+\.jpg$/.test(capaMao.capa ?? ''),
    `e foi substituída pela capa que o professor enviou (${capaMao.capa})`);

  // -------------------------------------------------------------------
  // 5. O resto do acervo por SQL (questões já escritas)
  // -------------------------------------------------------------------
  rodarSql(new URL('./professor-otaviolins-penal.sql', import.meta.url));
  rodarSql(new URL('./professor-otaviolins-administrativo-aula-2.sql', import.meta.url));
  const { rows: [acervo] } = await pool.query(
    `SELECT (SELECT count(*)::int FROM materia WHERE portal_id = p.id AND status = 'publicado') AS cursos,
            (SELECT count(*)::int FROM aula WHERE portal_id = p.id AND status = 'publicado') AS aulas,
            (SELECT count(*)::int FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
               JOIN aula a ON a.id = e.aula_id WHERE a.portal_id = p.id) AS questoes
       FROM portal p WHERE p.mascara = $1`, [MASCARA]);
  passo(acervo.cursos === 2 && acervo.aulas === 4,
    `acervo do portal: ${acervo.cursos} cursos, ${acervo.aulas} aulas, ${acervo.questoes} questões`);

  // Os vídeos das aulas que entraram por SQL vão para o volume com o nome
  // que o SQL declarou.
  const { execFileSync } = await import('node:child_process');
  for (const nome of ['otaviolins-penal-parte-1.mp4', 'otaviolins-penal-parte-2.mp4',
                      'otaviolins-adm-parte-2.mp4']) {
    execFileSync('docker', ['cp', join(MIDIA, 'portais', nome),
      `aprimoreosaber-web-1:/midia/video/${nome}`]);
  }
  passo(true, 'vídeos das aulas restantes copiados para o volume de mídia');

  // -------------------------------------------------------------------
  // 6. O portal no ar, no endereço dele
  // -------------------------------------------------------------------
  const anon = await (await b.newContext({ reducedMotion: 'reduce' })).newPage();
  await anon.goto(`${PORTAL_URL}/`, { waitUntil: 'load' });
  const corpo = await anon.locator('body').innerText();
  passo(corpo.includes('Direito Penal sem decoreba'), 'a home do portal traz a chamada do professor');
  // Pelo endereço EXATO da foto, e não "existe uma imagem de /api/imagem":
  // desde que o cartão do curso ganhou capa (tirada de um quadro do vídeo),
  // a home passou a ter mais de uma imagem servida por aquela rota, e a
  // contagem de 1 quebrava sem que nada estivesse errado.
  //
  // São DOIS agora, e cada um faz um trabalho: o avatar de 44px no selo
  // sobre a mídia do hero (é a assinatura do portal, acima da dobra) e o
  // retrato grande em "Quem ensina", que é a única seção que fala dele.
  // A abertura deixou de exibir o retrato de 220px para dar o lugar ao
  // produto em uso (docs/plano-vitrine-do-professor.md, fase 1).
  passo(await anon.locator(`.hero-selo img[src="${foto.foto}"]`).count() === 1,
    'com a foto de apresentação no selo do hero');
  passo(await anon.locator(`#sobre img[src="${foto.foto}"]`).count() === 1,
    'e em tamanho de gente na seção "quem ensina"');
  passo(corpo.includes('Direito Penal descomplicado')
     && corpo.includes('Direito Administrativo para concursos'), 'e os dois cursos no acervo');
  // Sem diferenciar maiúscula: "Quem ensina" virou o rótulo de etapa da
  // seção, e `.rotulo-etapa` é `text-transform: uppercase` — na tela lê-se
  // "QUEM ENSINA", e `innerText` devolve o que a tela mostra.
  passo(/quem ensina/i.test(corpo) && corpo.includes('Contato'), 'a seção "quem ensina" e o contato aparecem');
  const rodape = await anon.locator('footer').innerText();
  passo(rodape.includes('11.222.333/0001-81'), 'o rodapé identifica o responsável com CNPJ');
  passo((await anon.content()).includes('--primary:#0f766e'), 'e o tema usa a cor escolhida');
  passo(await anon.locator('nav a[href="/blog"]').count() === 0,
    'o blog da plataforma não aparece dentro do portal do professor');

  // A abertura mostra o PRODUTO em uso, e diz em voz alta que a tela
  // dentro da foto é encenada (CDC, art. 37 — public/imagens/LEIA-ME.md).
  passo(await anon.locator('.hero-foto img[src="/imagens/estudo-em-grupo.jpg"]').count() === 1
     && corpo.includes('Imagem ilustrativa'),
    'a abertura mostra a foto de estudo em grupo, com o selo de conteúdo ilustrativo');
  passo(await anon.locator('.vitrine-app-figura img[src="/imagens/aula-no-celular.jpg"]').count() === 1
     && corpo.includes('Tela ilustrativa do aplicativo'),
    'e o app no celular desceu para a seção do método, com o selo dele');
  // A contagem saiu dos chips flutuantes e virou a linha de números
  // embaixo dos botões: número em corpo grande, rótulo embaixo. Por isso
  // se lê `<b>` a `<b>`, e não como "2 cursos" corrido no texto da página.
  const numeros = await anon.locator('.hero-numeros b').allInnerTexts();
  passo(numeros[0] === '2' && numeros[1] === '4',
    `e a contagem do acervo na linha de números (${numeros.join(' · ')})`);

  // -------------------------------------------------------------------
  // 7. A página de cursos do portal: a vitrine, com o curso em destaque
  // -------------------------------------------------------------------
  await anon.goto(`${PORTAL_URL}/catalogo`, { waitUntil: 'load' });
  const vitrine = await anon.locator('body').innerText();
  // O banner é um CURSO, não a faixa de marca de antes: quem chega numa
  // vitrine quer ver um curso, não a descrição do catálogo. Qual curso é
  // escolha do professor — o marcado como destaque (db/043).
  passo((await anon.locator('.destaque-catalogo h1').innerText())
        .includes('Direito Penal descomplicado'),
    'a página de cursos abre no curso que o professor marcou como destaque');
  passo(vitrine.includes('Curso em destaque')
     && await anon.locator('.destaque-catalogo .destaque-fundo img').count() === 1,
    'com a capa dele em tamanho de cartaz atrás do texto');
  // A capa é a que o professor enviou; então NÃO entra a imagem de
  // reserva, e o selo de "imagem ilustrativa" não aparece no banner.
  passo(await anon.locator('.destaque-fundo img[src="/imagens/estudio-do-professor.jpg"]').count() === 0,
    'e sem a arte de reserva, porque o curso em destaque tem capa própria');
  // "Assistir agora" só existe porque este curso tem amostra gratuita
  // com vídeo — é a mesma aula que roda na prévia do cartão.
  passo(await anon.locator('.destaque-acoes a[href^="/aula/"]').count() === 1,
    'o botão "Assistir agora" leva à aula aberta, não à tela de compra');
  // O curso do banner sai da prateleira: repetido logo abaixo, apareceria
  // duas vezes na mesma dobra.
  passo(await anon.locator('.cartao-curso').count() === 1,
    'e a prateleira mostra o outro curso, sem repetir o do banner');
  // A prévia do cartão. O <video> só é baixado no hover, então o que a
  // página entrega é a CAMADA — por isso a conferência é dela, e não do
  // <video>, que ainda não existe no HTML.
  passo(await anon.locator('.cartao-curso .capa-previa').count() === 1,
    'o cartão do curso com amostra gratuita traz a camada de prévia');
  // O filtro de nível existe porque os dois cursos têm nível cadastrado.
  passo(await anon.locator('select[aria-label="Filtrar por nível"]').count() === 1
     && vitrine.includes('OAB e concursos'),
    'a barra de busca oferece o filtro de nível, com o que o professor cadastrou');
  passo(vitrine.includes('7 dias para desistir')
     && vitrine.includes('Cancelamento em 2 cliques'),
    'a faixa embaixo do banner traz as garantias verificáveis da casa');
  // O que NÃO pode estar lá: o layout de referência trazia nota "5.0",
  // "1.420 avaliações", "4K HDR" e "modo offline". Nenhum deles é coisa
  // que este banco saiba responder (CDC, art. 37).
  passo(!/avaliações|4K HDR|offline/i.test(vitrine),
    'e nenhum número ou recurso inventado — nota, avaliações, 4K, offline');
  // "Lançamento em ondas" promete uma onda nova a cada duas semanas. É
  // promessa da PLATAFORMA; dentro do portal ela sobraria para o
  // professor cumprir — e para o nosso suporte responder.
  passo(!vitrine.includes('Lançamento em ondas'),
    'e sem a caixa de ondas, que é promessa da plataforma');

  await anon.goto(`${BASE}/catalogo`, { waitUntil: 'load' });
  passo((await anon.locator('body').innerText()).includes('Lançamento em ondas'),
    'na plataforma, a caixa de ondas continua onde estava');
  passo((await anon.locator('body').innerText()).includes('professores parceiros'),
    'o curso compartilhado aparece na vitrine da plataforma');
  await anon.context().close();
} catch (err) {
  passo(false, `erro: ${err.message}`);
  await p.screenshot({ path: join(MIDIA, 'falha-professor.png'), fullPage: true }).catch(() => {});
}

await fim(b);
