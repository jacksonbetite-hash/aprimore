import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Subconta e trava de venda contra banco real — etapa 2 do §5.10.2.
 *
 * O que está em jogo é dinheiro indo para o lugar errado: portal sem
 * subconta aprovada NÃO PODE abrir pedido, porque a parte do professor
 * cairia no nosso caixa. E a aprovação precisa ligar a Conta Escrow com
 * o prazo do CONTRATO — subconta aprovada sem escrow é a janela em que
 * o professor saca antes do prazo de arrependimento do CDC.
 */
const { pool, query, queryOne } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');
const { abrirSubconta, processarEventoSubconta, MOTIVO_SEM_SUBCONTA } =
  await import('./portal-subconta.ts');
const { abrirPedido } = await import('./checkout.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM portal LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

process.env.LIMITE_PORTAIS = '50';

let n = 100;   // faixa própria, longe dos testes de assinatura
const dados = () => ({
  nome: 'Prof. Subconta', email: `teste-subconta-${++n}@exemplo.com`,
  senha: 'senha-bem-longa', cnpj: '11.222.333/0001-81',
  telefone: '(11) 98765-4321', rendaMensalCentavos: 800000,
  endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista' },
  mascara: `teste-subconta-${n}`, nomeExibicao: 'Portal Subconta',
  meio: 'PIX' as const, aceitouContrato: true, ip: '203.0.113.9',
});

const evFatura = (ref: string, id: string) =>
  ({ eventoId: id, tipo: 'pagamento.confirmado' as const, referencia: ref, centavos: 14900 });
const evSubconta = (subId: string, id: string, tipo: 'subconta.aprovada' | 'subconta.recusada' = 'subconta.aprovada') =>
  ({ eventoId: id, tipo, referencia: subId, centavos: 0 });

// Roda antes E depois: sobra de portal ocupa o teto regulatório do
// autosserviço no banco compartilhado. A loja de teste (aluno, área,
// matéria, preço, pedido) referencia o portal SEM cascade — de
// propósito, no schema — então a limpeza desce de filho para pai.
async function limparRastros() {
  const meus = `SELECT id FROM portal WHERE mascara LIKE 'teste-subconta-%'`;
  await query(`DELETE FROM pedido  WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM licenca WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM preco   WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM materia WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM area    WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM usuario WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM portal  WHERE mascara LIKE 'teste-subconta-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-subconta-%@exemplo.com'
                                      OR email LIKE 'aluno-subconta-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-sub-%'`);
}
if (temBanco) await limparRastros();

/** Contrata, paga e devolve um portal ATIVO com a subconta EM_ANALISE. */
async function portalAtivo() {
  const d = dados();
  const r = await assinarPortal(d);
  await confirmarPagamentoFatura(evFatura(r.referencia, `ev-sub-fat-${n}`), 'simulado', {});
  const aberta = await abrirSubconta(r.portalId);
  return { ...r, subcontaId: (aberta as { subcontaId: string }).subcontaId };
}

/** Aluno, matéria publicada e preço dentro do portal, para testar venda. */
async function montarLoja(portalId: number) {
  const [aluno] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES ($1, 'Aluno do Portal', 'aluno-subconta-${n}@exemplo.com', 'aluno')
     RETURNING id`, [portalId]);
  const [area] = await query<{ id: number }>(
    `INSERT INTO area (portal_id, slug, nome) VALUES ($1, 'area-teste', 'Área') RETURNING id`,
    [portalId]);
  const [mat] = await query<{ id: number }>(
    `INSERT INTO materia (portal_id, area_id, slug, nome, ementa, status)
     VALUES ($1, $2, 'materia-teste', 'Matéria', 'e', 'publicado') RETURNING id`,
    [portalId, area.id]);
  await query(
    `INSERT INTO preco (portal_id, produto, periodo, centavos, vigente_de)
     VALUES ($1, 'MATERIA', 'mensal', 3990, '2026-01-01')
               ON CONFLICT DO NOTHING`, [portalId]);
  return { alunoId: aluno.id, materiaId: mat.id };
}

test('portal ativado abre subconta EM_ANALISE, com id e carteira guardados', talvez, async () => {
  const p = await portalAtivo();
  const linha = await queryOne<{ situacao: string; sub: string; wal: string }>(
    `SELECT subconta_situacao AS situacao, gateway_subconta_id AS sub,
            gateway_wallet_id AS wal FROM portal WHERE id = $1`, [p.portalId]);
  assert.equal(linha!.situacao, 'EM_ANALISE');
  assert.ok(linha!.sub.startsWith('sub_'));
  assert.ok(linha!.wal.startsWith('wal_'));

  const denovo = await abrirSubconta(p.portalId);
  assert.equal(denovo.criada, false, 'abrir de novo é no-op, não segunda subconta');
});

test('EM ANÁLISE não vende — a trava explica o porquê', talvez, async () => {
  const p = await portalAtivo();
  const loja = await montarLoja(p.portalId);
  await assert.rejects(
    abrirPedido(p.portalId, loja.alunoId, `aluno-subconta-${n}@exemplo.com`,
      'MATERIA', 'mensal', loja.materiaId, 'PIX'),
    new RegExp(MOTIVO_SEM_SUBCONTA.slice(0, 40)),
  );
});

test('aprovação liga a escrow com o prazo do contrato; aí a venda abre com split', talvez, async () => {
  const p = await portalAtivo();
  const loja = await montarLoja(p.portalId);

  const r = await processarEventoSubconta(
    evSubconta(p.subcontaId, `ev-sub-ap-${n}`), 'simulado', {});
  assert.equal(r.ok && r.situacao, 'APROVADA');

  const linha = await queryOne<{ dias: number; em: Date }>(
    `SELECT escrow_dias AS dias, escrow_habilitada_em AS em FROM portal WHERE id = $1`,
    [p.portalId]);
  assert.equal(linha!.dias, 30, 'prazo copiado do contrato (dias_retencao padrão)');
  assert.ok(linha!.em, 'escrow habilitada na mesma passada');

  const pedido = await abrirPedido(p.portalId, loja.alunoId,
    `aluno-subconta-${n}@exemplo.com`, 'MATERIA', 'mensal', loja.materiaId, 'PIX');

  const gravado = await queryOne<{ pct: string; portalId: number }>(
    `SELECT percentual_aplicado AS pct, portal_id AS "portalId"
       FROM pedido WHERE referencia = $1`, [pedido.referencia]);
  assert.equal(Number(gravado!.pct), 10, 'percentual do contrato GRAVADO no pedido');
  assert.equal(Number(gravado!.portalId), Number(p.portalId));

  const pagamento = await queryOne<{ detalhe: { split?: { walletId: string; percentualRetido: number } } }>(
    `SELECT pg.detalhe FROM pagamento pg JOIN pedido pd ON pd.id = pg.pedido_id
      WHERE pd.referencia = $1`, [pedido.referencia]);
  assert.ok(pagamento!.detalhe.split?.walletId.startsWith('wal_'),
    'split registrado com a carteira do professor');
  assert.equal(pagamento!.detalhe.split?.percentualRetido, 10);
});

test('o mesmo evento de aprovação chegando duas vezes não reprocessa', talvez, async () => {
  const p = await portalAtivo();
  const ev = evSubconta(p.subcontaId, `ev-sub-rep-${n}`);
  const a = await processarEventoSubconta(ev, 'simulado', {});
  const b = await processarEventoSubconta(ev, 'simulado', {});
  assert.equal(a.ok && a.jaProcessado, false);
  assert.equal(b.ok && b.jaProcessado, true);
});

test('recusa marca RECUSADA e a venda continua travada', talvez, async () => {
  const p = await portalAtivo();
  const loja = await montarLoja(p.portalId);
  const r = await processarEventoSubconta(
    evSubconta(p.subcontaId, `ev-sub-rec-${n}`, 'subconta.recusada'), 'simulado', {});
  assert.equal(r.ok && r.situacao, 'RECUSADA');
  await assert.rejects(
    abrirPedido(p.portalId, loja.alunoId, `aluno-subconta-${n}@exemplo.com`,
      'MATERIA', 'mensal', loja.materiaId, 'PIX'),
    new RegExp(MOTIVO_SEM_SUBCONTA.slice(0, 40)),
  );
});

test('venda da plataforma segue sem split e sem percentual', talvez, async () => {
  // Regressão: a trava nova não pode encostar no fluxo que já existia.
  const [aluno] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES (0, 'Aluno Plataforma', 'aluno-subconta-${++n}@exemplo.com', 'aluno')
     RETURNING id`);
  const [mat] = await query<{ id: number }>(
    `SELECT id FROM materia WHERE portal_id = 0 AND status = 'publicado'
        AND slug NOT LIKE 'prog-%' AND slug NOT LIKE 'teste-%' ORDER BY ordem LIMIT 1`);
  const pedido = await abrirPedido(0, aluno.id, `aluno-subconta-${n}@exemplo.com`,
    'MATERIA', 'mensal', mat.id, 'PIX');
  const gravado = await queryOne<{ pct: string | null }>(
    `SELECT percentual_aplicado AS pct FROM pedido WHERE referencia = $1`, [pedido.referencia]);
  assert.equal(gravado!.pct, null, 'plataforma não tem percentual de portal');
});

test.after(async () => {
  if (temBanco) await limparRastros();
  await pool.end();
});
