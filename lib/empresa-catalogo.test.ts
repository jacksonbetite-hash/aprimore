import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * A compra de vagas do catálogo pela empresa (db/047) contra banco de
 * verdade: o limite por curso, o pedido com quantidade, o lote no
 * pagamento, a distribuição e a devolução de vagas, e o orçamento.
 *
 * Sem banco alcançável, pula em vez de falhar (padrão de admin.test.ts).
 */
const { pool, query, queryOne } = await import('./db.ts');
const {
  cursosAVenda, comprarVagas, pedirOrcamento, responderOrcamento, aceitarOrcamento, recusarOrcamento,
  lotesDaEmpresa, distribuirVaga, devolverVaga, vagasOcupadas, orcamentosDaEmpresa,
} = await import('./empresa-catalogo.ts');
const { confirmarPagamento } = await import('./checkout.ts');
const { criarMateria } = await import('./admin-cursos.ts');
const { cadastrar } = await import('./auth.ts');
const { trilhasDoColaborador } = await import('./empresa-relatorio.ts');

let temBanco = true;
try {
  await pool.query('SELECT 1 FROM licenca_lote LIMIT 1');
} catch {
  temBanco = false;
}
const talvez = { skip: temBanco ? false : 'banco não disponível' };

const PREFIXO = 'teste-vagas-';
const email = (s: string) => `${PREFIXO}${s}@exemplo.com`;
const SENHA = 'senha-bem-longa-2026';

async function empresa() {
  return queryOne<{ id: number }>(
    `SELECT id::int AS id FROM portal WHERE tipo = 'EMPRESA' AND status <> 'ENCERRADO' ORDER BY id LIMIT 1`);
}

async function limpar() {
  // Na ordem das chaves: licença → lote → orçamento → contas → curso.
  await query(`DELETE FROM licenca WHERE lote_id IN (SELECT id FROM licenca_lote WHERE pedido_id IN
                 (SELECT id FROM pedido WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE $1)))`, [`${PREFIXO}%`]);
  await query(`DELETE FROM licenca_lote WHERE pedido_id IN
                 (SELECT id FROM pedido WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE $1))`, [`${PREFIXO}%`]);
  await query(`DELETE FROM orcamento_empresa WHERE solicitado_por LIKE $1`, [`${PREFIXO}%`]);
  await query(`DELETE FROM usuario WHERE email LIKE $1`, [`${PREFIXO}%`]);
  await query(`DELETE FROM materia WHERE portal_id = 0 AND slug LIKE 'teste-vagas-%'`);
}

/** Um curso da casa, publicado, com aula publicada e limite de 3 vagas. */
async function cursoDaCasa(limite = 3) {
  const area = await queryOne<{ id: number }>('SELECT id::int AS id FROM area WHERE portal_id = 0 ORDER BY id LIMIT 1');
  const { id: bruto } = await criarMateria('teste', 0, {
    areaId: area!.id, nome: 'Teste Vagas Curso', ementa: 'x'.repeat(80), status: 'publicado',
    professor: 'Casa', ordem: 99, naVitrinePlataforma: false, vagasSemOrcamento: limite,
  });
  const id = Number(bruto);   // BIGINT chega como texto
  await query(`UPDATE materia SET slug = 'teste-vagas-curso' WHERE id = $1`, [id]);
  const [s] = await query<{ id: number }>(
    `INSERT INTO assunto (portal_id, materia_id, slug, nome, ordem) VALUES (0, $1, 'teste-vagas-a', 'A', 1) RETURNING id`, [id]);
  await query(
    `INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, status, ordem)
     VALUES (0, $1, 'teste-vagas-aula', 'Aula', 60, 'Resumo longo o bastante para a aula publicada passar na regra do banco sobre o resumo obrigatorio.', 'publicado', 1)`, [s.id]);
  return id;
}

test('o limite é do curso: até ele compra na hora, acima só orçamento', talvez, async () => {
  await limpar();
  const emp = await empresa();
  if (!emp) return;
  const materiaId = await cursoDaCasa(3);
  const aVenda = (await cursosAVenda()).find((c) => c.id === materiaId);
  assert.ok(aVenda, 'o curso publicado com aula está à venda');
  assert.equal(aVenda!.vagasSemOrcamento, 3);

  const gestorId = (await cadastrar(0, 'Gestor Teste', email('gestor'), SENHA))!;
  const gestor = { id: gestorId, email: email('gestor') };
  await assert.rejects(() => comprarVagas(gestor, emp.id, materiaId, 4, 'PIX'), /por orçamento/);
  await assert.rejects(() => pedirOrcamento(gestor.email, emp.id, materiaId, 2, ''), /sem orçamento/);

  const pedido = await comprarVagas(gestor, emp.id, materiaId, 3, 'PIX');
  const linha = await queryOne<{ quantidade: number; empresaPortalId: number; centavos: number }>(
    `SELECT quantidade, empresa_portal_id::int AS "empresaPortalId", centavos FROM pedido WHERE referencia = $1`, [pedido.referencia]);
  assert.equal(linha?.quantidade, 3);
  assert.equal(linha?.empresaPortalId, emp.id);
  assert.equal(linha?.centavos, aVenda!.precoAnualCentavos * 3, 'quantidade × preço anual');
});

test('o pagamento vira lote; a vaga distribuída é licença B2B do curso da plataforma; devolver libera', talvez, async () => {
  await limpar();
  const emp = await empresa();
  if (!emp) return;
  const materiaId = await cursoDaCasa(5);
  const gestorId = (await cadastrar(0, 'Gestor Dois', email('gestor2'), SENHA))!;
  const gestor = { id: gestorId, email: email('gestor2') };
  const pedido = await comprarVagas(gestor, emp.id, materiaId, 2, 'PIX');

  const r = await confirmarPagamento(
    { eventoId: `teste-vagas-${Date.now()}`, tipo: 'pagamento.confirmado', referencia: pedido.referencia, centavos: pedido.centavos },
    'simulado', {});
  assert.equal(r.ok, true);
  assert.ok(r.ok && 'loteId' in r && r.loteId, 'nasce um lote, não uma licença para o gestor');
  assert.equal(await queryOne('SELECT 1 FROM licenca WHERE pedido_id = $1', [pedido.id]), null, 'o gestor não ganha licença');

  const [lote] = await lotesDaEmpresa(emp.id);
  assert.equal(lote.quantidade, 2);
  assert.equal(lote.usadas, 0);
  assert.equal(lote.materiaPortalId, 0);

  // duas colaboradoras da empresa
  const [a] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel) VALUES ($1, 'Colab A', $2, 'aluno') RETURNING id::int AS id`, [emp.id, email('a')]);
  const [b] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel) VALUES ($1, 'Colab B', $2, 'aluno') RETURNING id::int AS id`, [emp.id, email('b')]);
  const [c] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel) VALUES ($1, 'Colab C', $2, 'aluno') RETURNING id::int AS id`, [emp.id, email('c')]);

  // pessoa de fora do portal não recebe vaga
  await assert.rejects(() => distribuirVaga('rh', emp.id, lote.id, gestorId), /não é colaboradora/);
  const lcA = await distribuirVaga('rh', emp.id, lote.id, a.id);
  await assert.rejects(() => distribuirVaga('rh', emp.id, lote.id, a.id), /já tem vaga/);
  await distribuirVaga('rh', emp.id, lote.id, b.id);
  await assert.rejects(() => distribuirVaga('rh', emp.id, lote.id, c.id), /todas as vagas/);
  assert.equal((await lotesDaEmpresa(emp.id))[0].usadas, 2);

  const lic = await queryOne<{ origem: string; portalId: number; materiaPortalId: number; loteId: number }>(
    `SELECT origem, portal_id::int AS "portalId", materia_portal_id::int AS "materiaPortalId", lote_id::int AS "loteId"
       FROM licenca WHERE id = $1`, [lcA]);
  assert.deepEqual(lic, { origem: 'B2B', portalId: emp.id, materiaPortalId: 0, loteId: lote.id });
  // e aparece em "minhas trilhas" da colaboradora, como curso da plataforma
  const minhas = await trilhasDoColaborador(emp.id, a.id);
  assert.ok(minhas.some((t) => Number(t.materiaId) === materiaId && t.materiaPortalId === 0));

  await devolverVaga('rh', emp.id, lcA);
  assert.equal((await lotesDaEmpresa(emp.id))[0].usadas, 1);
  assert.equal((await vagasOcupadas(emp.id)).length, 1);
  await distribuirVaga('rh', emp.id, lote.id, c.id);
  assert.equal((await lotesDaEmpresa(emp.id))[0].usadas, 2);
});

test('orçamento: pedido acima do limite, proposta do comercial, aceite vira pedido pelo valor proposto', talvez, async () => {
  await limpar();
  const emp = await empresa();
  if (!emp) return;
  const materiaId = await cursoDaCasa(1);
  const gestorId = (await cadastrar(0, 'Gestor Três', email('gestor3'), SENHA))!;
  const gestor = { id: gestorId, email: email('gestor3') };

  const id = await pedirOrcamento(gestor.email, emp.id, materiaId, 40, 'para o setor comercial');
  assert.equal((await orcamentosDaEmpresa(emp.id))[0].status, 'novo');
  await assert.rejects(() => aceitarOrcamento(gestor, emp.id, id, 'PIX'), /ainda não tem proposta/);

  await responderOrcamento('comercial', id, 199_000, '40 vagas com 20% de desconto');
  const o = (await orcamentosDaEmpresa(emp.id))[0];
  assert.equal(o.status, 'proposto');
  assert.equal(o.valorCentavos, 199_000);

  const pedido = await aceitarOrcamento(gestor, emp.id, id, 'PIX');
  assert.equal(pedido.centavos, 199_000, 'o pedido é pelo valor proposto, não pela tabela');
  const depois = (await orcamentosDaEmpresa(emp.id))[0];
  assert.equal(depois.status, 'aceito');
  assert.equal(depois.pedidoReferencia, pedido.referencia);

  const r = await confirmarPagamento(
    { eventoId: `teste-vagas-orc-${Date.now()}`, tipo: 'pagamento.confirmado', referencia: pedido.referencia, centavos: pedido.centavos },
    'simulado', {});
  assert.ok(r.ok && 'loteId' in r);
  const [lote] = await lotesDaEmpresa(emp.id);
  assert.equal(lote.quantidade, 40);

  const outro = await pedirOrcamento(gestor.email, emp.id, materiaId, 12, '');
  await recusarOrcamento('comercial', outro, 'sem estoque de vagas');
  assert.equal((await orcamentosDaEmpresa(emp.id)).find((x) => x.id === outro)?.status, 'recusado');
});

test.after(async () => {
  if (temBanco) await limpar();
  await pool.end();
});
