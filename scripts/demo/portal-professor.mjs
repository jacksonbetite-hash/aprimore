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
import {
  BASE, PORTA, MIDIA, pool, passo, fim, abrirNavegador, webhook, rodarSql,
  esperarOk, preencher, cadastrarQuestao,
} from './_comum.mjs';

const MASCARA = 'otaviolins';
const EMAIL = 'otavio.lins@exemplo.com.br';
const SENHA = 'aulas-de-penal-2026';
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
  passo(await anon.locator('img[src^="/api/imagem/"]').count() === 1, 'com a foto de apresentação');
  passo(corpo.includes('Direito Penal descomplicado')
     && corpo.includes('Direito Administrativo para concursos'), 'e os dois cursos no acervo');
  passo(corpo.includes('Quem ensina') && corpo.includes('Contato'), 'a seção "quem ensina" e o contato aparecem');
  const rodape = await anon.locator('footer').innerText();
  passo(rodape.includes('11.222.333/0001-81'), 'o rodapé identifica o responsável com CNPJ');
  passo((await anon.content()).includes('--primary:#0f766e'), 'e o tema usa a cor escolhida');
  passo(await anon.locator('nav a[href="/blog"]').count() === 0,
    'o blog da plataforma não aparece dentro do portal do professor');

  await anon.goto(`${BASE}/catalogo`, { waitUntil: 'load' });
  passo((await anon.locator('body').innerText()).includes('professores parceiros'),
    'o curso compartilhado aparece na vitrine da plataforma');
  await anon.context().close();
} catch (err) {
  passo(false, `erro: ${err.message}`);
  await p.screenshot({ path: join(MIDIA, 'falha-professor.png'), fullPage: true }).catch(() => {});
}

await fim(b);
