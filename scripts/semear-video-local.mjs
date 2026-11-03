#!/usr/bin/env node
/**
 * Põe vídeo tocável nas aulas publicadas, para desenvolvimento.
 *
 *   node scripts/semear-video-local.mjs            # todas as publicadas
 *   node scripts/semear-video-local.mjs --limite 5 # só as 5 primeiras
 *   node scripts/semear-video-local.mjs --limpar   # desfaz
 *
 * Não gera conteúdo: copia o vídeo do hero (public/video/apresentacao.mp4,
 * feito por gerar-video-hero.mjs) para o volume de mídia com o nome de
 * cada aula, e aponta a coluna (video_provedor, video_id) para lá.
 *
 * Serve para exercitar o caminho inteiro — URL assinada, faixa de bytes,
 * marca d'água, retomada — sem depender de gravação nenhuma. O conteúdo
 * é o vídeo institucional; ninguém vai confundir com aula.
 *
 * Os arquivos vão para VIDEO_RAIZ (padrão ./midia/video), que está no
 * .gitignore e fora da imagem Docker de propósito: mídia não se versiona
 * nem se assa em imagem. Ver docs/entrega-de-video.md.
 */
import { mkdir, copyFile, rm, stat, readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const MOLDE = join(raiz, 'public', 'video', 'apresentacao.mp4');
const DESTINO = resolve(process.env.VIDEO_RAIZ ?? join(raiz, 'midia', 'video'));

const argumentos = process.argv.slice(2);
const limpar = argumentos.includes('--limpar');
const posLimite = argumentos.indexOf('--limite');
const limite = posLimite >= 0 ? Number(argumentos[posLimite + 1]) : null;

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://aprimore:aprimore@localhost:5432/aprimore',
});

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  if (limpar) {
    await pool.query(
      `UPDATE aula SET video_provedor = NULL, video_id = NULL WHERE video_provedor = 'LOCAL'`,
    );
    await rm(DESTINO, { recursive: true, force: true });
    console.log(`limpo: ${DESTINO} e as colunas de vídeo LOCAL`);
    return;
  }

  try {
    await stat(MOLDE);
  } catch {
    console.error(
      `não achei ${MOLDE}.\nRode antes: npm run video`,
    );
    process.exitCode = 1;
    return;
  }

  const { rows } = await pool.query(
    `SELECT id, slug FROM aula WHERE status = 'publicado' ORDER BY id
      ${limite ? 'LIMIT ' + Number(limite) : ''}`,
  );

  if (rows.length === 0) {
    console.error('nenhuma aula publicada — rode `npm run seed` antes.');
    process.exitCode = 1;
    return;
  }

  await mkdir(DESTINO, { recursive: true });
  const tamanho = (await stat(MOLDE)).size;

  for (const aula of rows) {
    const arquivo = `${aula.slug}.mp4`;
    await copyFile(MOLDE, join(DESTINO, arquivo));
    await pool.query(
      `UPDATE aula SET video_provedor = 'LOCAL', video_id = $2 WHERE id = $1`,
      [aula.id, arquivo],
    );
    console.log(`✔ ${aula.slug} → ${arquivo}`);
  }

  const total = (await readdir(DESTINO)).length;
  console.log(
    `\n${rows.length} aula(s) com vídeo em ${DESTINO}` +
    `\n${total} arquivo(s), ~${mb(tamanho * total)} no disco` +
    `\n\nAbra uma aula publicada e o player deve tocar.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
