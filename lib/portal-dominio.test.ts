import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Domínio próprio (Fase 2) contra banco real: cadastro, verificação por
 * CNAME (resolvedor injetado — o teste não toca o DNS de verdade) e a
 * cobrança do upgrade na fatura, só depois de verificado.
 */
const { pool, query, queryOne } = await import('./db.ts');
const { assinarPortal, confirmarPagamentoFatura } = await import('./portal-assinatura.ts');
const { definirDominio, verificarDominio, situacaoDominio, buscarPortalPorDominio } =
  await import('./portal-dominio.ts');
const { fecharFatura } = await import('./portal-financeiro.ts');
const { competenciaAnterior, competenciaDe } = await import('./portal.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM portal LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

process.env.LIMITE_PORTAIS = '50';
process.env.DOMINIO_BASE = 'aprimoreosaber.com.br';

let n = 0;
const dados = () => ({
  nome: 'Prof. Domínio', email: `teste-dom-${++n}@exemplo.com`,
  senha: 'senha-bem-longa', cnpj: '11.222.333/0001-81',
  telefone: '(11) 98765-4321', rendaMensalCentavos: 800000,
  endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista' },
  mascara: `teste-dom-${n}`, nomeExibicao: `Portal Domínio ${n}`,
  meio: 'PIX' as const, aceitouContrato: true, ip: '203.0.113.21',
});

async function limparRastros() {
  // O portal agora nasce com tabela de preço copiada da plataforma
  // (semearPrecosDaPlataforma); `preco` não tem ON DELETE CASCADE,
  // então sai antes do portal.
  await query(`DELETE FROM preco WHERE portal_id IN (SELECT id FROM portal WHERE mascara LIKE 'teste-dom-%')`);
  await query(`DELETE FROM portal WHERE mascara LIKE 'teste-dom-%'`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-dom-%@exemplo.com'`);
  await query(`DELETE FROM evento_gateway WHERE evento_id LIKE 'ev-dom-%'`);
}
if (temBanco) await limparRastros();

/** Portal ATIVO cujo plano oferece o domínio por R$ 29 (restaurado no fim). */
let planoId = 0; let precoOriginal: number | null = null;
async function portalAtivo() {
  const r = await assinarPortal(dados());
  await confirmarPagamentoFatura(
    { eventoId: `ev-dom-${n}`, tipo: 'pagamento.confirmado', referencia: r.referencia, centavos: r.centavos },
    'simulado', {});
  const p = await queryOne<{ planoId: number; preco: number | null }>(
    `SELECT p.plano_id::int AS "planoId", pl.centavos_dominio_proprio AS preco
       FROM portal p JOIN portal_plano pl ON pl.id = p.plano_id WHERE p.id = $1`, [r.portalId]);
  if (!planoId) { planoId = p!.planoId; precoOriginal = p!.preco; }
  await query(`UPDATE portal_plano SET centavos_dominio_proprio = 2900 WHERE id = $1`, [planoId]);
  return r;
}

test('plano sem oferta recusa; com oferta, cadastra e só verificado resolve', talvez, async () => {
  const r = await portalAtivo();
  await query(`UPDATE portal_plano SET centavos_dominio_proprio = NULL WHERE id = $1`, [planoId]);
  await assert.rejects(definirDominio('teste', r.portalId, 'cursos.profdom.com.br'), /não está disponível/);
  await query(`UPDATE portal_plano SET centavos_dominio_proprio = 2900 WHERE id = $1`, [planoId]);

  await assert.rejects(definirDominio('teste', r.portalId, 'http://x.com'), /http/);
  await assert.rejects(definirDominio('teste', r.portalId, 'outro.aprimoreosaber.com.br'), /nosso domínio/);
  assert.equal(await definirDominio('teste', r.portalId, ' Cursos.ProfDom.com.br '), 'cursos.profdom.com.br');

  assert.equal(await buscarPortalPorDominio('cursos.profdom.com.br'), null, 'não verificado não resolve');

  const errado = await verificarDominio('teste', r.portalId, async () => ['outro.exemplo.com.']);
  assert.equal(errado.ok, false);
  assert.match(errado.esperado, /^teste-dom-\d+\.aprimoreosaber\.com\.br$/, 'o alvo é o endereço do portal');

  const semDns = await verificarDominio('teste', r.portalId,
    async () => { throw Object.assign(new Error('nx'), { code: 'ENOTFOUND' }); });
  assert.equal(semDns.ok, false, 'DNS sem registro é "ainda não", não erro');

  const certo = await verificarDominio('teste', r.portalId, async () => [errado.esperado.toUpperCase() + '.']);
  assert.equal(certo.ok, true);
  const p = await buscarPortalPorDominio('CURSOS.profdom.com.br');
  assert.equal(p?.id, r.portalId, 'verificado resolve, sem distinguir maiúsculas');
  assert.equal((await situacaoDominio(r.portalId)).verificadoEm !== null, true);
});

test('o mesmo domínio não cabe em dois portais; trocar zera a verificação', talvez, async () => {
  const a = await portalAtivo();
  const b = await portalAtivo();
  await definirDominio('teste', a.portalId, 'aulas.profdom.com.br');
  await assert.rejects(definirDominio('teste', b.portalId, 'AULAS.profdom.com.br'), /já está em uso/);

  const s0 = await situacaoDominio(a.portalId);
  await verificarDominio('teste', a.portalId, async () => [s0.esperado]);
  await definirDominio('teste', a.portalId, 'novo.profdom.com.br');
  assert.equal((await situacaoDominio(a.portalId)).verificadoEm, null);
  await definirDominio('teste', a.portalId, null);
  assert.equal((await situacaoDominio(a.portalId)).dominio, null);
});

test('a fatura só cobra o domínio depois de verificado', talvez, async () => {
  const r = await portalAtivo();
  const mes = competenciaAnterior(new Date());
  await definirDominio('teste', r.portalId, 'pago.profdom.com.br');
  await assert.rejects(fecharFatura('teste', r.portalId, mes).then(() => { throw new Error('fechou'); }),
    /fechou/);
  const [f1] = await query<{ ajustes: number; total: number }>(
    `SELECT centavos_ajustes AS ajustes, centavos_total AS total FROM portal_fatura
      WHERE portal_id = $1 AND competencia = $2`, [r.portalId, mes]);
  assert.equal(f1.ajustes, 0, 'não verificado: nada de domínio na fatura');

  const s = await situacaoDominio(r.portalId);
  await verificarDominio('teste', r.portalId, async () => [s.esperado]);
  const mes2 = competenciaAnterior(new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1));
  const f2 = await fecharFatura('teste', r.portalId, mes2);
  const [linha] = await query<{ ajustes: number; detalhe: { ajustes: { centavos: number; motivo: string }[] } }>(
    `SELECT centavos_ajustes AS ajustes, detalhe FROM portal_fatura WHERE id = $1`, [f2.faturaId]);
  assert.equal(linha.ajustes, 2900);
  assert.match(linha.detalhe.ajustes.at(-1)!.motivo, /pago\.profdom\.com\.br/);
});

test.after(async () => {
  if (!temBanco) return;
  if (planoId) await query(`UPDATE portal_plano SET centavos_dominio_proprio = $2 WHERE id = $1`, [planoId, precoOriginal]);
  await limparRastros();
  await pool.end();
});
