import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Equipe, atribuição e avaliação do Portal da Empresa — §5.11, etapas 3 a 6.
 *
 * O que está em jogo aqui é o que a empresa comprou e o que ela promete
 * a quem estuda:
 *
 *   1. **O teto de contas** é intransponível — inclusive por convite
 *      pendente, e inclusive pelo truque "desativa e reativa".
 *   2. **Atribuir é liberar.** Cadastrar não libera; e tirar a
 *      atribuição tira o acesso que ELA deu, não o que veio por outro
 *      caminho.
 *   3. **O convite é nominal e de uso único.** Token que vazou não vira
 *      conta de outro e-mail, nem duas contas.
 *   4. **A nota é do servidor.** O gabarito não sai do banco antes da
 *      entrega, e a aprovação emite um certificado só.
 *   5. **O isolamento por portal.** Convite de um portal não cria conta
 *      em outro; atribuição não pendura trilha alheia.
 */
const { pool, query, queryOne } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');
const { planosDeEmpresa, ocupacaoDeContas } = await import('./empresa.ts');
const {
  salvarSetor, excluirSetor, listarSetores,
  cadastrarColaborador, editarColaborador, desativarColaborador, reativarColaborador,
  listarColaboradores, atribuirTrilha, removerAtribuicao, listarAtribuicoes,
  criarConvite, cancelarConvite, lerConvite, aceitarConvite, listarConvites,
  lerCsvDeColaboradores, importarConvites, autocadastrar,
} = await import('./empresa-equipe.ts');
const {
  salvarAvaliacao, avaliacaoDaTrilha, provaDaTrilha, questoesDaProva,
  iniciarTentativa, entregarTentativa, certificadoPorCodigo,
} = await import('./avaliacao.ts');
const { resumoPorTrilha, progressoPorPessoa, trilhasDoColaborador, paraCsv } =
  await import('./empresa-relatorio.ts');
const { criarMateria, salvarArea, salvarAssunto, criarAula, mudarStatusAula, salvarQuestaoDe } =
  await import('./admin-cursos.ts');
const { gerarHashSenha } = await import('./auth.ts');
const { podeAcessar } = await import('./licenca.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM atribuicao LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

process.env.LIMITE_PORTAIS = '50';
const ATOR = 'rh@teste-equipe.com.br';
const SENHA = await (temBanco ? gerarHashSenha('senha-bem-longa') : Promise.resolve('x'));

let n = 0;
const dados = (extra: Record<string, unknown> = {}) => ({
  nome: 'RH de Teste', email: `teste-equipe-${++n}@exemplo.com`, senha: 'senha-bem-longa',
  cnpj: '11.222.333/0001-81', telefone: '', rendaMensalCentavos: 0,
  endereco: { cep: '', logradouro: '', numero: '', bairro: '' },
  mascara: `teste-equipe-${n}`, nomeExibicao: 'Empresa de Teste',
  meio: 'PIX' as const, aceitouContrato: true, ip: '203.0.113.9', tipo: 'EMPRESA' as const,
  ...extra,
});

async function limparRastros() {
  const alvo = "SELECT id FROM portal WHERE mascara LIKE 'teste-equipe-%'";
  await query(`DELETE FROM conclusao WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM tentativa_avaliacao WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM licenca WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM atribuicao WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM convite WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM progresso_aula WHERE usuario_id IN
                 (SELECT id FROM usuario WHERE portal_id IN (${alvo}))`);
  await query(`DELETE FROM alternativa WHERE questao_id IN (SELECT q.id FROM questao q
                 LEFT JOIN avaliacao av ON av.id = q.avaliacao_id
                 LEFT JOIN exercicio e ON e.id = q.exercicio_id
                 LEFT JOIN aula a ON a.id = e.aula_id
                WHERE av.portal_id IN (${alvo}) OR a.portal_id IN (${alvo}))`);
  await query(`DELETE FROM questao WHERE avaliacao_id IN (SELECT id FROM avaliacao WHERE portal_id IN (${alvo}))
                  OR exercicio_id IN (SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id
                                       WHERE a.portal_id IN (${alvo}))`);
  await query(`DELETE FROM avaliacao WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM exercicio WHERE aula_id IN (SELECT id FROM aula WHERE portal_id IN (${alvo}))`);
  await query(`DELETE FROM aula WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM assunto WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM materia WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM area WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM preco WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM portal_gestor WHERE portal_id IN (${alvo})`);
  // usuario aponta para setor (usuario_setor_mesmo_portal): a pessoa sai antes do setor.
  await query(`DELETE FROM usuario WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM setor WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM portal WHERE mascara LIKE 'teste-equipe-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-equipe-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-equipe-%'`);
}
if (temBanco) await limparRastros();

/** Empresa no ar, com uma trilha publicada de duas aulas e avaliação. */
async function empresaComTrilha(extra: Record<string, unknown> = {}) {
  const planos = await planosDeEmpresa();
  const r = await assinarPortal(dados({ planoId: planos[0].id, ...extra }));
  await confirmarPagamentoFatura(
    { eventoId: `ev-equipe-${n}`, tipo: 'pagamento.confirmado', referencia: r.referencia, centavos: 38000 },
    'simulado', {});
  const portalId = r.portalId;

  // O driver devolve BIGINT como texto; as funções de biblioteca conferem
  // com Number.isInteger, e é o formulário que converte na aplicação.
  const areaId = Number(await salvarArea(ATOR, portalId, null, 'Conformidade', 1));
  const { id: materiaIdBruto } = await criarMateria(ATOR, portalId, {
    areaId, nome: 'LGPD na prática', status: 'publicado', ordem: 1, naVitrinePlataforma: false,
    ementa: 'O que muda no dia a dia de quem lida com dado de cliente: bases legais, direitos do titular e o que fazer quando alguém pede para apagar seus dados.',
  });
  const materiaId = Number(materiaIdBruto);
  const assuntoId = Number(await salvarAssunto(ATOR, portalId, materiaId, null, 'Fundamentos', 1));
  const aulas: number[] = [];
  for (const titulo of ['O que a LGPD protege', 'Bases legais na prática']) {
    const { id: idBruto } = await criarAula(ATOR, portalId, {
      assuntoId, titulo, resumo: `${titulo}: o que a equipe precisa saber para não errar no atendimento.`,
      duracaoSegundos: 600, status: 'rascunho', ordem: aulas.length + 1,
      amostraGratuita: false, noTrial: false,
    });
    const id = Number(idBruto);
    await salvarQuestaoDe(ATOR, portalId, { aulaId: id }, null, {
      tipo: 'multipla_escolha', enunciado: `Sobre ${titulo}, é correto afirmar que:`,
      origem: 'Autoral', dificuldade: 'introdutorio', ordem: 1,
      alternativas: [
        { texto: 'A alternativa certa', correta: true, comentario: 'Correta pelo que a aula explica.' },
        { texto: 'A alternativa errada', correta: false, comentario: 'Errada, e a aula diz por quê.' },
      ],
    });
    await mudarStatusAula(ATOR, portalId, id, 'publicado');
    aulas.push(id);
  }
  return { portalId, materiaId, assuntoId, aulas };
}

// ---------------------------------------------------------------------
// Setores e colaboradores
// ---------------------------------------------------------------------

test('setor com pessoa dentro não é excluído', talvez, async () => {
  const { portalId } = await empresaComTrilha();
  const setorId = Number(await salvarSetor(ATOR, portalId, null, 'Vendas', 1));
  const { id } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Ana Lima', email: 'ana@acme.com.br', setorId, matricula: '' }, SENHA);
  await assert.rejects(() => excluirSetor(ATOR, portalId, setorId), /pessoa\(s\) estão no setor/);
  await desativarColaborador(ATOR, portalId, id);
  // Desativada ainda ocupa o setor: mover é decisão do RH, não efeito colateral.
  await assert.rejects(() => excluirSetor(ATOR, portalId, setorId), /pessoa\(s\) estão no setor/);
});

test('o mesmo e-mail não vira duas contas no mesmo portal', talvez, async () => {
  const { portalId } = await empresaComTrilha();
  await cadastrarColaborador(ATOR, portalId,
    { nome: 'Bruno Sá', email: 'bruno@acme.com.br', setorId: null, matricula: 'M-1' }, SENHA);
  await assert.rejects(
    () => cadastrarColaborador(ATOR, portalId,
      { nome: 'Bruno de novo', email: 'BRUNO@acme.com.br', setorId: null, matricula: '' }, SENHA),
    /já tem conta neste portal/,
  );
});

test('desativar libera a vaga do plano; reativar volta a ocupá-la', talvez, async () => {
  const { portalId } = await empresaComTrilha();
  const { id } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Carla', email: 'carla@acme.com.br', setorId: null, matricula: '' }, SENHA);
  const antes = await ocupacaoDeContas(portalId);
  await desativarColaborador(ATOR, portalId, id);
  const depois = await ocupacaoDeContas(portalId);
  assert.equal(depois.usadas, antes.usadas - 1, 'a vaga voltou ao plano');
  await reativarColaborador(ATOR, portalId, id);
  assert.equal((await ocupacaoDeContas(portalId)).usadas, antes.usadas, 'e foi ocupada de novo');
});

test('o teto de contas do plano é intransponível', talvez, async () => {
  const { portalId } = await empresaComTrilha();
  // O contrato do Starter é 50; encurtar o teto para 1 deixa o teste rápido
  // e testa exatamente a mesma trava.
  await query('UPDATE portal_contrato SET limite_contas = 1 WHERE portal_id = $1', [portalId]);
  await cadastrarColaborador(ATOR, portalId,
    { nome: 'Único', email: 'unico@acme.com.br', setorId: null, matricula: '' }, SENHA);
  await assert.rejects(
    () => cadastrarColaborador(ATOR, portalId,
      { nome: 'Segundo', email: 'segundo@acme.com.br', setorId: null, matricula: '' }, SENHA),
    /permite 1 pessoas com acesso/,
  );
  // E o convite pendente também não fura o teto: ele já reserva a vaga.
  await assert.rejects(
    () => criarConvite(ATOR, portalId,
      { email: 'terceiro@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null }),
    /Falta 1 vaga|Faltam/,
  );
});

// ---------------------------------------------------------------------
// Atribuição → licença B2B
// ---------------------------------------------------------------------

test('atribuir ao setor libera para quem está nele — e para quem entrar depois', talvez, async () => {
  const { portalId, materiaId, aulas } = await empresaComTrilha();
  const setorId = Number(await salvarSetor(ATOR, portalId, null, 'Atendimento', 1));
  const { id: primeiro } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Primeira', email: 'primeira@acme.com.br', setorId, matricula: '' }, SENHA);

  const r = await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: null, setorId, obrigatoria: true, prazoEm: '' });
  assert.equal(r.pessoas, 1, 'quem já estava no setor recebeu na hora');

  // Quem chega depois recebe no cadastro, sem o RH tocar em nada.
  const { trilhas } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Segunda', email: 'segunda@acme.com.br', setorId, matricula: '' }, SENHA);
  assert.equal(trilhas, 1, 'a pessoa nova entrou já com a trilha do setor');

  const licencas = await query<{ origem: string; status: string; usuario_id: string }>(
    `SELECT origem, status, usuario_id FROM licenca WHERE portal_id = $1`, [portalId]);
  assert.equal(licencas.length, 2);
  assert.ok(licencas.every((l) => l.origem === 'B2B' && l.status === 'ATIVA'));

  // E o motor de acesso trata a B2B como licença plena da matéria (§6.3).
  const { espectadorDe } = { espectadorDe: async (usuarioId: number) => ({
    usuarioId, statusConta: 'ATIVA' as const,
    licencas: (await query(`SELECT id, escopo, materia_id AS "materiaId", origem, status,
                                   inicio_em AS "inicioEm", fim_em AS "fimEm", cota
                              FROM licenca WHERE usuario_id = $1`, [usuarioId])),
  }) };
  const decisao = podeAcessar(await espectadorDe(primeiro),
    { id: aulas[0], materiaId, amostraGratuita: false, noTrial: false });
  assert.ok(decisao.libera && decisao.motivo === 'LICENCA_MATERIA',
    'a licença B2B abre a trilha inteira, como uma compra');
});

test('atribuir duas vezes o mesmo par é recusado, e não duplica licença', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  const { id } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Dupla', email: 'dupla@acme.com.br', setorId: null, matricula: '' }, SENHA);
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: id, setorId: null, obrigatoria: true, prazoEm: '' });
  await assert.rejects(
    () => atribuirTrilha(ATOR, portalId,
      { materiaId, usuarioId: id, setorId: null, obrigatoria: true, prazoEm: '' }),
    /já está atribuída/,
  );
  const [{ n: total }] = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM licenca WHERE usuario_id = $1 AND status = 'ATIVA'`, [id]);
  assert.equal(total, 1);
});

test('tirar a atribuição cancela SÓ as licenças que ela criou', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  const setorId = Number(await salvarSetor(ATOR, portalId, null, 'Suporte', 1));
  const { id } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Dois caminhos', email: 'dois@acme.com.br', setorId, matricula: '' }, SENHA);

  const doSetor = await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: null, setorId, obrigatoria: true, prazoEm: '' });
  const nominal = await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: id, setorId: null, obrigatoria: false, prazoEm: '' });

  await removerAtribuicao(ATOR, portalId, doSetor.id);
  const vivas = await query<{ atribuicao_id: string }>(
    `SELECT atribuicao_id FROM licenca WHERE usuario_id = $1 AND status = 'ATIVA'`, [id]);
  assert.equal(vivas.length, 1, 'a licença nominal sobreviveu');
  assert.equal(Number(vivas[0].atribuicao_id), nominal.id);
});

test('trocar de setor troca as trilhas do setor, não as nominais', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  const a = Number(await salvarSetor(ATOR, portalId, null, 'Setor A', 1));
  const b = Number(await salvarSetor(ATOR, portalId, null, 'Setor B', 2));
  const { id } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Migrante', email: 'migrante@acme.com.br', setorId: a, matricula: '' }, SENHA);
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: null, setorId: a, obrigatoria: true, prazoEm: '' });
  assert.equal((await query(
    `SELECT 1 FROM licenca WHERE usuario_id = $1 AND status = 'ATIVA'`, [id])).length, 1);

  await editarColaborador(ATOR, portalId, id, { nome: 'Migrante', setorId: b, matricula: '' });
  assert.equal((await query(
    `SELECT 1 FROM licenca WHERE usuario_id = $1 AND status = 'ATIVA'`, [id])).length, 0,
    'saiu do setor, perdeu a trilha que vinha dele');
});

test('atribuição não pendura trilha de outro portal', talvez, async () => {
  const um = await empresaComTrilha();
  const dois = await empresaComTrilha();
  const { id } = await cadastrarColaborador(ATOR, dois.portalId,
    { nome: 'De outro', email: 'outro@acme.com.br', setorId: null, matricula: '' }, SENHA);
  await assert.rejects(
    () => atribuirTrilha(ATOR, dois.portalId,
      { materiaId: um.materiaId, usuarioId: id, setorId: null, obrigatoria: true, prazoEm: '' }),
    /não é deste portal/,
  );
});

// ---------------------------------------------------------------------
// Convites
// ---------------------------------------------------------------------

test('o convite é nominal, de uso único e com prazo', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  const { token } = await criarConvite(ATOR, portalId,
    { email: 'Convidada@Acme.com.br', nome: 'Convidada', setorId: null,
      trilhas: [materiaId], prazoDias: 15 });

  const lido = await lerConvite(portalId, token);
  assert.equal(lido?.situacao, 'pendente');
  assert.equal(lido?.email, 'convidada@acme.com.br', 'o e-mail é normalizado');
  assert.deepEqual(lido?.trilhas, ['LGPD na prática']);

  const { usuarioId, trilhas } = await aceitarConvite(portalId, token, 'Convidada', SENHA);
  assert.equal(trilhas, 1, 'aceitar liberou a trilha do convite');
  const [conta] = await query<{ email: string }>('SELECT email FROM usuario WHERE id = $1', [usuarioId]);
  assert.equal(conta.email, 'convidada@acme.com.br', 'a conta nasce no e-mail do convite');

  await assert.rejects(() => aceitarConvite(portalId, token, 'Outra', SENHA), /já foi usado/);
});

test('convite cancelado e convite expirado não viram conta', talvez, async () => {
  const { portalId } = await empresaComTrilha();
  const cancelado = await criarConvite(ATOR, portalId,
    { email: 'cancelado@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null });
  await cancelarConvite(ATOR, portalId, cancelado.id);
  await assert.rejects(() => aceitarConvite(portalId, cancelado.token, 'Alguém', SENHA), /cancelado/);

  const velho = await criarConvite(ATOR, portalId,
    { email: 'velho@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null });
  await query(`UPDATE convite SET expira_em = now() - interval '1 day' WHERE id = $1`, [velho.id]);
  await assert.rejects(() => aceitarConvite(portalId, velho.token, 'Alguém', SENHA), /expirou/);
});

test('convite de um portal não cria conta em outro', talvez, async () => {
  const um = await empresaComTrilha();
  const dois = await empresaComTrilha();
  const { token } = await criarConvite(ATOR, um.portalId,
    { email: 'vizinha@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null });
  assert.equal(await lerConvite(dois.portalId, token), null, 'o token não existe no portal vizinho');
  await assert.rejects(() => aceitarConvite(dois.portalId, token, 'Vizinha', SENHA),
    /não encontrado neste portal/);
});

test('o convite pendente reserva vaga e some do teto quando cancelado', talvez, async () => {
  const { portalId } = await empresaComTrilha();
  await query('UPDATE portal_contrato SET limite_contas = 2 WHERE portal_id = $1', [portalId]);
  const a = await criarConvite(ATOR, portalId,
    { email: 'a@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null });
  await criarConvite(ATOR, portalId,
    { email: 'b@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null });
  await assert.rejects(
    () => criarConvite(ATOR, portalId,
      { email: 'c@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null }),
    /vaga/,
  );
  await cancelarConvite(ATOR, portalId, a.id);
  const c = await criarConvite(ATOR, portalId,
    { email: 'c@acme.com.br', nome: '', setorId: null, trilhas: [], prazoDias: null });
  assert.ok(c.token, 'cancelar devolveu a vaga');
});

// ---------------------------------------------------------------------
// Importação por CSV — parte pura
// ---------------------------------------------------------------------

test('o CSV aceita ponto e vírgula, vírgula e tabulação, e marca o que está errado', () => {
  const linhas = lerCsvDeColaboradores(
    'nome;email;setor\n'
    + 'Ana Lima;ana@acme.com.br;Vendas\n'
    + 'Bruno Sá,bruno@acme.com.br,Logística\n'
    + 'Carla\tcarla@acme.com.br\t\n'
    + 'Xavier;semarroba;Vendas\n'
    + ';vazio@acme.com.br;\n'
    + 'Ana de novo;ana@acme.com.br;Vendas\n',
  );
  assert.equal(linhas.length, 6);
  assert.equal(linhas[0].erro, undefined);
  assert.equal(linhas[1].setor, 'Logística');
  assert.equal(linhas[2].email, 'carla@acme.com.br');
  assert.match(linhas[3].erro!, /e-mail inválido/);
  assert.match(linhas[4].erro!, /nome em branco/);
  assert.match(linhas[5].erro!, /repetido/);
});

test('importar cria convite por linha boa e explica cada linha ruim', talvez, async () => {
  const { portalId } = await empresaComTrilha();
  await salvarSetor(ATOR, portalId, null, 'Vendas', 1);
  const linhas = await importarConvites(ATOR, portalId,
    'Ana Lima;ana.imp@acme.com.br;Vendas\n'
    + 'Bruno Sá;bruno.imp@acme.com.br;Setor Que Não Existe\n'
    + 'Carla;carla.imp@acme.com.br;\n', [], 10);
  assert.ok(linhas[0].token, 'a primeira virou convite');
  assert.match(linhas[1].erro!, /não existe/);
  assert.ok(linhas[2].token);
  assert.equal((await listarConvites(portalId)).length, 2);
});

// ---------------------------------------------------------------------
// Autocadastro por domínio
// ---------------------------------------------------------------------

test('autocadastro entra sem setor e já recebe atribuição nominal futura', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  const id = await autocadastrar(portalId, 'Livre', 'livre@acme.com.br', SENHA);
  assert.ok(id);
  assert.equal(await autocadastrar(portalId, 'Livre', 'livre@acme.com.br', SENHA), null,
    'o segundo cadastro do mesmo e-mail devolve null em vez de estourar');
  const r = await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: id!, setorId: null, obrigatoria: false, prazoEm: '' });
  assert.equal(r.pessoas, 1);
});

// ---------------------------------------------------------------------
// Avaliação, nota e certificado
// ---------------------------------------------------------------------

async function trilhaComProva() {
  const base = await empresaComTrilha();
  await salvarAvaliacao(ATOR, base.portalId, base.materiaId, {
    titulo: 'Avaliação — LGPD', descricao: '', notaMinima: 70,
    maxTentativas: 2, embaralhar: false, status: 'rascunho',
  });
  const av = (await avaliacaoDaTrilha(base.portalId, base.materiaId))!;
  for (let i = 1; i <= 4; i++) {
    await salvarQuestaoDe(ATOR, base.portalId, { avaliacaoId: av.id }, null, {
      tipo: 'multipla_escolha', enunciado: `Questão ${i} da avaliação de LGPD, sobre o conteúdo:`,
      origem: 'Autoral', dificuldade: 'introdutorio', ordem: i,
      alternativas: [
        { texto: `certa ${i}`, correta: true, comentario: 'Correta porque a aula explica assim.' },
        { texto: `errada ${i}`, correta: false, comentario: 'Errada, e a aula diz por quê.' },
      ],
    });
  }
  await salvarAvaliacao(ATOR, base.portalId, base.materiaId, {
    titulo: 'Avaliação — LGPD', descricao: '', notaMinima: 70,
    maxTentativas: 2, embaralhar: false, status: 'publicado',
  });
  return { ...base, avaliacaoId: av.id };
}

test('avaliação sem questão não pode ser publicada', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  await assert.rejects(
    () => salvarAvaliacao(ATOR, portalId, materiaId, {
      titulo: 'Prova vazia', descricao: '', notaMinima: 70,
      maxTentativas: null, embaralhar: true, status: 'publicado',
    }),
    /sem questão/,
  );
});

test('a prova que vai para a tela não leva gabarito nem comentário', talvez, async () => {
  const { avaliacaoId } = await trilhaComProva();
  const questoes = await questoesDaProva(avaliacaoId, false);
  assert.equal(questoes.length, 4);
  for (const q of questoes) {
    for (const a of q.alternativas) {
      assert.deepEqual(Object.keys(a).sort(), ['id', 'texto'],
        'a alternativa vai só com id e texto — correta e comentário ficam no servidor');
    }
  }
});

test('aprovar emite UM certificado; refazer não emite outro', talvez, async () => {
  const { portalId, materiaId, avaliacaoId } = await trilhaComProva();
  const { id: usuarioId } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Provada', email: 'provada@acme.com.br', setorId: null, matricula: '' }, SENHA);
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId, setorId: null, obrigatoria: true, prazoEm: '' });

  const gabarito = await query<{ questaoId: number; altId: number }>(
    `SELECT q.id AS "questaoId", a.id AS "altId" FROM questao q
       JOIN alternativa a ON a.questao_id = q.id AND a.correta
      WHERE q.avaliacao_id = $1`, [avaliacaoId]);
  const todasCertas = Object.fromEntries(gabarito.map((g) => [String(g.questaoId), g.altId]));

  await iniciarTentativa(portalId, usuarioId, avaliacaoId);
  const r = await entregarTentativa(portalId, usuarioId, avaliacaoId, todasCertas);
  assert.equal(r.nota, 100);
  assert.equal(r.aprovada, true);
  assert.match(r.codigoCertificado!, /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

  const cert = await certificadoPorCodigo(r.codigoCertificado!.toLowerCase());
  assert.equal(cert?.nome, 'Provada', 'o código confere sem diferenciar maiúsculas');
  assert.equal(cert?.trilha, 'LGPD na prática');
  assert.equal(cert!.cargaHorariaMin, 20, 'carga = soma da duração das aulas publicadas');

  await iniciarTentativa(portalId, usuarioId, avaliacaoId);
  const r2 = await entregarTentativa(portalId, usuarioId, avaliacaoId, todasCertas);
  assert.equal(r2.codigoCertificado, r.codigoCertificado, 'o certificado é o mesmo');
  const [{ n: quantos }] = await query<{ n: number }>(
    'SELECT count(*)::int AS n FROM conclusao WHERE usuario_id = $1', [usuarioId]);
  assert.equal(quantos, 1);
});

test('reprovar não emite certificado, e as tentativas acabam', talvez, async () => {
  const { portalId, materiaId, avaliacaoId } = await trilhaComProva();
  const { id: usuarioId } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Reprovada', email: 'reprovada@acme.com.br', setorId: null, matricula: '' }, SENHA);
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId, setorId: null, obrigatoria: true, prazoEm: '' });

  const erradas = await query<{ questaoId: number; altId: number }>(
    `SELECT q.id AS "questaoId", a.id AS "altId" FROM questao q
       JOIN alternativa a ON a.questao_id = q.id AND NOT a.correta
      WHERE q.avaliacao_id = $1`, [avaliacaoId]);
  const todasErradas = Object.fromEntries(erradas.map((g) => [String(g.questaoId), g.altId]));

  await iniciarTentativa(portalId, usuarioId, avaliacaoId);
  const r = await entregarTentativa(portalId, usuarioId, avaliacaoId, todasErradas);
  assert.equal(r.nota, 0);
  assert.equal(r.aprovada, false);
  assert.equal(r.codigoCertificado, null);
  assert.equal(r.correcao.length, 4, 'a correção volta questão a questão, com comentário');
  assert.ok(r.correcao.every((c) => c.comentario.length > 0));

  await iniciarTentativa(portalId, usuarioId, avaliacaoId);
  await entregarTentativa(portalId, usuarioId, avaliacaoId, todasErradas);
  await assert.rejects(() => iniciarTentativa(portalId, usuarioId, avaliacaoId),
    /já usou as 2 tentativas/);
});

test('entregar sem tentativa aberta é recusado', talvez, async () => {
  const { portalId, avaliacaoId } = await trilhaComProva();
  const { id: usuarioId } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Sem prova', email: 'semprova@acme.com.br', setorId: null, matricula: '' }, SENHA);
  await assert.rejects(() => entregarTentativa(portalId, usuarioId, avaliacaoId, {}),
    /não há tentativa aberta/);
});

// ---------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------

test('o acompanhamento classifica atribuída, iniciada, atrasada e concluída', talvez, async () => {
  const { portalId, materiaId, aulas, avaliacaoId } = await trilhaComProva();
  const { id: quieta } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Quieta', email: 'quieta@acme.com.br', setorId: null, matricula: '' }, SENHA);
  const { id: andando } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Andando', email: 'andando@acme.com.br', setorId: null, matricula: '' }, SENHA);
  const { id: atrasada } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Atrasada', email: 'atrasada@acme.com.br', setorId: null, matricula: '' }, SENHA);

  for (const u of [quieta, andando]) {
    await atribuirTrilha(ATOR, portalId,
      { materiaId, usuarioId: u, setorId: null, obrigatoria: true, prazoEm: '' });
  }
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: atrasada, setorId: null, obrigatoria: true, prazoEm: '2020-01-01' });
  await query(
    `INSERT INTO progresso_aula (usuario_id, aula_id, segundos_assistidos, concluida)
     VALUES ($1, $2, 600, true)`, [andando, aulas[0]]);

  const linhas = await progressoPorPessoa(portalId);
  const por = (nome: string) => linhas.find((l) => l.nome === nome)!;
  assert.equal(por('Quieta').situacao, 'nao_iniciada');
  assert.equal(por('Andando').situacao, 'em_andamento');
  assert.equal(por('Andando').percentual, 50, '1 de 2 aulas');
  assert.equal(por('Atrasada').situacao, 'atrasada');

  const resumo = (await resumoPorTrilha(portalId)).find((t) => t.materiaId === materiaId)!;
  assert.equal(resumo.atribuidos, 3);
  assert.equal(resumo.iniciados, 1);
  assert.equal(resumo.atrasados, 1);
  assert.equal(resumo.temAvaliacao, true);

  // Concluir muda a classificação e some do "atrasados".
  const gabarito = await query<{ questaoId: number; altId: number }>(
    `SELECT q.id AS "questaoId", a.id AS "altId" FROM questao q
       JOIN alternativa a ON a.questao_id = q.id AND a.correta
      WHERE q.avaliacao_id = $1`, [avaliacaoId]);
  await iniciarTentativa(portalId, atrasada, avaliacaoId);
  await entregarTentativa(portalId, atrasada, avaliacaoId,
    Object.fromEntries(gabarito.map((g) => [String(g.questaoId), g.altId])));
  const depois = await progressoPorPessoa(portalId);
  assert.equal(depois.find((l) => l.nome === 'Atrasada')!.situacao, 'concluida');
  const resumo2 = (await resumoPorTrilha(portalId)).find((t) => t.materiaId === materiaId)!;
  assert.equal(resumo2.concluidos, 1);
  assert.equal(resumo2.atrasados, 0);
});

test('o colaborador vê as obrigatórias primeiro, e só o que é dele', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  const areaId = Number((await query<{ id: number }>(
    'SELECT id FROM area WHERE portal_id = $1 LIMIT 1', [portalId]))[0].id);
  const { id: outraTrilhaBruta } = await criarMateria(ATOR, portalId, {
    areaId, nome: 'Opcional de Excel', status: 'publicado', ordem: 2, naVitrinePlataforma: false,
    ementa: 'Uma trilha opcional, para medir se a ordem da tela põe a obrigatória na frente e a opcional atrás dela.',
  });
  const outraTrilha = Number(outraTrilhaBruta);
  const { id: eu } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Eu', email: 'eu@acme.com.br', setorId: null, matricula: '' }, SENHA);
  const { id: outro } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Outro', email: 'outro2@acme.com.br', setorId: null, matricula: '' }, SENHA);

  await atribuirTrilha(ATOR, portalId,
    { materiaId: outraTrilha, usuarioId: eu, setorId: null, obrigatoria: false, prazoEm: '' });
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: eu, setorId: null, obrigatoria: true, prazoEm: '' });
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: outro, setorId: null, obrigatoria: true, prazoEm: '' });

  const minhas = await trilhasDoColaborador(portalId, eu);
  assert.equal(minhas.length, 2);
  assert.equal(minhas[0].obrigatoria, true, 'a obrigatória vem primeiro');
  assert.equal(minhas[1].trilha, 'Opcional de Excel');
  assert.ok(minhas.every((m) => m.email === 'eu@acme.com.br'));
});

test('o CSV do RH sai com cabeçalho, ponto e vírgula e BOM', talvez, async () => {
  const { portalId, materiaId } = await empresaComTrilha();
  const { id } = await cadastrarColaborador(ATOR, portalId,
    { nome: 'Exportada; com ponto e vírgula', email: 'exp@acme.com.br', setorId: null, matricula: '' }, SENHA);
  await atribuirTrilha(ATOR, portalId,
    { materiaId, usuarioId: id, setorId: null, obrigatoria: true, prazoEm: '' });
  const csv = paraCsv(await progressoPorPessoa(portalId));
  assert.ok(csv.startsWith('﻿'), 'o BOM faz o Excel abrir em UTF-8');
  assert.match(csv, /nome;email;setor;trilha/);
  assert.match(csv, /"Exportada; com ponto e vírgula"/, 'campo com ; sai entre aspas');
});

test.after(async () => {
  if (temBanco) await limparRastros();
  await pool.end();
});
