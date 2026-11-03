#!/usr/bin/env node
/**
 * Cria (ou promove) uma conta da equipe da plataforma.
 *
 * Não existe admin no seed de propósito: uma senha padrão em repositório
 * público é a porta dos fundos mais explorada que existe. O admin nasce
 * de um comando explícito de quem opera o sistema.
 *
 *   node scripts/criar-admin.mjs email@exemplo.com "Nome" [senha] [--papel=admin|financeiro|suporte]
 *
 * Sem a senha no argumento, ela é sorteada e impressa uma única vez. Sem
 * `--papel`, é admin. Financeiro e suporte (db/044) também podem nascer
 * pela tela de usuários da retaguarda — este script é para o PRIMEIRO
 * admin, quando ainda não há ninguém para abrir a tela.
 *
 * A senha mora na CONTA (db/045), global; o papel, no perfil da
 * plataforma (portal 0). Rodar de novo para o mesmo e-mail troca a senha
 * e o papel — é o jeito de recuperar o acesso do primeiro admin.
 */
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(scryptCb);
const PAPEIS = ['admin', 'financeiro', 'suporte'];

const args = process.argv.slice(2);
const papelArg = args.find((a) => a.startsWith('--papel='));
const papel = papelArg ? papelArg.slice('--papel='.length) : 'admin';
const [email, nome, senhaArg] = args.filter((a) => !a.startsWith('--'));

if (!email || !nome || !PAPEIS.includes(papel)) {
  console.error('uso: node scripts/criar-admin.mjs <email> <nome> [senha] [--papel=admin|financeiro|suporte]');
  process.exit(1);
}

const senha = senhaArg ?? randomBytes(12).toString('base64url');

async function hash(s) {
  const sal = randomBytes(16);
  const d = await scrypt(s.normalize('NFKC'), sal, 64);
  return `scrypt$16384$${sal.toString('base64')}$${d.toString('base64')}`;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimore',
});

const { rows: [conta] } = await pool.query(
  `INSERT INTO conta (email, nome, senha_hash)
   VALUES (lower($1), $2, $3)
   ON CONFLICT (lower(email)) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, nome = EXCLUDED.nome
   RETURNING id, email`,
  [email, nome, await hash(senha)],
);
const { rows } = await pool.query(
  // portal_id 0 e a plataforma (db/018_portal.sql): a equipe e da retaguarda
  // do site principal, nao de portal de professor.
  `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
   VALUES (0, $1, $2, $3, $4::papel_usuario)
   ON CONFLICT (conta_id, portal_id) DO UPDATE
     SET papel = EXCLUDED.papel, nome = EXCLUDED.nome
   RETURNING id, email`,
  [conta.id, nome, conta.email, papel],
);
await pool.query(
  `INSERT INTO log_auditoria (ator, acao, entidade, entidade_id, detalhe)
   VALUES ('script', $3, 'usuario', $1, $2)`,
  [rows[0].id, JSON.stringify({ email: rows[0].email, papel }), `usuario.promovido_${papel}`],
);
await pool.end();

console.log(`\n✔ ${papel} pronto: ${rows[0].email}`);
if (!senhaArg) console.log(`  senha: ${senha}\n  (anote agora — não será mostrada de novo)\n`);
