/**
 * Capas dos cursos, em lote — um quadro do vídeo de cada um.
 *
 * O catálogo em prateleiras (docs/plano-catalogo-em-prateleiras.md) mostra
 * capa no cartão. Curso novo ganha a sua no envio do vídeo, pela rota de
 * upload; este script é para o acervo que já existia quando a capa passou
 * a existir.
 *
 * Roda ONDE o ffmpeg está — dentro do container, que é onde os vídeos
 * estão montados:
 *
 *   docker compose exec web node scripts/gerar-capas.mjs
 *   docker compose exec web node scripts/gerar-capas.mjs --refazer
 *   docker compose exec web node scripts/gerar-capas.mjs --portal 2287
 *
 * Sem `--refazer`, curso que já tem capa é pulado: refazer sozinho
 * apagaria a escolha de quem trocou a capa à mão.
 */
import pg from 'pg';
import { gerarCapaDaMateria } from '../lib/capa-video.ts';

const refazer = process.argv.includes('--refazer');
const iPortal = process.argv.indexOf('--portal');
const portalPedido = iPortal >= 0 ? Number(process.argv[iPortal + 1]) : null;
if (portalPedido !== null && !Number.isInteger(portalPedido)) {
  console.error('--portal precisa de um número');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});

const { rows: cursos } = await pool.query(
  `SELECT m.id::int AS id, m.portal_id::int AS "portalId", m.nome, m.capa
     FROM materia m
    WHERE ($1::int IS NULL OR m.portal_id = $1)
      AND ($2::boolean OR m.capa IS NULL)
    ORDER BY m.portal_id, m.ordem, m.id`,
  [portalPedido, refazer],
);

console.log(`${cursos.length} curso(s) a processar${refazer ? ' (refazendo capas existentes)' : ''}.`);

let feitas = 0; let semVideo = 0; let falhas = 0;
for (const c of cursos) {
  try {
    const r = await gerarCapaDaMateria(c.portalId, c.id, { substituir: refazer });
    if (r.url) { feitas++; console.log(`✔ ${c.nome} → ${r.url}`); }
    else if (r.motivo === 'sem-video') { semVideo++; console.log(`· ${c.nome} — sem vídeo nosso, fica no desenho`); }
    else { console.log(`· ${c.nome} — já tem capa`); }
  } catch (e) {
    falhas++;
    console.error(`✘ ${c.nome} — ${e.message}`);
  }
}

await pool.end();
console.log(`\n${feitas} capa(s) gerada(s), ${semVideo} sem vídeo, ${falhas} falha(s).`);
process.exit(falhas ? 1 : 0);
