import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Apuração da comissão de vitrine contra banco real — §5.6.1.
 *
 * É dinheiro que sai do nosso caixa para o do professor: cada venda uma
 * vez, cada reembolso uma vez, mínimo de saque respeitado, nada pago sem
 * nota. O banco garante o "uma vez" (UNIQUE); os testes garantem o resto.
 */
const { pool, query, queryOne } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');
const { abrirSubconta, processarEventoSubconta } = await import('./portal-subconta.ts');
const { abrirPedido, confirmarPagamento, pedirReembolso } = await import('./checkout.ts');
const {
  apurarComissao, contestarApuracao, aprovarApuracao, aprovarVencidas,
  informarNota, registrarRepasse, pagarRepasse, prazoDePagamento, itensDaApuracao, MINIMO_SAQUE_CENTAVOS,
} = await import('./apuracao.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM apuracao LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };
process.env.LIMITE_PORTAIS = '50';

let n = 900;
const dados = () => ({
  nome: 'Prof. Apuração', email: `teste-apu-${++n}@exemplo.com`,
  senha: 'senha-bem-longa', cnpj: '11.222.333/0001-81',
  telefone: '(11) 98765-4321', rendaMensalCentavos: 800000,
  endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista' },
  mascara: `teste-apu-${n}`, nomeExibicao: `Portal Apuração ${n}`,
  meio: 'PIX' as const, aceitouContrato: true, ip: '203.0.113.19',
});

async function limparRastros() {
  const meus = `SELECT id FROM portal WHERE mascara LIKE 'teste-apu-%'`;
  // Apuração incorporada é referenciada pela posterior (item SALDO_ANTERIOR
  // e incorporada_em): desfaz os vínculos antes de apagar — em produção
  // apuração não se apaga, só em teste.
  await query(`DELETE FROM apuracao_item WHERE apuracao_id IN (SELECT id FROM apuracao WHERE portal_id IN (${meus}))`);
  await query(`UPDATE apuracao SET status = 'SEM_VALOR', incorporada_em = NULL
                WHERE portal_id IN (${meus}) AND status = 'INCORPORADA'`);
  await query(`DELETE FROM apuracao WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM licenca WHERE materia_portal_id IN (${meus})`);
  await query(`DELETE FROM assinatura WHERE materia_portal_id IN (${meus})`);
  await query(`DELETE FROM pedido  WHERE materia_portal_id IN (${meus})`);
  await query(`DELETE FROM materia WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM area    WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM usuario WHERE portal_id IN (${meus})`);
  // `preco` não tem ON DELETE CASCADE, e o portal agora nasce com tabela.
  await query(`DELETE FROM preco   WHERE portal_id IN (${meus})`);
  await query(`DELETE FROM portal  WHERE mascara LIKE 'teste-apu-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-apu-%@exemplo.com' OR email LIKE 'aluno-apu-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-apu-%'`);
}
if (temBanco) await limparRastros();

/** Portal com contrato (50% de vitrine) e um curso compartilhado, mais um aluno da plataforma. */
async function cenario() {
  const r = await assinarPortal(dados());
  await confirmarPagamentoFatura(
    { eventoId: `ev-apu-fat-${n}`, tipo: 'pagamento.confirmado', referencia: r.referencia, centavos: 14900 }, 'simulado', {});
  const sub = await abrirSubconta(r.portalId) as { subcontaId: string };
  await processarEventoSubconta(
    { eventoId: `ev-apu-sub-${n}`, tipo: 'subconta.aprovada', referencia: sub.subcontaId, centavos: 0 }, 'simulado', {});
  const [area] = await query<{ id: number }>(
    `INSERT INTO area (portal_id, slug, nome) VALUES ($1, 'a', 'A') RETURNING id`, [r.portalId]);
  const [mat] = await query<{ id: number }>(
    `INSERT INTO materia (portal_id, area_id, slug, nome, ementa, status, na_vitrine_plataforma)
     VALUES ($1, $2, 'c', 'Curso', 'e', 'publicado', true) RETURNING id`, [r.portalId, area.id]);
  const [aluno] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES (0, 'Aluno', 'aluno-apu-${n}@exemplo.com', 'aluno') RETURNING id`);
  const email = `aluno-apu-${n}@exemplo.com`;
  let k = 0;
  /** Compra paga, com pago_em na data pedida (o preço da plataforma é R$ 24,90). */
  const venda = async (pagoEm: string) => {
    const p = await abrirPedido(0, aluno.id, email, 'MATERIA', 'mensal', mat.id, 'PIX');
    await confirmarPagamento(
      { eventoId: `ev-apu-pay-${n}-${++k}`, tipo: 'pagamento.confirmado', referencia: p.referencia, centavos: p.centavos },
      'simulado', {});
    await query(`UPDATE pedido SET pago_em = $2 WHERE referencia = $1`, [p.referencia, pagoEm]);
    return p;
  };
  return { portalId: r.portalId, alunoId: aluno.id, email, venda };
}

test('apura o mês: cada venda uma vez, 50% do bruto; abaixo de R$ 100 acumula', talvez, async () => {
  const c = await cenario();
  await c.venda('2026-07-10T12:00:00Z');
  await c.venda('2026-07-20T12:00:00Z');

  const a = await apurarComissao('teste', c.portalId, '2026-07-01');
  assert.equal(a.vendas, 2);
  assert.equal(a.centavosComissao, 2 * Math.round(2490 * 0.5), '50% de duas vendas de R$ 24,90');
  assert.equal(a.status, 'ACUMULADA', 'R$ 24,90 é menos que o mínimo de saque');

  await assert.rejects(apurarComissao('teste', c.portalId, '2026-07-01'), /já foi apurada/);

  // Mês seguinte sem venda: incorpora o saldo, continua acumulando.
  const b = await apurarComissao('teste', c.portalId, '2026-08-01');
  assert.equal(b.status, 'ACUMULADA');
  assert.equal(b.centavosComissao, a.centavosComissao, 'saldo anterior entrou inteiro');
  const anterior = await queryOne<{ status: string }>(`SELECT status FROM apuracao WHERE id = $1`, [a.id]);
  assert.equal(anterior!.status, 'INCORPORADA');
  const itens = await itensDaApuracao(b.id);
  assert.equal(itens.filter((i) => i.tipo === 'SALDO_ANTERIOR').length, 1);
});

test('reembolso deduz no mês em que ocorre — não no da venda', talvez, async () => {
  const c = await cenario();
  const p = await c.venda('2026-05-05T12:00:00Z');
  const mai = await apurarComissao('teste', c.portalId, '2026-05-01');
  assert.equal(mai.centavosComissao, 1245);

  // Reembolso pedido depois (dentro dos 7 dias do CDC, pelo relógio da venda).
  await query(`UPDATE pedido SET pago_em = now() - interval '2 days' WHERE referencia = $1`, [p.referencia]);
  await pedirReembolso(c.alunoId, c.email, (await queryOne<{ id: number }>(
    `SELECT id FROM pedido WHERE referencia = $1`, [p.referencia]))!.id);
  await query(`UPDATE reembolso SET criado_em = '2026-06-03' WHERE pedido_id = (SELECT id FROM pedido WHERE referencia = $1)`, [p.referencia]);

  const jun = await apurarComissao('teste', c.portalId, '2026-06-01');
  assert.equal(jun.reembolsos, 1);
  // saldo de maio (1245) − dedução (1245) = 0
  assert.equal(jun.centavosComissao, 0);
  const itens = await itensDaApuracao(jun.id);
  assert.ok(itens.some((i) => i.tipo === 'REEMBOLSO' && i.centavosComissao === -1245), 'dedução negativa, venda a venda');
});

test('acima do mínimo: conferência, contestação no prazo, aprovação, nota e pagamento', talvez, async () => {
  const c = await cenario();
  for (let i = 0; i < 9; i++) await c.venda('2026-04-10T12:00:00Z');   // 9 × 12,45 = 112,05
  const a = await apurarComissao('teste', c.portalId, '2026-04-01');
  assert.ok(a.centavosComissao >= MINIMO_SAQUE_CENTAVOS);
  assert.equal(a.status, 'EM_CONFERENCIA');

  await assert.rejects(informarNota(c.portalId, a.id, 'NF 1'), /depois da aprovação/);
  await assert.rejects(registrarRepasse('admin', a.id, 'PIX 123'), /aprovada/);

  await contestarApuracao(c.portalId, a.id, 'Faltou uma venda do dia 30.');
  await assert.rejects(aprovarApuracao('admin', a.id), /responda a contestação/);
  await aprovarApuracao('admin', a.id, 'A venda do dia 30 caiu em maio, pelo relógio do pagamento.');

  await assert.rejects(registrarRepasse('admin', a.id, 'PIX 123'), /nota fiscal/);
  await informarNota(c.portalId, a.id, 'NF-0001');
  await registrarRepasse('admin', a.id, 'PIX E2E-123');
  const fim = await queryOne<{ status: string; nf: string }>(
    `SELECT status, nf_numero AS nf FROM apuracao WHERE id = $1`, [a.id]);
  assert.equal(fim!.status, 'PAGA');
  assert.equal(fim!.nf, 'NF-0001');
});

test('prazo de pagamento: dia 15 do mês seguinte à competência', () => {
  assert.equal(prazoDePagamento('2026-04-01').toISOString().slice(0, 10), '2026-05-15');
  assert.equal(prazoDePagamento(new Date(2026, 11, 1)).getFullYear(), 2027, 'vira o ano');
});

test('repasse pelo gateway: só aprovada, com nota e subconta aprovada; PAGA com o id da transferência', talvez, async () => {
  const c = await cenario();
  for (let i = 0; i < 9; i++) await c.venda('2026-07-10T12:00:00Z');
  const a = await apurarComissao('teste', c.portalId, '2026-07-01');
  await assert.rejects(pagarRepasse('admin', a.id), /aprovada/);
  await aprovarApuracao('admin', a.id);
  await assert.rejects(pagarRepasse('admin', a.id), /nota fiscal/);
  await informarNota(c.portalId, a.id, 'NF-0002');

  // sem carteira não há para onde mandar (a situação da subconta tem CHECK
  // com a escrow — a carteira é o jeito de simular a conta que não serve)
  const [{ wallet }] = await query<{ wallet: string }>(
    `SELECT gateway_wallet_id AS wallet FROM portal WHERE id = $1`, [c.portalId]);
  await query(`UPDATE portal SET gateway_wallet_id = NULL WHERE id = $1`, [c.portalId]);
  await assert.rejects(pagarRepasse('admin', a.id), /não está aprovada/);
  await query(`UPDATE portal SET gateway_wallet_id = $2 WHERE id = $1`, [c.portalId, wallet]);

  const r = await pagarRepasse('admin', a.id);
  assert.match(r.comprovante, /^simulado:trf_/);
  assert.equal(r.centavos, a.centavosComissao);
  const fim = await queryOne<{ status: string; comprovante: string }>(
    `SELECT status, comprovante FROM apuracao WHERE id = $1`, [a.id]);
  assert.equal(fim!.status, 'PAGA');
  assert.equal(fim!.comprovante, r.comprovante);
  await assert.rejects(pagarRepasse('admin', a.id), /aprovada/, 'não se paga duas vezes');
});

test('contestação fora do prazo é recusada; prazo vencido aprova sozinho', talvez, async () => {
  const c = await cenario();
  for (let i = 0; i < 9; i++) await c.venda('2026-03-10T12:00:00Z');
  const a = await apurarComissao('teste', c.portalId, '2026-03-01');
  await query(`UPDATE apuracao SET prazo_contestacao = current_date - 1 WHERE id = $1`, [a.id]);
  await assert.rejects(contestarApuracao(c.portalId, a.id, 'tarde'), /prazo/);
  assert.ok((await aprovarVencidas('script')) >= 1);
  const s = await queryOne<{ status: string }>(`SELECT status FROM apuracao WHERE id = $1`, [a.id]);
  assert.equal(s!.status, 'APROVADA');
});

test('mês sem nada vira SEM_VALOR — registra que se apurou', talvez, async () => {
  const c = await cenario();
  const a = await apurarComissao('teste', c.portalId, '2025-12-01');
  assert.equal(a.status, 'SEM_VALOR');
  assert.equal(a.centavosComissao, 0);
});

test.after(async () => {
  if (temBanco) await limparRastros();
  await pool.end();
});
