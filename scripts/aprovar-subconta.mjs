#!/usr/bin/env node
/**
 * Simula a aprovação (ou recusa) da subconta que o gateway enviaria por
 * webhook — etapa 2 do §5.10.2. Em desenvolvimento, faz o papel da
 * análise de documentos do Asaas.
 *
 *   node scripts/aprovar-subconta.mjs <MASCARA-DO-PORTAL> [--recusar]
 *
 * Busca o id da subconta pelo endereço do portal e bate no MESMO webhook
 * que o gateway real usa, com a mesma assinatura.
 *
 * Portal ATIVO que nunca PEDIU a subconta (foi criado pela retaguarda,
 * por exemplo, e não pelo pagamento da 1ª mensalidade) fica preso: sem
 * subconta ele não vende, e sem pedido não há o que aprovar. Neste caso
 * o roteiro abre a subconta primeiro, pela mesma função que o webhook
 * usa — e só então aprova.
 */
import { createHmac, randomBytes } from 'node:crypto';
import pg from 'pg';
import { abrirSubconta } from '../lib/portal-subconta.ts';

const mascara = process.argv[2];
if (!mascara) {
  console.error('uso: node scripts/aprovar-subconta.mjs <mascara-do-portal> [--recusar]');
  process.exit(1);
}
const recusar = process.argv.includes('--recusar');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});
const { rows } = await pool.query(
  `SELECT id AS "portalId", gateway_subconta_id AS id, subconta_situacao AS situacao
     FROM portal WHERE lower(mascara) = lower($1)`, [mascara],
);
if (!rows[0]) {
  await pool.end();
  console.error(`✘ portal "${mascara}" não existe`); process.exit(1);
}
if (!rows[0].id) {
  if (recusar) {
    await pool.end();
    console.error(`✘ o portal "${mascara}" ainda não pediu subconta (situação: ${rows[0].situacao})`);
    process.exit(1);
  }
  const aberta = await abrirSubconta(Number(rows[0].portalId));
  rows[0].id = aberta.subcontaId;
  console.log(`· subconta ainda não pedida — aberta agora (${aberta.situacao}, ${aberta.subcontaId})`);
}
await pool.end();

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const segredo = process.env.WEBHOOK_SEGREDO ?? 'segredo-de-desenvolvimento';

const corpo = JSON.stringify({
  eventoId: 'sim_' + randomBytes(8).toString('hex'),
  tipo: recusar ? 'subconta.recusada' : 'subconta.aprovada',
  referencia: rows[0].id,
  centavos: 0,
});
const assinatura = 'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex');

const r = await fetch(`${base}/api/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-assinatura': assinatura },
  body: corpo,
});
const resposta = await r.json().catch(() => ({}));
if (!r.ok) { console.error(`✘ webhook respondeu ${r.status}:`, resposta); process.exit(1); }
if (resposta.processado) {
  console.log(resposta.jaProcessado
    ? `· evento repetido — subconta já estava ${resposta.subconta}. É o comportamento correto.`
    : `✔ subconta do portal "${mascara}": ${resposta.subconta}`);
} else {
  console.log(`· não processado: ${resposta.motivo}`);
}
