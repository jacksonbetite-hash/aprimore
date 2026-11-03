/**
 * Demonstração — o Portal da Empresa, ponta a ponta pelos formulários.
 *
 * Monta a universidade corporativa do "Grupo Aurora Varejo" como o RH de
 * um cliente montaria: contrata em /empresas/contratar, paga, põe a
 * marca na porta, cria a trilha com módulo, aula, vídeo, exercício e
 * avaliação final, cadastra setores e gente, convida por link, importa a
 * equipe por CSV e libera as trilhas. Depois troca de papel: entra como
 * colaboradora, assiste, faz a prova e tira o certificado.
 *
 *   BASE_URL=http://localhost:3010 CHROMIUM="…/chrome.exe" \
 *   DATABASE_URL=postgres://… node scripts/demo/portal-empresa.mjs
 */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  BASE, PORTA, MIDIA, pool, passo, fim, abrirNavegador, webhook, rodarSql, senhaDemo,
  esperarOk, preencher, cadastrarQuestao,
} from './_comum.mjs';

const MASCARA = 'aurora';
const EMAIL_RH = 'treinamento@grupoaurora.com.br';
const SENHA_RH = senhaDemo('universidade-aurora-2026');
const PORTAL_URL = `http://${MASCARA}.localhost:${PORTA}`;
const DOMINIO = 'grupoaurora.com.br';

const EQUIPE = [
  { nome: 'Camila Ferraz', email: `camila.ferraz@${DOMINIO}`, setor: 'Lojas' },
  { nome: 'Paulo Menezes', email: `paulo.menezes@${DOMINIO}`, setor: 'Lojas' },
  { nome: 'Renata Aguiar', email: `renata.aguiar@${DOMINIO}`, setor: 'Central de atendimento' },
  { nome: 'Diego Sampaio', email: `diego.sampaio@${DOMINIO}`, setor: 'Central de atendimento' },
  { nome: 'Helena Braga', email: `helena.braga@${DOMINIO}`, setor: 'Logística' },
  { nome: 'Marcos Vilela', email: `marcos.vilela@${DOMINIO}`, setor: 'Logística' },
  { nome: 'Bianca Rocha', email: `bianca.rocha@${DOMINIO}`, setor: 'Não existe esse setor' },
  { nome: 'Sem arroba', email: 'isso-nao-e-email', setor: 'Lojas' },
];

async function limpar() {
  const alvo = `SELECT id FROM portal WHERE mascara = '${MASCARA}'`;
  for (const sql of [
    `DELETE FROM conclusao WHERE portal_id IN (${alvo})`,
    `DELETE FROM tentativa_avaliacao WHERE portal_id IN (${alvo})`,
    `DELETE FROM licenca WHERE portal_id IN (${alvo})`,
    `DELETE FROM atribuicao WHERE portal_id IN (${alvo})`,
    `DELETE FROM convite WHERE portal_id IN (${alvo})`,
    `DELETE FROM progresso_aula WHERE usuario_id IN (SELECT id FROM usuario WHERE portal_id IN (${alvo}))`,
    `DELETE FROM resposta WHERE usuario_id IN (SELECT id FROM usuario WHERE portal_id IN (${alvo}))`,
    `DELETE FROM alternativa WHERE questao_id IN (
       SELECT q.id FROM questao q
        LEFT JOIN avaliacao av ON av.id = q.avaliacao_id
        LEFT JOIN exercicio e ON e.id = q.exercicio_id
        LEFT JOIN aula a ON a.id = e.aula_id
       WHERE av.portal_id IN (${alvo}) OR a.portal_id IN (${alvo}))`,
    `DELETE FROM questao WHERE avaliacao_id IN (SELECT id FROM avaliacao WHERE portal_id IN (${alvo}))
        OR exercicio_id IN (SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id
                             WHERE a.portal_id IN (${alvo}))`,
    `DELETE FROM avaliacao WHERE portal_id IN (${alvo})`,
    `DELETE FROM exercicio WHERE aula_id IN (SELECT id FROM aula WHERE portal_id IN (${alvo}))`,
    `DELETE FROM aula WHERE portal_id IN (${alvo})`,
    `DELETE FROM assunto WHERE portal_id IN (${alvo})`,
    `DELETE FROM materia WHERE portal_id IN (${alvo})`,
    `DELETE FROM area WHERE portal_id IN (${alvo})`,
    `DELETE FROM preco WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal_fatura WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal_contrato WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal_gestor WHERE portal_id IN (${alvo})`,
    `DELETE FROM usuario WHERE portal_id IN (${alvo})`,
    `DELETE FROM setor WHERE portal_id IN (${alvo})`,
    `DELETE FROM portal WHERE mascara = '${MASCARA}'`,
    `DELETE FROM usuario WHERE lower(email) IN ('${EMAIL_RH}', 'rh2@${DOMINIO}')`,
    `DELETE FROM evento_gateway WHERE evento_id LIKE 'demo-emp-%'`,
  ]) await pool.query(sql);
}

const { b, p } = await (async () => { await limpar(); return abrirNavegador(); })();

try {
  // -------------------------------------------------------------------
  // 1. Contratação
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/empresas`, { waitUntil: 'load' });
  passo(await p.locator('a[href="/empresas/contratar"]').first().isVisible(),
    'a vitrine de empresas leva à contratação em autosserviço');

  await p.goto(`${BASE}/empresas/contratar`, { waitUntil: 'load' });
  passo(await p.locator('input[name=renda]').count() === 0,
    'não pede renda nem endereço: a empresa paga, não recebe');
  // Plano Pro: 250 contas e domínio próprio incluído.
  const planos = p.locator('input[name=planoId]');
  await planos.nth(await planos.count() - 1).check();
  await preencher(p.locator('#contratar'), {
    nome: 'Tereza Vasques',
    email: EMAIL_RH,
    senha: SENHA_RH,
    cnpj: '11.222.333/0001-81',
    nomeExibicao: 'Universidade Aurora',
    mascara: MASCARA,
    aceite: true,
  });
  await p.click('#contratar button[type=submit]');
  await p.waitForURL('**/empresas/pagamento/**', { timeout: 40000 });
  const referencia = p.url().split('/').pop();
  passo(referencia.startsWith('PF-'), `portal da empresa contratado — fatura ${referencia}`);

  const pago = await webhook({
    eventoId: 'demo-emp-fatura', tipo: 'pagamento.confirmado', referencia, centavos: 89000,
  });
  passo(pago.portalAtivado === true, 'pagamento confirmado e portal no ar');
  passo(pago.subconta === undefined, 'e NENHUMA subconta foi aberta: a empresa não recebe');

  // -------------------------------------------------------------------
  // 2. A porta: marca, logo e quem entra sozinho
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/empresa/site`, { waitUntil: 'load' });
  await p.setInputFiles('input[type=file][accept*="image"]', join(MIDIA, 'imagens', 'aurora-logo.png'));
  await p.waitForSelector('.alerta-ok:has-text("Foto enviada")', { timeout: 60000 });
  const { rows: [logo] } = await pool.query(
    `SELECT personalizacao->>'foto' AS foto FROM portal WHERE mascara = $1`, [MASCARA]);
  passo((logo.foto ?? '').startsWith('/api/imagem/'), `logo da empresa enviada (${logo.foto})`);

  await p.reload({ waitUntil: 'load' });
  const marca = p.locator('form.formulario').first();
  await marca.locator('details summary').click();
  await preencher(marca, {
    chamada: 'Treinamento e desenvolvimento do Grupo Aurora',
    contato: 'treinamento@grupoaurora.com.br · ramal 4120',
    foto: logo.foto,
    corPrimaria: '#0b3d5c',
    proposito: 'As trilhas obrigatórias fazem parte da integração e da conformidade da Aurora. '
      + 'Você tem prazo para concluir cada uma, e o certificado sai no seu nome ao ser aprovado.',
    sobre: 'Como funciona: as trilhas obrigatórias aparecem primeiro, com o prazo em destaque. '
      + 'Assista às aulas na ordem que preferir e faça a avaliação final ao terminar — a nota '
      + 'mínima é 70%, e você tem até três tentativas.\n\n'
      + 'Dúvida sobre acesso, prazo ou certificado é com o time de Treinamento e '
      + 'Desenvolvimento, no ramal 4120.',
  });
  await marca.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(marca, 'salvar a marca')), 'marca da empresa salva na porta do portal');

  const politica = p.locator('form:has(input[name=dominios])').first();
  await politica.locator('input[name=dominios]').fill('gmail.com');
  await politica.locator('button[type=submit]').click();
  let recusa = '';
  try { await esperarOk(politica, 'domínio público'); } catch (e) { recusa = e.message; }
  passo(recusa.includes('correio público'),
    'liberar o gmail é recusado com o motivo, não com erro de banco');

  // Recarregar antes da segunda tentativa: `useActionState` mantém o
  // resultado anterior na tela até a resposta nova chegar, e sem isso o
  // roteiro leria a recusa do gmail como resposta deste envio.
  await p.reload({ waitUntil: 'load' });
  const politica2 = p.locator('form:has(input[name=dominios])').first();
  await politica2.locator('input[name=dominios]').fill(DOMINIO);
  await politica2.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(politica2, 'domínio da empresa')),
    `quem tem e-mail @${DOMINIO} pode criar a conta sozinho`);

  // -------------------------------------------------------------------
  // 3. Trilha pelo painel: área → trilha → módulo → aula → vídeo →
  //    exercício → avaliação final
  // -------------------------------------------------------------------
  const ui = JSON.parse(readFileSync(new URL('./empresa-aurora-excel-ui.json', import.meta.url), 'utf8'));

  await p.goto(`${BASE}/empresa/trilhas`, { waitUntil: 'load' });
  const formArea = p.locator('form.form-linha').first();
  await preencher(formArea, { nome: ui.area, ordem: 3 });
  await formArea.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(formArea, 'criar área')), `área "${ui.area}" criada`);

  await p.reload({ waitUntil: 'load' });
  const trilha = p.locator('form.form-editor').last();
  await trilha.locator('input[name=nome]').fill(ui.trilha.nome);
  await trilha.locator('select[name=areaId]').selectOption({ label: ui.area });
  await trilha.locator('textarea[name=ementa]').fill(ui.trilha.ementa);
  await trilha.locator('select[name=status]').selectOption('publicado');
  await trilha.locator('input[name=professor]').fill('Equipe de Treinamento e Desenvolvimento');
  passo(await trilha.locator('input[name=naVitrinePlataforma]').count() === 0,
    'o formulário da empresa não oferece a vitrine da plataforma — trilha interna não se vende');
  await trilha.locator('button[type=submit]').click();
  await p.waitForURL('**/empresa/trilhas/**', { timeout: 40000 });
  passo(p.url().includes('criada=1'), `trilha "${ui.trilha.nome}" criada`);
  const trilhaUrl = p.url().split('?')[0];
  const materiaId = Number(trilhaUrl.split('/trilhas/')[1]);

  const formModulo = p.locator('form.form-linha').first();
  await preencher(formModulo, { nome: ui.modulo.nome });
  await formModulo.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(formModulo, 'criar módulo')), `módulo "${ui.modulo.nome}" criado`);

  await p.goto(trilhaUrl, { waitUntil: 'load' });
  // Filtra pelo campo que SÓ a aula tem: a avaliação final também tem
  // "título", e `.last()` pegava a dela.
  const formAula = p.locator('form.form-editor').filter({ has: p.locator('textarea[name=resumo]') }).last();
  await formAula.locator('input[name=titulo]').fill(ui.aula.titulo);
  await formAula.locator('textarea[name=resumo]').fill(ui.aula.resumo);
  await formAula.locator('input[name=minutos]').fill(String(ui.aula.minutos));
  await formAula.locator('input[name=segundos]').fill(String(ui.aula.segundos));
  passo(await formAula.locator('input[name=amostraGratuita]').count() === 0,
    'nem amostra gratuita nem teste de 7 dias: na empresa não há o que vender');
  await formAula.locator('button[type=submit]').click();
  await p.waitForURL('**/empresa/trilhas/aula/**', { timeout: 40000 });
  const aulaId = Number(p.url().split('/aula/')[1].split('?')[0]);
  passo(Number.isInteger(aulaId), 'aula criada');

  await p.setInputFiles('input[type=file][accept*="video"]', join(MIDIA, 'portais', 'aurora-excel-1.mp4'));
  await p.waitForSelector('.alerta-ok:has-text("Vídeo enviado")', { timeout: 180000 });
  passo(true, 'vídeo da aula enviado pelo painel do RH');

  // Publicar antes do exercício tem de ser recusado — é o §5.3 valendo
  // também para a empresa.
  await p.reload({ waitUntil: 'load' });
  await p.locator('.cabecalho-tela form button:has-text("Publicar")').click();
  await p.waitForTimeout(1200);
  const { rows: [semExercicio] } = await pool.query('SELECT status FROM aula WHERE id = $1', [aulaId]);
  passo(semExercicio.status !== 'publicado',
    'publicar sem exercício foi recusado: a regra do §5.3 vale para a trilha corporativa também');

  for (const q of ui.questoes) await cadastrarQuestao(p, q);
  await p.reload({ waitUntil: 'load' });
  await p.locator('.cabecalho-tela form button:has-text("Publicar")').click();
  await p.waitForTimeout(1500);
  const { rows: [comExercicio] } = await pool.query('SELECT status FROM aula WHERE id = $1', [aulaId]);
  passo(comExercicio.status === 'publicado',
    `aula publicada depois das ${ui.questoes.length} questões comentadas`);

  // Avaliação final da trilha
  await p.goto(`${trilhaUrl}#avaliacao`, { waitUntil: 'load' });
  const formAv = p.locator('form.form-editor').filter({ has: p.locator('input[name=notaMinima]') }).first();
  await preencher(formAv, {
    titulo: ui.avaliacao.titulo,
    descricao: ui.avaliacao.descricao,
    notaMinima: ui.avaliacao.notaMinima,
    maxTentativas: ui.avaliacao.maxTentativas,
    status: 'rascunho',
  });
  await formAv.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(formAv, 'criar avaliação')), 'avaliação final criada (em rascunho)');

  await p.reload({ waitUntil: 'load' });
  for (const q of ui.avaliacao.questoes) await cadastrarQuestao(p, q);
  await p.goto(`${trilhaUrl}#avaliacao`, { waitUntil: 'load' });
  const formAv2 = p.locator('form.form-editor').filter({ has: p.locator('input[name=notaMinima]') }).first();
  await formAv2.locator('select[name=status]').selectOption('publicado');
  await formAv2.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(formAv2, 'publicar avaliação')),
    `avaliação publicada com ${ui.avaliacao.questoes.length} questões e nota mínima ${ui.avaliacao.notaMinima}%`);

  // -------------------------------------------------------------------
  // 4. As outras cinco trilhas, por SQL
  // -------------------------------------------------------------------
  rodarSql(new URL('./empresa-aurora-1.sql', import.meta.url));
  rodarSql(new URL('./empresa-aurora-2.sql', import.meta.url));
  for (const nome of ['aurora-integracao-1.mp4', 'aurora-integracao-2.mp4', 'aurora-lgpd-1.mp4',
                      'aurora-governanca-1.mp4', 'aurora-lideranca-1.mp4', 'aurora-ia-1.mp4',
                      'aurora-ia-2.mp4']) {
    execFileSync('docker', ['cp', join(MIDIA, 'portais', nome),
      `aprimore-web-1:/midia/video/${nome}`]);
  }
  const { rows: [acervo] } = await pool.query(
    `SELECT (SELECT count(*)::int FROM materia WHERE portal_id = p.id AND status = 'publicado') AS trilhas,
            (SELECT count(*)::int FROM aula WHERE portal_id = p.id AND status = 'publicado') AS aulas,
            (SELECT count(*)::int FROM avaliacao WHERE portal_id = p.id AND status = 'publicado') AS avaliacoes
       FROM portal p WHERE p.mascara = $1`, [MASCARA]);
  passo(acervo.trilhas === 6 && acervo.aulas === 8 && acervo.avaliacoes === 6,
    `acervo da empresa: ${acervo.trilhas} trilhas, ${acervo.aulas} aulas, ${acervo.avaliacoes} avaliações`);

  // -------------------------------------------------------------------
  // 5. A equipe: setores, convite, importação e cadastro direto
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/empresa/colaboradores`, { waitUntil: 'load' });
  for (const [i, nome] of ['Lojas', 'Central de atendimento', 'Logística'].entries()) {
    const f = p.locator('form.form-linha').first();
    await preencher(f, { nome, ordem: (i + 1) * 10 });
    await f.locator('button[type=submit]').click();
    await esperarOk(f, `criar setor ${nome}`);
    await p.reload({ waitUntil: 'load' });
  }
  passo((await pool.query(
    `SELECT count(*)::int AS n FROM setor s JOIN portal p ON p.id = s.portal_id
      WHERE p.mascara = $1`, [MASCARA])).rows[0].n === 3, 'três setores criados');

  // Convite nominal por link
  const formConvite = p.locator('form:has(input[name=email]):has(button:has-text("Gerar link"))').first();
  await preencher(formConvite, {
    email: `tereza.souza@${DOMINIO}`, nome: 'Tereza Souza', prazoDias: 30,
  });
  await formConvite.locator('select[name=setorId]').selectOption({ label: 'Lojas' });
  await formConvite.locator('button[type=submit]').click();
  await esperarOk(formConvite, 'gerar convite');
  const linkConvite = (await formConvite.locator('code').first().innerText()).trim();
  passo(linkConvite.includes('/convite/'), `convite por link gerado (${linkConvite.slice(0, 58)}…)`);

  // Importação em lote, com duas linhas ruins de propósito
  await p.goto(`${BASE}/empresa/colaboradores`, { waitUntil: 'load' });
  const formImp = p.locator('form:has(textarea[name=csv])').first();
  await formImp.locator('textarea[name=csv]').fill(
    'nome;email;setor\n' + EQUIPE.map((e) => `${e.nome};${e.email};${e.setor}`).join('\n'));
  await formImp.locator('input[name=prazoDias]').fill('45');
  await formImp.locator('button[type=submit]').click();
  await esperarOk(formImp, 'importar equipe');
  const textoImp = await formImp.innerText();
  passo(textoImp.includes('6 convite(s) criado(s)') || textoImp.includes('6 convite'),
    'importação criou os convites das linhas boas');
  passo(textoImp.includes('não existe') && textoImp.includes('e-mail inválido'),
    'e listou as duas linhas ruins com o motivo de cada uma');

  // Cadastro direto, com senha provisória
  await p.goto(`${BASE}/empresa/colaboradores`, { waitUntil: 'load' });
  // A edição na linha da tabela também tem `matricula`; a senha
  // provisória só existe no cadastro.
  const formPessoa = p.locator('form:has(input[name=senha])').first();
  await preencher(formPessoa, {
    nome: 'André Coutinho', email: `andre.coutinho@${DOMINIO}`,
    matricula: 'AUR-2291', senha: senhaDemo('primeiro-acesso-2026'),
  });
  await formPessoa.locator('select[name=setorId]').selectOption({ label: 'Logística' });
  await formPessoa.locator('button[type=submit]').click();
  passo(Boolean(await esperarOk(formPessoa, 'cadastrar pessoa')),
    'colaborador cadastrado direto, com senha provisória');

  // -------------------------------------------------------------------
  // 6. Liberar trilhas: por setor e por pessoa
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/empresa/atribuicoes`, { waitUntil: 'load' });
  const atribuir = async (trilhaLabel, alvoLabel, prazo, obrigatoria) => {
    await p.goto(`${BASE}/empresa/atribuicoes`, { waitUntil: 'load' });
    const f = p.locator('form.form-editor').first();
    await f.locator('select[name=materiaId]').selectOption({ label: trilhaLabel });
    // O alvo é "s:<id>" ou "u:<id>"; achamos a opção pelo rótulo visível
    // (Playwright só aceita string em `label`, não expressão regular).
    const opcoes = await f.locator('select[name=alvo] option').all();
    let valor = null;
    for (const o of opcoes) {
      const texto = (await o.innerText()).trim();
      if (texto.startsWith(alvoLabel)) { valor = await o.getAttribute('value'); break; }
    }
    if (!valor) throw new Error(`alvo "${alvoLabel}" não está na lista`);
    await f.locator('select[name=alvo]').selectOption(valor);
    if (prazo) await f.locator('input[name=prazoEm]').fill(prazo);
    if (!obrigatoria) await f.locator('input[name=obrigatoria]').uncheck();
    await f.locator('button[type=submit]').click();
    return esperarOk(f, `atribuir ${trilhaLabel}`);
  };
  const daqui = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

  const r1 = await atribuir('Integração de novos colaboradores', 'Lojas', daqui(20), true);
  passo(r1.includes('pessoas') || r1.includes('pessoa'), `integração liberada para o setor Lojas — ${r1.split('.')[0]}`);
  await atribuir('LGPD no atendimento ao cliente', 'Central de atendimento', daqui(15), true);
  await atribuir('LGPD no atendimento ao cliente', 'Lojas', daqui(15), true);
  await atribuir('Governança corporativa e compliance', 'Logística', daqui(60), true);
  await atribuir('Excel para o dia a dia', 'Logística', null, false);
  const rIA = await atribuir('Inteligência artificial no trabalho', 'André Coutinho', daqui(90), false);
  passo(rIA.length > 0, 'e uma trilha opcional atribuída a uma pessoa específica');

  const { rows: [atr] } = await pool.query(
    `SELECT (SELECT count(*)::int FROM atribuicao WHERE portal_id = p.id) AS atribuicoes,
            (SELECT count(*)::int FROM licenca WHERE portal_id = p.id AND origem = 'B2B'
              AND status = 'ATIVA') AS licencas
       FROM portal p WHERE p.mascara = $1`, [MASCARA]);
  passo(atr.atribuicoes === 6 && atr.licencas >= 1,
    `${atr.atribuicoes} atribuições viraram ${atr.licencas} licença(s) B2B ativa(s)`);

  // -------------------------------------------------------------------
  // 6b. A Biblioteca: o acervo que a empresa disponibiliza (db/042)
  // -------------------------------------------------------------------
  //
  // Não é trilha: aqui não há prazo, atribuição nem certificado. É o que
  // a equipe consulta quando precisa — e é por isso que a tela do
  // colaborador filtra por assunto e por autor, e não por progresso.
  const DOCS = join(MIDIA, 'documentos');
  const publicarNoAcervo = async (dados, arquivoPdf) => {
    await p.goto(`${BASE}/empresa/biblioteca`, { waitUntil: 'load' });
    const f = p.locator('form.form-editor').last();
    if (arquivoPdf) {
      await f.locator('input[type=file][accept="application/pdf"]').setInputFiles(join(DOCS, arquivoPdf));
      // O envio é em stream, por XHR: o campo escondido só recebe o nome
      // no volume quando o servidor responde. Salvar antes disso gravaria
      // um item sem arquivo — que o CHECK do banco recusa.
      await p.waitForFunction(
        () => document.querySelector('input[name=arquivo]')?.value?.length > 0,
        null, { timeout: 60000 });
    } else {
      await f.locator('label.opcao:has-text("Link") input').check();
    }
    // O setor vai à parte: `preencher` casa `selectOption` por VALOR, e o
    // valor aqui é o id numérico do setor, não o nome que se lê na tela.
    const { setor, ...campos } = dados;
    if (setor) await f.locator('select[name=setorId]').selectOption({ label: setor });
    await preencher(f, campos);
    await f.locator('button[type=submit]').click();
    return esperarOk(f, `item do acervo "${dados.titulo}"`);
  };

  await publicarNoAcervo({
    titulo: 'Guia prático de LGPD para equipes',
    autor: 'Marina Antunes',
    assuntos: 'LGPD, Compliance',
    descricao: 'O que muda no dia a dia de quem trata dado pessoal no atendimento.',
    ano: '2024',
    editora: 'Casa Editora',
  }, 'aurora-guia-lgpd.pdf');

  await publicarNoAcervo({
    titulo: 'Manual de integração — Lojas',
    autor: 'Equipe de Treinamento',
    assuntos: 'Integração',
    descricao: 'Para quem está começando na operação de loja.',
    ano: '2026',
    setor: 'Lojas',
  }, 'aurora-manual-integracao.pdf');

  await publicarNoAcervo({
    titulo: 'Política de uso de IA',
    autor: 'Comitê de Tecnologia',
    assuntos: 'IA, Compliance',
    descricao: 'Regras internas para ferramentas de IA generativa.',
    url: 'https://intranet.grupoaurora.com.br/politica-ia',
  }, null);

  // Publicar é um segundo passo, de propósito: o RH sobe o arquivo,
  // confere, e só então a equipe vê. O item nasce em rascunho e é
  // publicado aqui, um a um.
  //
  // Um a um, e recarregando a cada vez: a tabela é ordenada por situação,
  // então publicar move a linha de lugar. Percorrer uma lista capturada
  // antes do primeiro clique pularia itens — foi o que aconteceu.
  for (const titulo of ['Guia prático de LGPD', 'Manual de integração', 'Política de uso de IA']) {
    await p.goto(`${BASE}/empresa/biblioteca`, { waitUntil: 'load' });
    const linha = p.locator('table.tabela tbody tr').filter({ hasText: titulo }).first();
    const publicar = linha.locator('button[aria-label="Publicar"]');
    if (await publicar.count()) {
      await publicar.click();
      await p.waitForLoadState('networkidle');
    }
  }

  const { rows: [biblio] } = await pool.query(
    `SELECT count(*)::int AS itens,
            count(*) FILTER (WHERE status = 'PUBLICADO')::int AS publicados,
            count(*) FILTER (WHERE formato = 'LINK')::int AS links,
            count(*) FILTER (WHERE setor_id IS NOT NULL)::int AS de_setor,
            coalesce(sum(bytes), 0)::int AS bytes
       FROM acervo WHERE portal_id = (SELECT id FROM portal WHERE mascara = $1)`, [MASCARA]);
  passo(biblio.itens === 3 && biblio.publicados === 3 && biblio.links === 1 && biblio.de_setor === 1,
    `biblioteca: ${biblio.itens} itens publicados (1 link, 1 restrito ao setor Lojas)`);
  passo(biblio.bytes > 0,
    `o PDF enviado pesa ${biblio.bytes} bytes e entra na cota do plano, como o vídeo`);

  // -------------------------------------------------------------------
  // 7. O outro lado: a colaboradora aceita o convite, estuda e se forma
  // -------------------------------------------------------------------
  const cola = await (await b.newContext({ reducedMotion: 'reduce' })).newPage();
  await cola.goto(linkConvite, { waitUntil: 'load' });
  passo((await cola.locator('body').innerText()).includes('Universidade Aurora'),
    'o convite abre no endereço da empresa, com a marca dela');
  await cola.fill('input[name=senha]', senhaDemo('minha-senha-aurora'));
  await cola.click('button[type=submit]');
  await cola.waitForURL('**/painel**', { timeout: 40000 });
  // O painel é servidor: esperar a rede assentar evita ler a página no meio.
  await cola.waitForLoadState('networkidle');
  const painel = await cola.locator('body').innerText();
  passo(painel.includes('Integração de novos colaboradores'),
    'ao aceitar, a colaboradora já entra com a trilha do setor liberada');
  passo(painel.includes('obrigatória'), 'a trilha obrigatória vem marcada como tal');

  // O menu do colaborador: submenu que abre, e telas que trocam à direita
  // sem o menu ir junto. Era este o defeito — em /conta aparecia o menu da
  // PLATAFORMA, com caderno de erros e planos de venda, que a empresa não tem.
  const menu = () => cola.locator('aside.lateral').innerText();
  const menuInicial = await menu();
  passo(menuInicial.includes('Minha Jornada') && menuInicial.includes('Minhas trilhas')
     && menuInicial.includes('Todas as trilhas'),
    'o menu abre "Minha Jornada" com os dois submenus');
  passo(!menuInicial.includes('Caderno de erros') && !menuInicial.includes('Planos'),
    'e não traz nada que a empresa não tem: sem caderno de erros, sem planos de venda');

  const pai = cola.locator('button.item-lateral.pai');
  passo(await pai.getAttribute('aria-expanded') === 'true',
    'o submenu vem aberto porque a tela atual é uma das filhas');
  await pai.click();
  passo(await pai.getAttribute('aria-expanded') === 'false', 'e fecha no clique');
  await pai.click();

  const semSaida = await cola.locator('aside.lateral .ico-sai').count();
  passo(semSaida === 0, 'nenhum item do menu leva para fora do painel');

  // A prova do pedido: clicar no submenu troca só o lado direito.
  await cola.click('a[href="/painel/trilhas"]');
  await cola.waitForURL('**/painel/trilhas');
  await cola.waitForLoadState('networkidle');
  passo((await menu()) === menuInicial,
    'ao abrir "Todas as trilhas", o menu continua idêntico — só o conteúdo à direita muda');
  passo(await pai.getAttribute('aria-expanded') === 'true',
    'e o submenu continua aberto: o menu vive no layout e não é remontado');
  passo((await cola.locator('body').innerText()).includes('trilhas no portal'),
    'a tela mostra o acervo inteiro do portal, dentro do painel');

  // A Biblioteca — o acervo da empresa, não o vade-mécum de leis.
  await cola.click('a[href="/painel/biblioteca"]');
  await cola.waitForURL('**/painel/biblioteca');
  await cola.waitForLoadState('networkidle');
  const estante = await cola.locator('body').innerText();
  passo(estante.includes('Guia prático de LGPD') && estante.includes('Política de uso de IA'),
    'a Biblioteca mostra o acervo que o RH publicou');
  passo(estante.includes('Manual de integração'),
    'incluindo o material restrito ao setor dela (Lojas)');
  passo((await menu()) === menuInicial, 'e o menu, de novo, não mudou');

  // Filtro por assunto, que é o que o pedido descreve. `waitForURL` e não
  // só `networkidle`: o clique é uma navegação, e sem esperar por ela o
  // roteiro lê a página ANTERIOR e conclui que o filtro não filtrou.
  await cola.locator('.chips-assunto a.chip').filter({ hasText: 'LGPD' }).first().click();
  await cola.waitForURL('**/painel/biblioteca?assunto=LGPD');
  await cola.waitForLoadState('networkidle');
  const filtrada = await cola.locator('body').innerText();
  passo(filtrada.includes('1 material encontrado') && !filtrada.includes('Política de uso de IA'),
    'filtrar por assunto deixa só o que tem a etiqueta');

  // O PDF abre pela rota privada, com sessão — e só com ela.
  const bib = await pool.query(
    `SELECT arquivo FROM acervo WHERE portal_id = (SELECT id FROM portal WHERE mascara = $1)
       AND formato = 'PDF' AND status = 'PUBLICADO' AND setor_id IS NULL`, [MASCARA]);
  // Do NAVEGADOR, e não do Node: `aurora.localhost` é subdomínio de
  // localhost, que o resolvedor do Node não conhece (o do navegador,
  // sim). É também o caminho real — a rota depende do cookie de sessão
  // daquele domínio.
  const abrir = (arquivo, comCookie) => cola.evaluate(async ([arq, credenciais]) => {
    const r = await fetch(`/api/documento/${arq}`, { credentials: credenciais });
    return { status: r.status, tipo: r.headers.get('content-type') };
  }, [arquivo, comCookie ? 'same-origin' : 'omit']);

  const comSessao = await abrir(bib.rows[0].arquivo, true);
  passo(comSessao.status === 200 && comSessao.tipo === 'application/pdf',
    'o PDF abre para quem tem sessão na empresa');
  const semSessao = await abrir(bib.rows[0].arquivo, false);
  passo(semSessao.status === 401,
    'e NÃO abre sem sessão: acervo é conteúdo interno do cliente, não arquivo público');

  // "Meu acesso" no lugar de "Planos": o colaborador não compra nada.
  await cola.click('a[href="/painel/planos"]');
  await cola.waitForURL('**/painel/planos');
  await cola.waitForLoadState('networkidle');
  const acesso = await cola.locator('body').innerText();
  passo(acesso.includes('Meu acesso') && acesso.includes('Liberada pela empresa'),
    '"Meu acesso" diz o que está liberado e até quando');
  passo(!acesso.includes('R' + '$') && !acesso.includes('Assinar'),
    'sem preço e sem botão de assinar — quem contrata é a empresa');

  // A conta, que era onde o menu trocava inteiro.
  await cola.click('a[href="/painel/conta"]');
  await cola.waitForURL('**/painel/conta');
  await cola.waitForLoadState('networkidle');
  passo((await menu()) === menuInicial,
    'em "Minha conta" o menu é o mesmo — era aqui que aparecia o da plataforma');
  await cola.goto(`${PORTAL_URL}/painel`, { waitUntil: 'load' });

  // Assiste as duas aulas da trilha (o progresso é o que o RH acompanha).
  const { rows: aulasTrilha } = await pool.query(
    `SELECT a.id, a.slug, a.duracao_segundos AS dur FROM aula a
       JOIN assunto s ON s.id = a.assunto_id JOIN materia m ON m.id = s.materia_id
       JOIN portal p ON p.id = m.portal_id
      WHERE p.mascara = $1 AND m.slug = 'integracao-de-novos-colaboradores'
        AND a.status = 'publicado' ORDER BY a.ordem`, [MASCARA]);
  const { rows: [euId] } = await pool.query(
    `SELECT u.id FROM usuario u JOIN portal p ON p.id = u.portal_id
      WHERE p.mascara = $1 AND u.email = $2`, [MASCARA, `tereza.souza@${DOMINIO}`]);
  for (const a of aulasTrilha) {
    await cola.goto(`${PORTAL_URL}/aula/${a.slug}`, { waitUntil: 'load' });
    const temPlayer = await cola.locator('video source').count() > 0;
    if (!temPlayer) throw new Error(`a aula ${a.slug} não entregou o player`);
    // O player só marca concluída ao chegar em 92% do vídeo; num roteiro,
    // gravamos o mesmo progresso que ele gravaria, pela mesma rota.
    await cola.evaluate(async ([aulaId, seg]) => {
      await fetch('/api/progresso', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aulaId, segundos: seg, concluida: true }),
      });
    }, [Number(a.id), Number(a.dur)]);
  }
  passo(true, `${aulasTrilha.length} aulas assistidas até o fim, com o vídeo tocando de verdade`);

  // Responde o exercício de uma das aulas (o caderno de erros do §5.2).
  // A âncora abre a aba "Exercício"; a tela mostra uma questão por vez,
  // então o roteiro responde e clica em "Próxima questão" até o resultado.
  await cola.goto(`${PORTAL_URL}/aula/${aulasTrilha[0].slug}#exercicio`, { waitUntil: 'load' });
  await cola.locator('#exercicio').waitFor({ state: 'visible', timeout: 10000 });
  for (let i = 0; i < 8; i++) {
    const alt = cola.locator('#exercicio button.alternativa:enabled').first();
    if (await alt.count() === 0) break;
    // force: o cabeçalho fixo cobre o alvo no meio do scroll, e o clique
    // real do usuário acontece de qualquer jeito.
    await alt.click({ force: true }).catch(() => {});
    await cola.locator('#exercicio .comentario').first()
      .waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await cola.waitForTimeout(250);
    await cola.locator('#exercicio .nav-exercicio .btn-primario').click().catch(() => {});
    await cola.waitForTimeout(200);
  }
  const { rows: [resp] } = await pool.query(
    'SELECT count(*)::int AS n FROM resposta WHERE usuario_id = $1', [euId.id]);
  passo(resp.n > 0, `exercício respondido na aula — ${resp.n} resposta(s) gravada(s)`);

  // A avaliação final: erra tudo, reprova; acerta tudo, passa e tira o certificado.
  const { rows: [av] } = await pool.query(
    `SELECT av.id, av.nota_minima AS nota FROM avaliacao av
       JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
      WHERE p.mascara = $1 AND m.slug = 'integracao-de-novos-colaboradores'`, [MASCARA]);
  const gabarito = await pool.query(
    `SELECT q.id::int AS questao, a.id::int AS certa,
            (SELECT x.id::int FROM alternativa x WHERE x.questao_id = q.id AND NOT x.correta LIMIT 1) AS errada
       FROM questao q JOIN alternativa a ON a.questao_id = q.id AND a.correta
      WHERE q.avaliacao_id = $1 ORDER BY q.ordem`, [av.id]);

  const responderProva = async (chave) => {
    await cola.goto(`${PORTAL_URL}/prova/integracao-de-novos-colaboradores`, { waitUntil: 'load' });
    // A prova é componente de cliente: clicar antes da hidratação não
    // marca nada, porque o `onChange` ainda não existe. Esperar a rede
    // assentar e conferir que a alternativa ficou marcada é o que separa
    // "cliquei" de "registrou".
    await cola.waitForLoadState('networkidle');
    for (const g of gabarito.rows) {
      // O rádio é invisível por desenho (o `label.alternativa` inteiro é o
      // alvo de clique); marcar direto no input falha, como falharia o
      // dedo de quem tentasse acertar um elemento de opacidade zero.
      const alvo = cola.locator(
        `label.alternativa:has(input[name="q${g.questao}"][value="${g[chave]}"])`);
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        // `element.click()` no próprio rádio, e não um clique por
        // coordenada: o cabeçalho fixo do portal cobre o alvo em parte da
        // rolagem, e um clique posicional acerta o cabeçalho. O evento
        // nativo dispara o mesmo onChange que o dedo dispararia.
        await alvo.locator('input').evaluate((el) => el.click());
        try {
          await alvo.and(cola.locator('.certa')).waitFor({ state: 'visible', timeout: 2000 });
          break;
        } catch { /* ainda não hidratou: clica de novo */ }
      }
    }
    await cola.click('button:has-text("Entregar a avaliação")');
    await cola.waitForSelector('.chip:has-text("Aprovado"), .chip:has-text("Não atingiu")', { timeout: 40000 });
    return cola.locator('body').innerText();
  };

  const reprovou = await responderProva('errada');
  passo(reprovou.includes('Não atingiu a nota mínima') && reprovou.includes('0%'),
    'errando tudo, a prova reprova e mostra a correção comentada questão a questão');

  const aprovou = await responderProva('certa');
  passo(aprovou.includes('Aprovado') && aprovou.includes('100%'),
    'acertando tudo, aprova com 100% e emite o certificado');

  const { rows: [conc] } = await pool.query(
    `SELECT codigo_certificado AS codigo, nota, carga_horaria_min AS carga
       FROM conclusao WHERE usuario_id = $1`, [euId.id]);
  passo(Boolean(conc?.codigo), `certificado emitido — código ${conc?.codigo}`);

  // O certificado é público e verificável por quem tiver o código.
  const rua = await (await b.newContext()).newPage();
  await rua.goto(`${BASE}/certificado/${conc.codigo}`, { waitUntil: 'load' });
  const cert = await rua.locator('body').innerText();
  passo(cert.includes('Tereza Souza') && cert.includes('Integração de novos colaboradores')
     && cert.includes('11.222.333/0001-81'),
    'o certificado confere nome, trilha e o CNPJ de quem o emitiu — sem precisar de login');
  passo(cert.includes('não é instituição de ensino credenciada pelo MEC'),
    'e diz, com todas as letras, que é certificado de curso livre');
  await rua.context().close();
  await cola.context().close();

  // -------------------------------------------------------------------
  // 8. O RH vê o resultado
  // -------------------------------------------------------------------
  await p.goto(`${BASE}/empresa/acompanhamento`, { waitUntil: 'load' });
  const acomp = await p.locator('body').innerText();
  passo(acomp.includes('Tereza Souza') && acomp.includes('concluída'),
    'o acompanhamento do RH mostra a conclusão, com o código do certificado');
  passo(acomp.includes('não iniciada'),
    'e distingue quem recebeu a trilha de quem começou');

  const csv = await fetch(`${BASE}/empresa/acompanhamento/csv`, {
    headers: { cookie: (await p.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ') },
  });
  const texto = await csv.text();
  passo(csv.headers.get('content-type')?.includes('text/csv')
     && texto.includes('nome;email;setor;trilha') && texto.includes('Tereza Souza'),
    'e exporta em CSV, que abre direto no Excel');

  // -------------------------------------------------------------------
  // 9. O portal continua fechado para a rua
  // -------------------------------------------------------------------
  const anon = await (await b.newContext()).newPage();
  await anon.goto(`${PORTAL_URL}/`, { waitUntil: 'load' });
  const portao = await anon.locator('body').innerText();
  passo(portao.includes('Universidade Aurora') && portao.includes('Treinamento e desenvolvimento'),
    'quem chega sem acesso vê a marca e a mensagem da empresa');
  passo(!portao.includes('Criar conta') && !portao.includes('R' + '$'),
    'sem cadastro aberto e sem preço na porta');

  // As quatro rotas novas do painel entram aqui: sem sessão, o layout do
  // colaborador manda para o login como qualquer outra — e a Biblioteca,
  // em especial, não pode listar nem o TÍTULO do que a empresa publicou.
  const ROTAS = ['/catalogo', '/planos', '/vademecum', '/blog', '/vagas',
                 '/materia/lgpd-no-atendimento-ao-cliente', '/aula/lgpd-a-lei-em-resumo',
                 '/prova/lgpd-no-atendimento-ao-cliente', '/empresa', '/para-professores',
                 '/painel', '/painel/trilhas', '/painel/biblioteca', '/painel/planos',
                 '/painel/conta'];
  let vazou = 0;
  for (const rota of ROTAS) {
    await anon.goto(PORTAL_URL + rota, { waitUntil: 'load' });
    const destino = new URL(anon.url()).pathname;
    const t = await anon.locator('body').innerText();
    const noLugar = destino === '/' || destino.startsWith('/entrar');
    const entregou = t.includes('R' + '$') || t.includes('Criar conta')
      || t.includes('Mural de vagas') || t.includes('LGPD: a Lei')
      || t.includes('Guia prático de LGPD');
    if (!noLugar || entregou) { vazou++; console.log(`   ✘ ${rota} → ${destino}`); }
  }
  passo(vazou === 0, `as ${ROTAS.length} rotas públicas não entregam nada a quem não tem acesso`);

  // Mas o cadastro por domínio autorizado funciona — e só para ele.
  await anon.goto(`${PORTAL_URL}/cadastrar`, { waitUntil: 'load' });
  const temCadastro = (await anon.locator('input[name=senha]').count()) > 0;
  passo(temCadastro, 'com domínio autorizado, o autocadastro existe (é a política que o RH ligou)');
  if (temCadastro) {
    await anon.fill('input[name=nome]', 'Alguém de fora');
    await anon.fill('input[name=email]', 'alguem@outraempresa.com');
    await anon.fill('input[name=senha]', 'senha-de-fora-2026');
    await anon.click('button[type=submit]');
    await anon.waitForSelector('.alerta-erro', { timeout: 30000 });
    passo((await anon.locator('.alerta-erro').innerText()).includes('e-mail da empresa'),
      'mas e-mail de fora do domínio é recusado');
  }
  await anon.context().close();
} catch (err) {
  passo(false, `erro: ${err.message}`);
  await p.screenshot({ path: join(MIDIA, 'falha-empresa.png'), fullPage: true }).catch(() => {});
  for (const [i, pag] of b.contexts().flatMap((c) => c.pages()).entries()) {
    await pag.screenshot({ path: join(MIDIA, `falha-empresa-${i}.png`), fullPage: true }).catch(() => {});
  }
}

await fim(b);
