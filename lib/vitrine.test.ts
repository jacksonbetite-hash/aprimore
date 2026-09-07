import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Vitrine compartilhada contra banco real — §5.10.2, etapa 5.
 *
 * É a única etapa que mexe na trava de isolamento (§15.14), então os
 * testes são adversariais de propósito: a exceção nova (plataforma vende
 * curso de parceiro) tem de existir SEM abrir a porta que a trava fechava
 * (portal vendendo curso de outro portal).
 */
const { pool, query, queryOne } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');
const { abrirSubconta, processarEventoSubconta } = await import('./portal-subconta.ts');
const { abrirPedido, confirmarPagamento } = await import('./checkout.ts');
const { listarMateriasCompartilhadas } = await import('./vitrine.ts');
const { podeAcessar, espectadorParaCurso, licencaVigente } = await import('./licenca.ts');

let temBanco = true;
try { await pool.query('SELECT materia_portal_id FROM licenca LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };
process.env.LIMITE_PORTAIS = '50';

let n = 700;
const dados = () => ({
  nome: 'Prof. Vitrine', email: `teste-vit-${++n}@exemplo.com`,
  senha: 'senha-bem-longa', cnpj: '11.222.333/0001-81',
  telefone: '(11) 98765-4321', rendaMensalCentavos: 800000,
  endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista' },
  mascara: `teste-vit-${n}`, nomeExibicao: `Portal Vitrine ${n}`,
  meio: 'PIX' as const, aceitouContrato: true, ip: '203.0.113.17',
});

async function limparRastros() {
  const meus = `SELECT id FROM portal WHERE mascara LIKE 'teste-vit-%'`;
  // Compras da plataforma de cursos destes portais também são rastro.
  await query(`DELETE FROM licenca WHERE materia_portal_id IN (${meus})`);
  await query(`DELETE FROM assinatura WHERE materia_portal_id IN (${meus})`);
  await query(`DELETE FROM pedido  WHERE materia_portal_id IN (${meus})`);
  await query(`DELETE FROM preco   WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM materia WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM area    WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM usuario WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM portal  WHERE mascara LIKE 'teste-vit-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-vit-%@exemplo.com'
                                      OR email LIKE 'aluno-vit-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-vit-%'`);
}
if (temBanco) await limparRastros();

/** Portal ATIVO com subconta aprovada e um curso publicado (compartilhado ou não). */
async function portalComCurso(compartilhado: boolean) {
  const r = await assinarPortal(dados());
  await confirmarPagamentoFatura(
    { eventoId: `ev-vit-fat-${n}`, tipo: 'pagamento.confirmado', referencia: r.referencia, centavos: 14900 },
    'simulado', {});
  const sub = await abrirSubconta(r.portalId) as { subcontaId: string };
  await processarEventoSubconta(
    { eventoId: `ev-vit-sub-${n}`, tipo: 'subconta.aprovada', referencia: sub.subcontaId, centavos: 0 },
    'simulado', {});
  const [area] = await query<{ id: number }>(
    `INSERT INTO area (portal_id, slug, nome) VALUES ($1, 'a', 'Área') RETURNING id`, [r.portalId]);
  const [mat] = await query<{ id: number }>(
    `INSERT INTO materia (portal_id, area_id, slug, nome, ementa, status, na_vitrine_plataforma)
     VALUES ($1, $2, 'curso-vit-${n}', 'Curso Vitrine ${n}', 'ementa', 'publicado', $3) RETURNING id`,
    [r.portalId, area.id, compartilhado]);
  return { portalId: r.portalId, materiaId: mat.id, mascara: `teste-vit-${n}` };
}

async function alunoDaPlataforma() {
  const [u] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES (0, 'Aluno da Plataforma', 'aluno-vit-${++n}@exemplo.com', 'aluno') RETURNING id`);
  return { id: u.id, email: `aluno-vit-${n}@exemplo.com` };
}

test('a vitrine lista só curso publicado, marcado, de portal ATIVO', talvez, async () => {
  const sim = await portalComCurso(true);
  const nao = await portalComCurso(false);
  const lista = await listarMateriasCompartilhadas();
  assert.ok(lista.some((m) => m.id === sim.materiaId), 'o compartilhado aparece');
  assert.ok(!lista.some((m) => m.id === nao.materiaId), 'o não compartilhado não aparece');
  assert.equal(lista.find((m) => m.id === sim.materiaId)!.portalMascara, sim.mascara);

  await query(`UPDATE portal SET status = 'SUSPENSO' WHERE id = $1`, [sim.portalId]);
  assert.ok(!(await listarMateriasCompartilhadas()).some((m) => m.id === sim.materiaId),
    'portal suspenso some da vitrine');
});

test('aluno da plataforma compra curso de parceiro: venda nossa, comissão gravada, licença com os dois portais', talvez, async () => {
  const curso = await portalComCurso(true);
  const aluno = await alunoDaPlataforma();

  const pedido = await abrirPedido(0, aluno.id, aluno.email, 'MATERIA', 'mensal', curso.materiaId, 'PIX');
  const g = await queryOne<{ portalId: number; materiaPortalId: number; comissao: string; pct: string | null }>(
    `SELECT portal_id AS "portalId", materia_portal_id AS "materiaPortalId",
            comissao_professor_pp AS comissao, percentual_aplicado AS pct
       FROM pedido WHERE referencia = $1`, [pedido.referencia]);
  assert.equal(Number(g!.portalId), 0, 'a venda é da plataforma');
  assert.equal(Number(g!.materiaPortalId), Number(curso.portalId), 'o curso é do parceiro');
  assert.equal(Number(g!.comissao), 50, 'comissão do contrato gravada no ato');
  assert.equal(g!.pct, null, 'sem split: não é venda do portal');
  assert.equal(pedido.centavos, 2490, 'preço NOSSO (tabela da plataforma), não o do portal');

  const c = await confirmarPagamento(
    { eventoId: `ev-vit-pay-${n}`, tipo: 'pagamento.confirmado', referencia: pedido.referencia, centavos: 2490 },
    'simulado', {});
  assert.equal(c.ok, true);
  const l = await queryOne<{ portalId: number; materiaPortalId: number; status: string }>(
    `SELECT portal_id AS "portalId", materia_portal_id AS "materiaPortalId", status
       FROM licenca WHERE pedido_id = (SELECT id FROM pedido WHERE referencia = $1)`, [pedido.referencia]);
  assert.equal(Number(l!.portalId), 0);
  assert.equal(Number(l!.materiaPortalId), Number(curso.portalId));
  assert.equal(l!.status, 'ATIVA');
});

test('curso NÃO compartilhado não se compra na plataforma', talvez, async () => {
  const curso = await portalComCurso(false);
  const aluno = await alunoDaPlataforma();
  await assert.rejects(
    abrirPedido(0, aluno.id, aluno.email, 'MATERIA', 'mensal', curso.materiaId, 'PIX'),
    /não encontrada/,
  );
});

test('portal de professor NUNCA vende curso de outro portal — nem pela aplicação, nem pelo banco', talvez, async () => {
  const a = await portalComCurso(true);
  const b = await portalComCurso(true);
  const [alunoDeB] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES ($1, 'Aluno de B', 'aluno-vit-${++n}@exemplo.com', 'aluno') RETURNING id`, [b.portalId]);
  await query(`INSERT INTO preco (portal_id, produto, periodo, centavos, vigente_de)
               VALUES ($1, 'MATERIA', 'mensal', 1000, '2026-01-01')
               ON CONFLICT DO NOTHING`, [b.portalId]);

  await assert.rejects(
    abrirPedido(b.portalId, alunoDeB.id, `aluno-vit-${n}@exemplo.com`, 'MATERIA', 'mensal', a.materiaId, 'PIX'),
    /não encontrada/, 'a aplicação recusa',
  );
  await assert.rejects(
    query(`INSERT INTO licenca (usuario_id, portal_id, escopo, materia_id, materia_portal_id, origem, status, inicio_em, fim_em)
           VALUES ($1, $2, 'MATERIA', $3, $4, 'CORTESIA', 'ATIVA', now(), now() + interval '30 days')`,
      [alunoDeB.id, b.portalId, a.materiaId, a.portalId]),
    /licenca_curso_alheio_so_na_plataforma/, 'e o banco recusa mesmo que a aplicação erre',
  );
});

test('tirar o curso da vitrine não invalida quem já comprou', talvez, async () => {
  const curso = await portalComCurso(true);
  const aluno = await alunoDaPlataforma();
  const pedido = await abrirPedido(0, aluno.id, aluno.email, 'MATERIA', 'mensal', curso.materiaId, 'PIX');
  await confirmarPagamento(
    { eventoId: `ev-vit-keep-${n}`, tipo: 'pagamento.confirmado', referencia: pedido.referencia, centavos: 2490 },
    'simulado', {});
  await query(`UPDATE materia SET na_vitrine_plataforma = false WHERE id = $1`, [curso.materiaId]);

  const licencas = await query<{ id: number; escopo: 'MATERIA'; materiaId: number; origem: 'COMPRA'; status: 'ATIVA'; inicioEm: Date; fimEm: Date }>(
    `SELECT id, escopo, materia_id AS "materiaId", origem, status, inicio_em AS "inicioEm", fim_em AS "fimEm"
       FROM licenca WHERE usuario_id = $1`, [aluno.id]);
  assert.ok(licencas.some((l) => licencaVigente(l, new Date())), 'a licença segue vigente');
  const d = podeAcessar({ usuarioId: aluno.id, statusConta: 'ATIVA', licencas },
    { id: 1, materiaId: curso.materiaId, amostraGratuita: false, noTrial: false });
  assert.equal(d.libera, true);
});

test('o passe completo da plataforma não abre curso de parceiro', () => {
  const passe = {
    id: 1, escopo: 'CATALOGO' as const, materiaId: null, origem: 'COMPRA' as const,
    status: 'ATIVA' as const, inicioEm: new Date(Date.now() - 1000), fimEm: new Date(Date.now() + 1e9),
  };
  const espectador = { usuarioId: 1, statusConta: 'ATIVA' as const, licencas: [passe] };
  const aula = { id: 9, materiaId: 42, amostraGratuita: false, noTrial: false };
  assert.equal(podeAcessar(espectadorParaCurso(espectador, true), aula).libera, true,
    'no próprio portal, o passe abre');
  assert.equal(podeAcessar(espectadorParaCurso(espectador, false), aula).libera, false,
    'em curso de parceiro, não');
});

test.after(async () => {
  if (temBanco) await limparRastros();
  await pool.end();
});
