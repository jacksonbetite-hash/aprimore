import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Autosserviço do portal contra banco real — etapa 1 do §5.10.2.
 *
 * O que está em jogo: um formulário público que cria conta, portal,
 * contrato e cobrança de uma vez. As garantias caras de errar são as
 * mesmas do checkout (§8.3) — idempotência do webhook, tudo-ou-nada da
 * transação — mais as travas do §5.10.2: máscara reservada, CNPJ e o
 * teto regulatório de portais.
 */
const { pool, query } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM portal LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

// Espaço para os testes: sem esbarrar no teto regulatório de verdade.
process.env.LIMITE_PORTAIS = '50';

const CNPJ = '11.222.333/0001-81';
let n = 0;
const dados = () => ({
  nome: 'Prof. de Teste',
  email: `teste-portal-${++n}@exemplo.com`,
  senha: 'senha-bem-longa',
  cnpj: CNPJ,
  telefone: '(11) 98765-4321',
  rendaMensalCentavos: 800000,
  endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista' },
  mascara: `teste-assinatura-${n}`,
  nomeExibicao: 'Portal de Teste',
  meio: 'PIX' as const,
  aceitouContrato: true,
  ip: '203.0.113.7',
});

const evento = (ref: string, id: string, tipo: 'pagamento.confirmado' | 'pagamento.falhou' = 'pagamento.confirmado') =>
  ({ eventoId: id, tipo, referencia: ref, centavos: 14900 });

// Roda antes E depois: sobra de portal de teste no banco compartilhado
// ocupa o teto regulatório do autosserviço (§5.10.2) e derruba o fluxo
// real. Portal antes do usuário: professor_id aponta sem cascade.
async function limparRastros() {
  // O portal agora nasce com tabela de preço copiada da plataforma
  // (semearPrecosDaPlataforma); `preco` não tem ON DELETE CASCADE,
  // então sai antes do portal.
  await query(`DELETE FROM preco WHERE portal_id IN (SELECT id FROM portal WHERE mascara LIKE 'teste-assinatura-%')`);
  await query(`DELETE FROM portal WHERE mascara LIKE 'teste-assinatura-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-portal-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-portal-%'`);
}
if (temBanco) await limparRastros();

test('contratação cria conta, portal em rascunho, contrato aceito e fatura cobrável', talvez, async () => {
  const d = dados();
  const r = await assinarPortal(d);

  assert.ok(r.referencia.startsWith('PF-'), 'referência tem o prefixo de fatura');
  assert.ok(r.copiaECola, 'Pix veio com copia-e-cola');
  assert.equal(r.centavos, 14900, 'cobra o preço do plano de lançamento');

  const [p] = await query(
    `SELECT status, responsavel_doc AS doc FROM portal WHERE id = $1`, [r.portalId]);
  assert.equal(p.status, 'RASCUNHO', 'portal não nasce no ar — nasce quando paga');
  assert.equal(p.doc, '11222333000181', 'CNPJ guardado sem pontuação');

  const [c] = await query(
    `SELECT aceito_em AS "aceitoEm", aceito_ip AS ip, licenca_mensal_centavos AS cent
       FROM portal_contrato WHERE portal_id = $1`, [r.portalId]);
  assert.ok(c.aceitoEm, 'contrato nasce aceito — foi condição do formulário');
  assert.equal(c.ip, d.ip, 'IP do aceite registrado');
  assert.equal(c.cent, 14900, 'contrato congela o preço do plano no ato');

  const [f] = await query(
    `SELECT status, centavos_total AS total FROM portal_fatura WHERE referencia = $1`,
    [r.referencia]);
  assert.equal(f.status, 'FECHADA', 'fatura pronta para pagar');
  assert.equal(f.total, 14900);
});

test('pagamento confirmado ativa o portal; evento repetido não reprocessa', talvez, async () => {
  const r = await assinarPortal(dados());

  const c1 = await confirmarPagamentoFatura(evento(r.referencia, `ev-portal-${n}-a`), 'simulado', {});
  assert.equal(c1.ok && c1.portalAtivado, true, 'primeiro evento ativa');

  const [p] = await query(`SELECT status, publicado_em AS pub FROM portal WHERE id = $1`, [r.portalId]);
  assert.equal(p.status, 'ATIVO');
  assert.ok(p.pub, 'publicado_em preenchido');

  const c2 = await confirmarPagamentoFatura(evento(r.referencia, `ev-portal-${n}-a`), 'simulado', {});
  assert.equal(c2.ok && c2.jaProcessado, true, 'mesmo evento é no-op');

  const [f] = await query(`SELECT count(*)::int AS pagas FROM portal_fatura
    WHERE referencia = $1 AND status = 'PAGA'`, [r.referencia]);
  assert.equal(f.pagas, 1);
});

test('pagamento falho deixa o portal em rascunho e a fatura cobrável', talvez, async () => {
  const r = await assinarPortal(dados());
  const c = await confirmarPagamentoFatura(
    evento(r.referencia, `ev-portal-${n}-falha`, 'pagamento.falhou'), 'simulado', {});
  assert.equal(c.ok, false);
  const [p] = await query(`SELECT status FROM portal WHERE id = $1`, [r.portalId]);
  assert.equal(p.status, 'RASCUNHO', 'falha não ativa nada');
  const [f] = await query(`SELECT status FROM portal_fatura WHERE referencia = $1`, [r.referencia]);
  assert.equal(f.status, 'FECHADA', 'a fatura continua lá para nova tentativa');
});

test('máscara reservada é recusada com explicação', talvez, async () => {
  await assert.rejects(
    assinarPortal({ ...dados(), mascara: 'admin' }),
    /não pode ser usada/,
  );
});

test('máscara já ocupada é recusada', talvez, async () => {
  const d = dados();
  await assinarPortal(d);
  await assert.rejects(
    assinarPortal({ ...dados(), mascara: d.mascara }),
    /já é o endereço/,
  );
});

test('e-mail existente NÃO é promovido em silêncio — e nada é criado', talvez, async () => {
  const d = dados();
  await assinarPortal(d);
  // Conta só os NOSSOS portais: os arquivos de teste rodam em paralelo e
  // uma contagem global flutuaria com o vizinho criando os dele.
  const soNossos = `SELECT count(*)::int AS c FROM portal WHERE mascara LIKE 'teste-assinatura-%'`;
  const antes = await query(soNossos);
  await assert.rejects(
    assinarPortal({ ...dados(), email: d.email }),
    /Já existe uma conta/,
  );
  const depois = await query(soNossos);
  assert.equal(depois[0].c, antes[0].c, 'transação desfez tudo: nenhum portal órfão');
});

test('CNPJ inválido barra antes de qualquer criação', talvez, async () => {
  await assert.rejects(
    assinarPortal({ ...dados(), cnpj: '11.222.333/0001-80' }),
    /CNPJ inválido/,
  );
});

test('sem aceite do contrato, nada acontece', talvez, async () => {
  await assert.rejects(
    assinarPortal({ ...dados(), aceitouContrato: false }),
    /aceitar o contrato/,
  );
});

test('no teto regulatório, a porta fecha com aviso de lista de espera', talvez, async () => {
  process.env.LIMITE_PORTAIS = '1';   // o portal de demonstração já conta
  try {
    await assert.rejects(assinarPortal(dados()), /lista de espera/);
  } finally {
    process.env.LIMITE_PORTAIS = '50';
  }
});

test.after(async () => {
  if (temBanco) await limparRastros();
  await pool.end();
});

test('KYC do responsável fica no portal, normalizado (§8.2)', talvez, async () => {
  const r = await assinarPortal(dados());
  const [p] = await query(
    `SELECT responsavel_telefone AS tel, responsavel_renda_centavos AS renda,
            responsavel_endereco AS endereco FROM portal WHERE id = $1`, [r.portalId]);
  assert.equal(p.tel, '11987654321');
  assert.equal(p.renda, 800000);
  assert.deepEqual(p.endereco,
    { cep: '01310100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista' });
});

test('sem renda ou com CEP torto, nada é criado', talvez, async () => {
  await assert.rejects(assinarPortal({ ...dados(), rendaMensalCentavos: 0 }), /renda/);
  const d = dados();
  await assert.rejects(assinarPortal({ ...d, endereco: { ...d.endereco, cep: '123' } }), /CEP/);
  await assert.rejects(assinarPortal({ ...dados(), telefone: '123' }), /Telefone/);
});


/**
 * O portal nascia sem nenhuma linha em `preco`, e o buraco aparecia nos
 * dois piores lugares: a seção "Como assinar" da página pública mostrava
 * "R$ NaN" (`brl(undefined)`) e o checkout recusava a compra com "não há
 * preço vigente para este produto" — portal no ar, sem poder vender.
 */
test('o portal nasce com tabela de preço vigente, copiada da plataforma', talvez, async () => {
  const r = await assinarPortal(dados());

  const daPlataforma = await query<{ produto: string; periodo: string; centavos: number }>(
    `SELECT produto, periodo, centavos FROM preco
      WHERE portal_id = 0 AND vigente_ate IS NULL AND vigente_de <= current_date
      ORDER BY produto, periodo`,
  );
  const doPortal = await query<{ produto: string; periodo: string; centavos: number }>(
    `SELECT produto, periodo, centavos FROM preco
      WHERE portal_id = $1 AND vigente_ate IS NULL AND vigente_de <= current_date
      ORDER BY produto, periodo`,
    [r.portalId],
  );
  assert.ok(daPlataforma.length > 0, 'a plataforma precisa ter tabela para o teste valer');
  assert.deepEqual(doPortal, daPlataforma,
    'produto, período e valor entram iguais aos nossos — o admin ajusta depois (§5.9)');
});
