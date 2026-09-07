import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Portal da Empresa contra banco real — §5.11, etapas 0 e 1.
 *
 * O que está em jogo aqui é diferente do portal do professor. Lá o risco
 * é financeiro (split, escrow, repasse); aqui é de CONFIDENCIALIDADE: o
 * treinamento interno de um cliente não pode aparecer na rua, e o teto de
 * contas é o que a empresa efetivamente comprou.
 *
 * Por isso os testes se concentram em três perguntas:
 *   1. O portal nasce fechado e sem subconta?
 *   2. O banco RECUSA o que a aplicação não deve nem tentar (curso de
 *      empresa na vitrine, plataforma virando empresa)?
 *   3. O teto de contas é contável e intransponível?
 */
const { pool, query, queryOne } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');
const { abrirSubconta } = await import('./portal-subconta.ts');
const {
  portalDaEmpresa, planosDeEmpresa, ocupacaoDeContas, exigirVaga,
  listarGestores, adicionarGestor, removerGestor,
  validarDominiosEmail, dominioAutorizado,
} = await import('./empresa.ts');
const { gerarHashSenha } = await import('./auth.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM portal_gestor LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

process.env.LIMITE_PORTAIS = '50';

const CNPJ = '11.222.333/0001-81';
let n = 0;
const dados = (extra: Record<string, unknown> = {}) => ({
  nome: 'RH de Teste',
  email: `teste-empresa-${++n}@exemplo.com`,
  senha: 'senha-bem-longa',
  cnpj: CNPJ,
  telefone: '',
  rendaMensalCentavos: 0,
  endereco: { cep: '', logradouro: '', numero: '', bairro: '' },
  mascara: `teste-empresa-${n}`,
  nomeExibicao: 'Empresa de Teste',
  meio: 'PIX' as const,
  aceitouContrato: true,
  ip: '203.0.113.9',
  tipo: 'EMPRESA' as const,
  ...extra,
});

const evento = (ref: string, id: string) =>
  ({ eventoId: id, tipo: 'pagamento.confirmado' as const, referencia: ref, centavos: 38000 });

async function limparRastros() {
  const alvo = "SELECT id FROM portal WHERE mascara LIKE 'teste-empresa-%'";
  await query(`DELETE FROM preco WHERE portal_id IN (${alvo})`);
  // O acervo sai antes do portal: area e materia referenciam portal sem
  // ON DELETE CASCADE, e uma matéria de teste esquecida trava a limpeza
  // inteira — inclusive a do próximo run.
  await query(`DELETE FROM materia WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM area WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM usuario WHERE portal_id IN (${alvo})`);
  await query(`DELETE FROM portal WHERE mascara LIKE 'teste-empresa-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-empresa-%@exemplo.com'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-gestor-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-empresa-%'`);
}
if (temBanco) await limparRastros();

/** Contrata e paga: o estado normal de onde os outros testes partem. */
async function empresaNoAr(extra: Record<string, unknown> = {}) {
  const planos = await planosDeEmpresa();
  const r = await assinarPortal(dados({ planoId: planos[0].id, ...extra }));
  await confirmarPagamentoFatura(evento(r.referencia, `ev-empresa-${n}`), 'simulado', {});
  return r;
}

// ---------------------------------------------------------------------
// Etapa 0 — a fundação
// ---------------------------------------------------------------------

test('os planos de empresa vêm do banco, sem percentual e com teto de contas', talvez, async () => {
  const planos = await planosDeEmpresa();
  assert.ok(planos.length >= 2, 'Starter e Pro semeados pela migração');
  assert.equal(planos[0].licencaMensalCentavos, 38000, 'o mais barato é o Starter');
  assert.equal(planos[0].limiteContas, 50);
  assert.equal(planos[1].limiteContas, 250);
  assert.equal(planos[1].centavosDominioProprio, 0, 'domínio próprio incluído no Pro');
});

test('o plano do professor não muda por existir plano de empresa mais barato', talvez, async () => {
  const { planoDeLancamento } = await import('./portal-assinatura.ts');
  const plano = await planoDeLancamento();
  assert.equal(plano?.licencaMensalCentavos, 14900, 'continua o Portal do Professor');
});

test('a plataforma não pode virar portal fechado', talvez, async () => {
  await assert.rejects(
    () => query(`UPDATE portal SET tipo = 'EMPRESA' WHERE id = 0`),
    /portal_plataforma_e_aberta/,
    'o CHECK impede fechar o site inteiro atrás de um login',
  );
});

// ---------------------------------------------------------------------
// Etapa 1 — a contratação
// ---------------------------------------------------------------------

test('contratação de empresa cria portal fechado, responsável e contrato com teto', talvez, async () => {
  const planos = await planosDeEmpresa();
  const r = await assinarPortal(dados({ planoId: planos[0].id }));

  const p = await queryOne<{ tipo: string; status: string; doc: string; telefone: string | null }>(
    `SELECT tipo, status, responsavel_doc AS doc, responsavel_telefone AS telefone
       FROM portal WHERE id = $1`, [r.portalId]);
  assert.equal(p!.tipo, 'EMPRESA');
  assert.equal(p!.status, 'RASCUNHO', 'nasce fora do ar: quem ativa é o pagamento');
  assert.equal(p!.doc, '11222333000181', 'CNPJ sem pontuação');
  assert.equal(p!.telefone, null, 'sem KYC: empresa não abre subconta, não coleta renda nem endereço');

  const c = await queryOne<{ limite: number; percentual: string; vitrine: string }>(
    `SELECT limite_contas AS limite, percentual_base AS percentual,
            comissao_vitrine_pp AS vitrine
       FROM portal_contrato WHERE portal_id = $1`, [r.portalId]);
  assert.equal(c!.limite, 50, 'o teto do plano foi copiado ao contrato');
  assert.equal(Number(c!.percentual), 0, 'empresa não paga percentual: não vende');
  assert.equal(Number(c!.vitrine), 0, 'comissão de vitrine copiada do plano, não do DEFAULT');

  const g = await query<{ papel: string }>(
    `SELECT papel_no_portal AS papel FROM portal_gestor WHERE portal_id = $1`, [r.portalId]);
  assert.equal(g.length, 1);
  assert.equal(g[0].papel, 'RESPONSAVEL', 'quem contratou responde pelo contrato');

  const precos = await query(`SELECT 1 FROM preco WHERE portal_id = $1`, [r.portalId]);
  assert.equal(precos.length, 0, 'empresa nasce sem tabela de preço: não há o que vender');
});

test('empresa contratada sem escolher plano é recusada', talvez, async () => {
  await assert.rejects(() => assinarPortal(dados()), /Escolha um plano/);
});

test('pagamento ativa o portal e NÃO abre subconta no gateway', talvez, async () => {
  const r = await empresaNoAr();

  const p = await queryOne<{ status: string; situacao: string; wallet: string | null }>(
    `SELECT status, subconta_situacao AS situacao, gateway_wallet_id AS wallet
       FROM portal WHERE id = $1`, [r.portalId]);
  assert.equal(p!.status, 'ATIVO', 'pagou, está no ar');
  assert.equal(p!.situacao, 'PENDENTE');
  assert.equal(p!.wallet, null);

  // A recusa mora na fonte: mesmo chamada à força, não cria nada.
  const sub = await abrirSubconta(r.portalId);
  assert.equal(sub.criada, false, 'empresa paga, não recebe — não há subconta a abrir');
  const depois = await queryOne<{ situacao: string }>(
    `SELECT subconta_situacao AS situacao FROM portal WHERE id = $1`, [r.portalId]);
  assert.equal(depois!.situacao, 'PENDENTE');
});

test('o portal da empresa responde ao gestor, e o do professor não', talvez, async () => {
  const r = await empresaNoAr();
  const meu = await portalDaEmpresa(r.professorId);
  assert.equal(meu?.id, r.portalId);
  assert.equal(meu?.papelNoPortal, 'RESPONSAVEL');
  assert.equal(meu?.limiteContas, 50);

  const { portalDoProfessor } = await import('./professor.ts');
  const comoProfessor = await portalDoProfessor(r.professorId);
  assert.equal(comoProfessor, null, 'o painel do professor não abre para uma empresa');
});

// ---------------------------------------------------------------------
// A trava de confidencialidade
// ---------------------------------------------------------------------

test('curso de empresa não entra na vitrine da plataforma, nem pelo banco', talvez, async () => {
  const r = await empresaNoAr();
  const [area] = await query<{ id: number }>(
    `INSERT INTO area (portal_id, slug, nome) VALUES ($1, 'interno', 'Interno') RETURNING id`,
    [r.portalId]);
  const [m] = await query<{ id: number; tipo: string }>(
    `INSERT INTO materia (portal_id, area_id, slug, nome, ementa)
     VALUES ($1, $2, 'compliance', 'Compliance', 'Treinamento interno')
     RETURNING id, portal_tipo AS tipo`,
    [r.portalId, area.id]);
  assert.equal(m.tipo, 'EMPRESA', 'o gatilho carimbou o tipo do portal na matéria');

  await assert.rejects(
    () => query(`UPDATE materia SET na_vitrine_plataforma = true WHERE id = $1`, [m.id]),
    /materia_empresa_fora_da_vitrine/,
    'treinamento interno de cliente não vai ao catálogo público',
  );
});

test('o isolamento entre portais vale para o que a empresa acrescentou', talvez, async () => {
  const a = await empresaNoAr();
  const b = await empresaNoAr();

  const [setorA] = await query<{ id: number }>(
    `INSERT INTO setor (portal_id, nome) VALUES ($1, 'Comercial') RETURNING id`, [a.portalId]);

  // Setor da empresa A num colaborador da empresa B: o par (id, portal_id)
  // não existe, e a chave estrangeira composta recusa.
  const [colabB] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES ($1, 'Colab B', 'teste-empresa-colab@exemplo.com', 'aluno') RETURNING id`,
    [b.portalId]);
  await assert.rejects(
    () => query(`UPDATE usuario SET setor_id = $1 WHERE id = $2`, [setorA.id, colabB.id]),
    /usuario_setor_mesmo_portal/,
  );

  // Convite da empresa B apontando setor da A: mesma recusa.
  await assert.rejects(
    () => query(
      `INSERT INTO convite (portal_id, email, setor_id, token_hash, criado_por, expira_em)
       VALUES ($1, 'x@y.com', $2, 'hash-teste-1', 'teste', now() + interval '7 days')`,
      [b.portalId, setorA.id]),
    /convite_setor_mesmo_portal/,
  );

  await query(`DELETE FROM usuario WHERE id = $1`, [colabB.id]);
});

// ---------------------------------------------------------------------
// O teto de contas
// ---------------------------------------------------------------------

test('o teto conta contas ativas, e desativar libera a vaga', talvez, async () => {
  const r = await empresaNoAr();
  const vazia = await ocupacaoDeContas(r.portalId);
  assert.equal(vazia.limite, 50);
  assert.equal(vazia.usadas, 0);
  assert.equal(vazia.livres, 50);

  await query(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES ($1, 'C1', 'teste-empresa-c1@exemplo.com', 'aluno')`, [r.portalId]);
  const uma = await ocupacaoDeContas(r.portalId);
  assert.equal(uma.usadas, 1);

  // Desativar é encerrar a conta: o acesso morre (o motor de licenças já
  // barra conta ENCERRADA) e a vaga volta ao plano.
  await query(
    `UPDATE usuario SET status_conta = 'ENCERRADA' WHERE portal_id = $1`, [r.portalId]);
  const depois = await ocupacaoDeContas(r.portalId);
  assert.equal(depois.usadas, 0, 'quem saiu da empresa não ocupa vaga');

  await query(`DELETE FROM usuario WHERE portal_id = $1 AND papel = 'aluno'`, [r.portalId]);
});

test('o teto cheio recusa com o número na mensagem, não com erro de banco', talvez, async () => {
  const r = await empresaNoAr();
  await query(`UPDATE portal_contrato SET limite_contas = 2 WHERE portal_id = $1`, [r.portalId]);
  await query(
    `INSERT INTO usuario (portal_id, nome, email, papel) VALUES
       ($1, 'C1', 'teste-empresa-t1@exemplo.com', 'aluno'),
       ($1, 'C2', 'teste-empresa-t2@exemplo.com', 'aluno')`, [r.portalId]);

  await assert.rejects(() => exigirVaga(r.portalId), (e: Error) => {
    assert.match(e.message, /2 pessoas com acesso/);
    assert.match(e.message, /Falta 1 vaga/);
    return true;
  });
  // Importar 3 de uma vez quando cabe 1 avisa antes de gravar nenhuma.
  await query(`UPDATE portal_contrato SET limite_contas = 3 WHERE portal_id = $1`, [r.portalId]);
  await assert.rejects(() => exigirVaga(r.portalId, 3), /Faltam 2 vagas/);
  await exigirVaga(r.portalId, 1);

  await query(`DELETE FROM usuario WHERE portal_id = $1 AND papel = 'aluno'`, [r.portalId]);
});

// ---------------------------------------------------------------------
// Gestores
// ---------------------------------------------------------------------

test('o RH ganha outro gestor, e o responsável não pode ser removido', talvez, async () => {
  const r = await empresaNoAr();
  const hash = await gerarHashSenha('outra-senha-longa');
  const gestorId = await adicionarGestor(
    'rh@teste', r.portalId, 'Segundo do RH', `teste-gestor-${n}@exemplo.com`, hash);

  const lista = await listarGestores(r.portalId);
  assert.equal(lista.length, 2);
  assert.equal(lista[0].papelNoPortal, 'RESPONSAVEL', 'o responsável vem primeiro');

  const dele = await portalDaEmpresa(gestorId);
  assert.equal(dele?.id, r.portalId, 'o gestor convidado alcança o mesmo portal');
  assert.equal(dele?.papelNoPortal, 'GESTOR');

  await assert.rejects(
    () => removerGestor('rh@teste', r.portalId, r.professorId),
    /responsável pelo contrato não pode ser removido/,
  );

  await removerGestor('rh@teste', r.portalId, gestorId);
  assert.equal((await listarGestores(r.portalId)).length, 1);
  assert.equal(await portalDaEmpresa(gestorId), null, 'sem vínculo, sem painel');
});

test('conta de outro papel não vira gestora por um formulário', talvez, async () => {
  const r = await empresaNoAr();
  const hash = await gerarHashSenha('outra-senha-longa');
  // Uma conta de professor na plataforma é o alvo clássico do abuso:
  // saber o e-mail de alguém e promovê-lo para dentro do seu portal.
  const email = `teste-gestor-prof-${n}@exemplo.com`;
  await query(
    `INSERT INTO usuario (portal_id, nome, email, papel) VALUES (0, 'Prof', $1, 'professor')`,
    [email]);
  await assert.rejects(
    () => adicionarGestor('invasor@teste', r.portalId, 'Tentativa', email, hash),
    /já pertence a uma conta da plataforma/,
  );
  await query(`DELETE FROM usuario WHERE email = $1`, [email]);
});

// ---------------------------------------------------------------------
// Política de autocadastro — parte pura, sem banco
// ---------------------------------------------------------------------

test('domínios de e-mail são normalizados e deduplicados', () => {
  assert.deepEqual(validarDominiosEmail('Acme.com.BR, @acme.com ; acme.com.br'),
    ['acme.com.br', 'acme.com'], 'sem @, sem caixa alta, sem repetição');
  assert.deepEqual(validarDominiosEmail('   '), [], 'vazio é a política padrão: só convite');
});

test('correio público não pode liberar o portal de uma empresa', () => {
  for (const d of ['gmail.com', 'Hotmail.com', 'uol.com.br']) {
    assert.throws(() => validarDominiosEmail(d), /correio público/,
      d + ' daria acesso a qualquer pessoa do mundo');
  }
});

test('o que não é domínio é recusado com o texto do que se espera', () => {
  assert.throws(() => validarDominiosEmail('acme'), /não parece um domínio/);
  assert.throws(() => validarDominiosEmail('joao@acme.com.br'), /não parece um domínio/);
});

test('autocadastro só passa quando o domínio está na lista', () => {
  const lista = ['acme.com.br'];
  assert.equal(dominioAutorizado(lista, 'Joao@Acme.com.BR'), true);
  assert.equal(dominioAutorizado(lista, 'joao@outra.com.br'), false);
  assert.equal(dominioAutorizado(lista, 'joao'), false, 'e-mail sem @ não passa');
  assert.equal(dominioAutorizado([], 'joao@acme.com.br'), false,
    'lista vazia recusa todo mundo — é o padrão');
});

test.after(async () => {
  if (temBanco) await limparRastros();
  await pool.end();
});
