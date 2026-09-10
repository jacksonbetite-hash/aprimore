import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Testes de checkout contra banco real.
 *
 * O §8.3 é categórico: "webhook idempotente — o mesmo evento pode chegar
 * duas vezes e nunca pode liberar duas licenças". É a garantia mais cara
 * de errar aqui: o aluno paga uma vez e ganha duas licenças, ou o
 * gateway reenvia e a operação duplica receita no relatório.
 */
const { pool, query } = await import('./db.ts');
const { abrirPedido, confirmarPagamento, ativarTrial, cancelarAssinatura, pedirReembolso }
  = await import('./checkout.ts');
const { PORTAL_PLATAFORMA } = await import('./portal.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM pedido LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

const EMAIL = 'teste-checkout@exemplo.com';

async function usuarioDeTeste(): Promise<number> {
  const [u] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES (${PORTAL_PLATAFORMA}, 'Teste Checkout', $1, 'aluno')
     ON CONFLICT (portal_id, lower(email)) DO UPDATE SET nome = EXCLUDED.nome
     RETURNING id`, [EMAIL],
  );
  // a licença aponta para o pedido, então sai antes dele
  await query('DELETE FROM licenca WHERE usuario_id = $1', [u.id]);
  await query('DELETE FROM pedido WHERE usuario_id = $1', [u.id]);
  await query('DELETE FROM assinatura WHERE usuario_id = $1', [u.id]);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'teste-%'`);
  return u.id;
}

async function materiaPublicada(): Promise<number> {
  // Escopo explícito: com portais de professor no banco (§5.10), "qualquer
  // matéria publicada" pode ser a de outro portal — e o pedido, que é da
  // plataforma, seria recusado. O teste ficaria vermelho por dado de
  // vizinho, não por defeito.
  const [m] = await query<{ id: number }>(
    `SELECT id FROM materia
      WHERE status = 'publicado' AND portal_id = $1
        AND slug NOT LIKE 'prog-%' AND slug NOT LIKE 'teste-%'   -- matéria de OUTRO teste, em paralelo, some no meio
      ORDER BY ordem LIMIT 1`, [PORTAL_PLATAFORMA]);
  return m.id;
}

const evento = (
  ref: string, id: string,
  tipo: 'pagamento.confirmado' | 'pagamento.falhou' = 'pagamento.confirmado',
) => ({ eventoId: id, tipo, referencia: ref, centavos: 0 });

test('pagamento confirmado emite licença e marca o pedido como pago', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'PIX');

  const r = await confirmarPagamento(evento(pedido.referencia, 'teste-1'), 'simulado', {});
  assert.equal(r.ok, true);
  assert.ok(r.ok && r.licencaId);

  const [p] = await query<{ status: string }>('SELECT status FROM pedido WHERE id = $1', [pedido.id]);
  assert.equal(p.status, 'PAGO');
  const licencas = await query('SELECT id FROM licenca WHERE usuario_id = $1', [usuarioId]);
  assert.equal(licencas.length, 1, 'uma licença, exatamente');
});

test('o MESMO evento chegando duas vezes não emite segunda licença', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'PIX');

  const primeiro = await confirmarPagamento(evento(pedido.referencia, 'teste-repetido'), 'simulado', {});
  const segundo  = await confirmarPagamento(evento(pedido.referencia, 'teste-repetido'), 'simulado', {});

  assert.equal(primeiro.ok, true);
  assert.equal(segundo.ok, true);
  assert.ok(segundo.ok && segundo.jaProcessado, 'o reenvio precisa se declarar já processado');

  const licencas = await query('SELECT id FROM licenca WHERE usuario_id = $1', [usuarioId]);
  assert.equal(licencas.length, 1, 'reenvio do webhook NÃO pode duplicar licença');
});

test('dois eventos distintos no mesmo pedido também não duplicam', talvez, async () => {
  // gateway pode mandar dois ids diferentes para o mesmo pagamento;
  // a segunda guarda é o pedido só avançar quando ainda está ABERTO
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'PIX');

  await confirmarPagamento(evento(pedido.referencia, 'teste-a'), 'simulado', {});
  const segundo = await confirmarPagamento(evento(pedido.referencia, 'teste-b'), 'simulado', {});

  assert.equal(segundo.ok, false, 'pedido já finalizado não aceita nova confirmação');
  const licencas = await query('SELECT id FROM licenca WHERE usuario_id = $1', [usuarioId]);
  assert.equal(licencas.length, 1);
});

test('evento de pagamento falho não emite licença', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'CARTAO');

  const r = await confirmarPagamento(
    evento(pedido.referencia, 'teste-falha', 'pagamento.falhou'), 'simulado', {});
  assert.equal(r.ok, false);
  const licencas = await query('SELECT id FROM licenca WHERE usuario_id = $1', [usuarioId]);
  assert.equal(licencas.length, 0);
});

test('evento de pedido inexistente é recusado sem quebrar', talvez, async () => {
  const r = await confirmarPagamento(evento('AD-0000-XXXX', 'teste-orfao'), 'simulado', {});
  assert.equal(r.ok, false);
});

test('Pix avulso não cria assinatura; cartão cria', talvez, async () => {
  const materiaId = await materiaPublicada();

  let usuarioId = await usuarioDeTeste();
  const pix = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'PIX');
  await confirmarPagamento(evento(pix.referencia, 'teste-pix'), 'simulado', {});
  let assinaturas = await query('SELECT id FROM assinatura WHERE usuario_id = $1', [usuarioId]);
  assert.equal(assinaturas.length, 0, 'Pix avulso não renova sozinho (§6.4)');

  usuarioId = await usuarioDeTeste();
  const cartao = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'CATALOGO', 'anual', null, 'CARTAO');
  await confirmarPagamento(evento(cartao.referencia, 'teste-cartao'), 'simulado', {});
  assinaturas = await query('SELECT id FROM assinatura WHERE usuario_id = $1', [usuarioId]);
  assert.equal(assinaturas.length, 1, 'cartão renova automaticamente');
});

test('licença do passe cobre 12 meses no plano anual', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'CATALOGO', 'anual', null, 'PIX');
  await confirmarPagamento(evento(pedido.referencia, 'teste-anual'), 'simulado', {});
  const [l] = await query<{ meses: number; escopo: string }>(
    `SELECT escopo, EXTRACT(month FROM age(fim_em, inicio_em))::int
            + EXTRACT(year FROM age(fim_em, inicio_em))::int * 12 AS meses
       FROM licenca WHERE usuario_id = $1`, [usuarioId]);
  assert.equal(l.escopo, 'CATALOGO');
  assert.equal(l.meses, 12);
});

test('trial é um por conta', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  await ativarTrial(usuarioId, EMAIL, materiaId);
  await assert.rejects(() => ativarTrial(usuarioId, EMAIL, materiaId), /já usou seu teste/);
});

test('trial recusa matéria não publicada', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const [m] = await query<{ id: number }>(
    `SELECT id FROM materia WHERE status <> 'publicado' LIMIT 1`);
  if (m) await assert.rejects(() => ativarTrial(usuarioId, EMAIL, m.id), /publicada/);
});

test('cancelamento gera protocolo e não derruba o acesso já pago', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'CARTAO');
  await confirmarPagamento(evento(pedido.referencia, 'teste-cancelar'), 'simulado', {});

  const [a] = await query<{ id: number }>('SELECT id FROM assinatura WHERE usuario_id = $1', [usuarioId]);
  const protocolo = await cancelarAssinatura(usuarioId, EMAIL, a.id);
  assert.match(protocolo, /^CANC-/);

  const [l] = await query<{ status: string }>('SELECT status FROM licenca WHERE usuario_id = $1', [usuarioId]);
  assert.equal(l.status, 'ATIVA', 'o acesso vale até o fim do período pago (§6.4)');
  await assert.rejects(() => cancelarAssinatura(usuarioId, EMAIL, a.id), /já cancelada/);
});

test('reembolso em 7 dias devolve e encerra a licença', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'PIX');
  await confirmarPagamento(evento(pedido.referencia, 'teste-reemb'), 'simulado', {});

  const protocolo = await pedirReembolso(usuarioId, EMAIL, pedido.id);
  assert.match(protocolo, /^REEMB-/);
  const [l] = await query<{ status: string }>('SELECT status FROM licenca WHERE usuario_id = $1', [usuarioId]);
  assert.equal(l.status, 'CANCELADA');
});

test('reembolso fora dos 7 dias é recusado', talvez, async () => {
  const usuarioId = await usuarioDeTeste();
  const materiaId = await materiaPublicada();
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, usuarioId, EMAIL, 'MATERIA', 'mensal', materiaId, 'PIX');
  await confirmarPagamento(evento(pedido.referencia, 'teste-velho'), 'simulado', {});
  await query(`UPDATE pedido SET pago_em = now() - interval '10 days' WHERE id = $1`, [pedido.id]);
  await assert.rejects(() => pedirReembolso(usuarioId, EMAIL, pedido.id), /7 dias/);
});

test.after(async () => {
  if (temBanco) {
    await query(`DELETE FROM usuario WHERE email = $1`, [EMAIL]);
    await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'teste-%'`);
  }
  await pool.end();
});
