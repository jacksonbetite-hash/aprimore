#!/usr/bin/env node
/**
 * Migração simples por arquivo: aplica db/*.sql em ordem, uma vez cada,
 * registrando em schema_migracao. Sem framework — o schema ainda é novo
 * e a operação é solo (§3: "operação que roda sozinha").
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbDir = join(raiz, 'db');
const somenteSeed = process.argv.includes('--seed');

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://aprimore:aprimore@localhost:5432/aprimore',
});

async function esperarBanco(tentativas = 30) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === tentativas) throw err;
      process.stdout.write(`aguardando o banco (${i}/${tentativas})\r`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function main() {
  await esperarBanco();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migracao (
      arquivo TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const arquivos = (await readdir(dbDir))
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => (somenteSeed ? f.includes('seed') : true))
    .sort();

  for (const arquivo of arquivos) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM schema_migracao WHERE arquivo = $1',
      [arquivo],
    );
    if (rowCount) {
      console.log(`· ${arquivo} — já aplicada`);
      continue;
    }
    const sql = await readFile(join(dbDir, arquivo), 'utf8');
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query('INSERT INTO schema_migracao (arquivo) VALUES ($1)', [arquivo]);
      await cliente.query('COMMIT');
      console.log(`✔ ${arquivo} — aplicada`);
    } catch (err) {
      await cliente.query('ROLLBACK');
      console.error(`✘ ${arquivo} — falhou:`, err.message);
      throw err;
    } finally {
      cliente.release();
    }
  }
  await pool.end();
  console.log('migrações concluídas');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
