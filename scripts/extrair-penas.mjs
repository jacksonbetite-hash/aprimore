#!/usr/bin/env node
/**
 * Rascunho do catálogo da Calculadora Penal (§5.12) a partir do acervo.
 *
 *   node scripts/extrair-penas.mjs cp                # todos os artigos com pena
 *   node scripts/extrair-penas.mjs cp 155 157 171    # só os artigos pedidos
 *   node scripts/extrair-penas.mjs drogas
 *
 * Lê cada artigo da norma no banco, acha as linhas "Pena" (do caput e de
 * cada parágrafo) e imprime uma entrada de catálogo por pena encontrada.
 * O que sai daqui é RASCUNHO: espécie de ação penal, hediondez, violência
 * e causas específicas não estão no texto da pena, e a revisão humana é
 * o que transforma o rascunho em catálogo (`lib/penas/catalogo/*.ts`).
 */
import pg from 'pg';
import { lerPena } from '../lib/penas/extrator.ts';

const [slug, ...artigos] = process.argv.slice(2);
if (!slug) {
  console.error('uso: node scripts/extrair-penas.mjs <slug-da-norma> [números de artigo...]');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});

const { rows } = await pool.query(
  `SELECT d.rotulo, d.numero, d.texto FROM dispositivo d JOIN norma n ON n.id = d.norma_id
    WHERE n.slug = $1 ${artigos.length ? 'AND d.numero = ANY($2::int[])' : ''} ORDER BY d.ordem`,
  artigos.length ? [slug, artigos.map(Number)] : [slug],
);
await pool.end();

const amd = (d) => {
  const a = Math.floor(d / 360), m = Math.floor((d % 360) / 30), r = d % 30;
  return `d(${a}${m || r ? `, ${m}` : ''}${r ? `, ${r}` : ''})`;
};
const idDe = (rotulo, forma) => {
  const num = rotulo.replace(/^Art\.\s*/, '').replace(/[ºo°]/g, '').replace(/\s+/g, '');
  const f = forma === 'caput' ? '' : '-' + forma.replace(/^§\s*/, '').replace(/[ºo°.]/g, '').replace(/\s+/g, '');
  return `${slug}-${num}${f}`;
};

let total = 0;
for (const { rotulo, texto } of rows) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  let forma = 'caput';
  let rubrica = '';
  const saidas = [];
  for (const linha of linhas) {
    const par = linha.match(/^(§\s*\d+[ºo°]?(?:-[A-Z])?|Parágrafo único)/);
    if (par) forma = par[1].replace(/[°o]/g, 'º').replace(/\s+/g, ' ');
    else if (linha.length < 70 && !/[.;:,!?]$/.test(linha) && !/^[IVXLC]+\s*[-–—]|^[a-z]\)/.test(linha)) rubrica = linha;
    const pena = lerPena(linha);
    if (!pena) continue;
    saidas.push({ forma, rubrica, pena });
  }
  if (!saidas.length) continue;
  console.log(`\n  /* ${rotulo} */`);
  for (const { forma: f, rubrica: r, pena } of saidas) {
    total++;
    const multa = pena.multa === 'NAO' ? '' : `, multa: '${pena.multa}'`;
    const dm = pena.diasMultaMin ? `, diasMultaMin: ${pena.diasMultaMin}, diasMultaMax: ${pena.diasMultaMax}` : '';
    console.log(
      `  t({ id: '${idDe(rotulo, f)}', rotulo: '${rotulo}', nome: '${r || 'REVISAR nome'}', especie: '${pena.especie}', penaMinDias: ${amd(pena.minDias)}, penaMaxDias: ${amd(pena.maxDias)} },\n` +
      `    { forma: '${f}'${multa}${dm} }),   // ${pena.trecho.slice(0, 90)}`,
    );
  }
}
console.error(`\n${total} penas lidas em ${rows.length} artigos de "${slug}". Revise ação penal, hediondez, violência e causas antes de catalogar.`);
