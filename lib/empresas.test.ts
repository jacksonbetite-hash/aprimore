import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Vitrine corporativa e captação de interesse (§12-B.1).
 *
 * A regra que estes testes travam: a vitrine não vende — capta. Nada
 * aqui abre pedido nem cria licença; o que entra é um contato validado
 * (CNPJ de verdade, e-mail de verdade, porte e plano dentre os que a
 * página oferece), e a retaguarda muda o status assinando quem mudou.
 */
const { pool, query } = await import('./db.ts');
const {
  PLANOS_EMPRESA, PLANOS, PORTES, validarInteresse, registrarInteresse,
  listarInteresses, mudarStatusInteresse, contarInteressesPorStatus,
} = await import('./empresas.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM interesse_empresa LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

const CNPJ_VALIDO = '11.222.333/0001-81';
let n = 0;
const base = () => ({
  nome: 'Maria da Silva', email: `teste-empresa-${Date.now()}-${++n}@exemplo.com`,
  telefone: '(11) 99999-0000', empresa: 'Escritório Teste', cnpj: CNPJ_VALIDO,
  porte: 'ate_50', plano: 'starter', mensagem: 'Queremos treinar a equipe.',
});

async function limpar() {
  await query(`DELETE FROM log_auditoria WHERE entidade = 'interesse_empresa'
                 AND entidade_id IN (SELECT id FROM interesse_empresa WHERE email LIKE 'teste-empresa-%')`);
  await query(`DELETE FROM interesse_empresa WHERE email LIKE 'teste-empresa-%'`);
}

test.after(async () => { if (temBanco) { await limpar(); } await pool.end(); });

// ---------- a tabela da vitrine ----------

test('a vitrine oferece exatamente os planos que o formulário aceita', () => {
  assert.deepEqual(PLANOS_EMPRESA.map((p) => p.id), [...PLANOS]);
  assert.equal(PLANOS_EMPRESA.filter((p) => p.recomendado).length, 1, 'um só plano em destaque');
});

test('só o Enterprise fica sem preço na vitrine', () => {
  const semPreco = PLANOS_EMPRESA.filter((p) => p.centavosMes === null).map((p) => p.id);
  assert.deepEqual(semPreco, ['enterprise']);
  for (const p of PLANOS_EMPRESA) {
    if (p.centavosMes !== null) assert.ok(p.centavosMes > 0, `${p.id} com preço positivo`);
  }
});

// ---------- validação, sem banco ----------

test('dados completos passam e saem normalizados', () => {
  const v = validarInteresse({ ...base(), email: '  RH@Empresa.com ', cnpj: CNPJ_VALIDO });
  assert.equal(v.email, 'rh@empresa.com');
  assert.equal(v.cnpj, '11222333000181', 'o CNPJ é guardado sem pontuação');
  assert.equal(v.porte, 'ate_50');
  assert.equal(v.plano, 'starter');
});

test('CNPJ inválido é recusado antes de tocar no banco', () => {
  assert.throws(() => validarInteresse({ ...base(), cnpj: '11.111.111/1111-11' }), /CNPJ inválido/);
  assert.throws(() => validarInteresse({ ...base(), cnpj: '' }), /CNPJ inválido/);
});

test('e-mail, porte e plano fora do esperado são recusados', () => {
  assert.throws(() => validarInteresse({ ...base(), email: 'nao-e-email' }), /E-mail inválido/);
  assert.throws(() => validarInteresse({ ...base(), porte: 'gigante' }), /porte/i);
  assert.throws(() => validarInteresse({ ...base(), plano: 'premium' }), /plano/i);
  for (const porte of PORTES) assert.doesNotThrow(() => validarInteresse({ ...base(), porte }));
});

test('telefone e mensagem são opcionais; mensagem longa é cortada', () => {
  const v = validarInteresse({ ...base(), telefone: '  ', mensagem: 'x'.repeat(5000) });
  assert.equal(v.telefone, null);
  assert.equal(v.mensagem?.length, 2000);
});

// ---------- gravação e retaguarda, contra banco real ----------

test('registrar grava como novo e aparece primeiro na fila', talvez, async () => {
  const d = base();
  const id = await registrarInteresse(d);
  assert.ok(id > 0);
  const [primeiro] = await listarInteresses('novo');
  assert.equal(primeiro.id, id);
  assert.equal(primeiro.status, 'novo');
  assert.equal(primeiro.atendidoPor, null);
  assert.equal(primeiro.cnpj, '11222333000181');
});

test('mudar o status assina quem atendeu e audita; voltar a novo limpa a assinatura', talvez, async () => {
  const id = await registrarInteresse(base());
  await mudarStatusInteresse('admin@teste', id, 'em_contato');
  let [i] = await listarInteresses('em_contato');
  assert.equal(i.id, id);
  assert.equal(i.atendidoPor, 'admin@teste');
  assert.ok(i.atendidoEm);

  const auditoria = await query(
    `SELECT 1 FROM log_auditoria WHERE entidade = 'interesse_empresa' AND entidade_id = $1`, [id],
  );
  assert.equal(auditoria.length, 1, 'a mudança de status deixa rastro');

  await mudarStatusInteresse('admin@teste', id, 'novo');
  [i] = (await listarInteresses('novo')).filter((x) => x.id === id);
  assert.equal(i.atendidoPor, null);
  assert.equal(i.atendidoEm, null);
});

test('status desconhecido e id inexistente são recusados', talvez, async () => {
  await assert.rejects(
    mudarStatusInteresse('admin@teste', 999_999_999, 'em_contato'), /não encontrado/,
  );
  await assert.rejects(
    mudarStatusInteresse('admin@teste', 1, 'perdido' as never), /inválida/,
  );
});

test('a contagem por status fecha com a listagem', talvez, async () => {
  const contagem = await contarInteressesPorStatus();
  for (const c of contagem) {
    const lista = await listarInteresses(c.status, 10_000);
    assert.equal(lista.length, c.total, `status ${c.status}`);
  }
});
