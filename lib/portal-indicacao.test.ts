import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Indicação contra banco real — §5.10.1.
 *
 * O que está em jogo: cobrar 5 pontos a mais do professor exige provar
 * que o aluno veio de nós. O vínculo nasce no clique, fecha no cadastro,
 * aplica na abertura do pedido e se GASTA no pagamento — uma vez só.
 * Errar para cima é disputa (§15.12); errar para baixo é receita perdida.
 */
const { pool, query, queryOne } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');
const { abrirSubconta, processarEventoSubconta } = await import('./portal-subconta.ts');
const { criarIndicacao, vincularIndicacao, indicacaoViva } = await import('./portal-indicacao.ts');
const { abrirPedido, confirmarPagamento } = await import('./checkout.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM indicacao LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };
process.env.LIMITE_PORTAIS = '50';

let n = 300;
const dados = () => ({
  nome: 'Prof. Indicação', email: `teste-indic-${++n}@exemplo.com`,
  senha: 'senha-bem-longa', cnpj: '11.222.333/0001-81',
  telefone: '(11) 98765-4321', rendaMensalCentavos: 800000,
  endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista' },
  mascara: `teste-indic-${n}`, nomeExibicao: 'Portal Indicação',
  meio: 'PIX' as const, aceitouContrato: true, ip: '203.0.113.11',
});

async function limparRastros() {
  const meus = `SELECT id FROM portal WHERE mascara LIKE 'teste-indic-%'`;
  await query(`DELETE FROM pedido  WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM licenca WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM preco   WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM materia WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM area    WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM usuario WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM portal  WHERE mascara LIKE 'teste-indic-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-indic-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-ind-%'`);
}
if (temBanco) await limparRastros();

/** Portal ATIVO, subconta APROVADA, com aluno, curso e preço. */
async function lojaPronta() {
  const r = await assinarPortal(dados());
  await confirmarPagamentoFatura(
    { eventoId: `ev-ind-fat-${n}`, tipo: 'pagamento.confirmado', referencia: r.referencia, centavos: 14900 },
    'simulado', {});
  const sub = await abrirSubconta(r.portalId) as { subcontaId: string };
  await processarEventoSubconta(
    { eventoId: `ev-ind-sub-${n}`, tipo: 'subconta.aprovada', referencia: sub.subcontaId, centavos: 0 },
    'simulado', {});
  const [aluno] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES ($1, 'Aluno Indicado', 'aluno-indic-${n}@exemplo.com', 'aluno') RETURNING id`,
    [r.portalId]);
  const [area] = await query<{ id: number }>(
    `INSERT INTO area (portal_id, slug, nome) VALUES ($1, 'a', 'Área') RETURNING id`, [r.portalId]);
  const [mat] = await query<{ id: number }>(
    `INSERT INTO materia (portal_id, area_id, slug, nome, ementa, status)
     VALUES ($1, $2, 'm', 'Matéria', 'e', 'publicado') RETURNING id`, [r.portalId, area.id]);
  await query(`INSERT INTO preco (portal_id, produto, periodo, centavos, vigente_de)
               VALUES ($1, 'MATERIA', 'mensal', 20000, '2026-01-01')
               ON CONFLICT DO NOTHING`, [r.portalId]);
  const email = `aluno-indic-${n}@exemplo.com`;
  const comprar = () => abrirPedido(r.portalId, aluno.id, email, 'MATERIA', 'mensal', mat.id, 'PIX');
  return { portalId: r.portalId, alunoId: aluno.id, comprar };
}

test('clique cria indicação com o prazo do contrato', talvez, async () => {
  const loja = await lojaPronta();
  const { token, dias } = await criarIndicacao(loja.portalId, 'vitrine');
  assert.equal(dias, 90, 'validade padrão do contrato');
  const i = await queryOne<{ canal: string; falta: number }>(
    `SELECT canal, extract(day from expira_em - now())::int AS falta FROM indicacao WHERE token = $1`,
    [token]);
  assert.equal(i!.canal, 'vitrine');
  assert.ok(i!.falta >= 89, 'expira em ~90 dias');
});

test('cadastro vincula; a 1ª compra paga base + 5; o pagamento consome; a 2ª volta à base', talvez, async () => {
  const loja = await lojaPronta();
  const { token } = await criarIndicacao(loja.portalId);
  assert.equal(await vincularIndicacao(token, loja.alunoId, loja.portalId), true);
  assert.ok(await indicacaoViva(query, loja.alunoId, loja.portalId), 'indicação viva após o vínculo');

  const p1 = await loja.comprar();
  const g1 = await queryOne<{ pct: string; ind: number | null }>(
    `SELECT percentual_aplicado AS pct, indicacao_id AS ind FROM pedido WHERE referencia = $1`,
    [p1.referencia]);
  assert.equal(Number(g1!.pct), 15, '10 do contrato + 5 da indicação');
  assert.ok(g1!.ind, 'o pedido aponta para a indicação');

  // Ainda não consumida: só o pagamento gasta.
  assert.ok(await indicacaoViva(query, loja.alunoId, loja.portalId), 'Pix aberto não consome');

  const c = await confirmarPagamento(
    { eventoId: `ev-ind-pay-${n}`, tipo: 'pagamento.confirmado', referencia: p1.referencia, centavos: 20000 },
    'simulado', {});
  assert.equal(c.ok, true);
  const ind = await queryOne<{ consumida: Date | null; pedido: number | null }>(
    `SELECT consumida_em AS consumida, pedido_id AS pedido FROM indicacao WHERE token = $1`, [token]);
  assert.ok(ind!.consumida, 'consumida no pagamento');
  assert.equal(await indicacaoViva(query, loja.alunoId, loja.portalId), null);

  const p2 = await loja.comprar();
  const g2 = await queryOne<{ pct: string; ind: number | null }>(
    `SELECT percentual_aplicado AS pct, indicacao_id AS ind FROM pedido WHERE referencia = $1`,
    [p2.referencia]);
  assert.equal(Number(g2!.pct), 10, 'segunda compra: só a base');
  assert.equal(g2!.ind, null);
});

test('token vencido não vincula', talvez, async () => {
  const loja = await lojaPronta();
  const { token } = await criarIndicacao(loja.portalId);
  // O CHECK `indicacao_validade` exige expira_em > criada_em: envelhece
  // as duas datas juntas, como um clique de 100 dias atrás.
  await query(`UPDATE indicacao
                  SET criada_em = now() - interval '100 days', expira_em = now() - interval '10 days'
                WHERE token = $1`, [token]);
  assert.equal(await vincularIndicacao(token, loja.alunoId, loja.portalId), false);
});

test('token de outro portal não vincula', talvez, async () => {
  const a = await lojaPronta();
  const b = await lojaPronta();
  const { token } = await criarIndicacao(a.portalId);
  assert.equal(await vincularIndicacao(token, b.alunoId, b.portalId), false,
    'clique no anúncio do portal A não vira acréscimo no portal B');
});

test('segundo clique do mesmo aluno não duplica: uma indicação viva por aluno', talvez, async () => {
  const loja = await lojaPronta();
  const t1 = (await criarIndicacao(loja.portalId)).token;
  const t2 = (await criarIndicacao(loja.portalId)).token;
  assert.equal(await vincularIndicacao(t1, loja.alunoId, loja.portalId), true);
  assert.equal(await vincularIndicacao(t2, loja.alunoId, loja.portalId), false);
});

test.after(async () => {
  if (temBanco) await limparRastros();
  await pool.end();
});
