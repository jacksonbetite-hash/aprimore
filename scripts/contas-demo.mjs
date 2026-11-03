#!/usr/bin/env node
/**
 * Contas de demonstração para um ambiente acessível de fora (VPS).
 *
 * As migrações db/009 e db/011 criam `ana@exemplo.com` com a senha
 * `constitucional88`, que está escrita neste repositório. Isso é ótimo na
 * máquina de quem desenvolve (os e2e entram com ela) e inaceitável num
 * servidor na internet: qualquer pessoa que leia o código entra.
 *
 * Este script, rodado no servidor depois da primeira subida:
 *   1. EXCLUI as contas de senha pública (a `ana@exemplo.com`), com tudo
 *      o que é dela — licenças, progresso, respostas, sessões;
 *   2. CRIA contas de demonstração novas, com senha sorteada e impressa
 *      uma única vez, e cortesia nas matérias de vitrine para que a área
 *      do aluno tenha o que mostrar.
 *
 *   node scripts/contas-demo.mjs                       # padrão: demo@<DOMINIO_BASE>
 *   node scripts/contas-demo.mjs aluno1@x.com aluno2@x.com --dias=60
 *   node scripts/contas-demo.mjs --so-remover           # só a exclusão
 *
 * No container:  docker compose exec web node scripts/contas-demo.mjs
 *
 * Rodar de novo é seguro: a conta de senha pública já não existe, e a
 * conta de demonstração que já existe só ganha senha nova (é o jeito de
 * recuperar o acesso a ela).
 */
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(scryptCb);

/** Contas cuja senha está publicada no repositório (db/011). */
const LEGADO = ['ana@exemplo.com'];
/** Matérias abertas como cortesia na conta de demonstração. */
const MATERIAS = ['introducao-ao-direito', 'nocoes-de-direito-constitucional'];

const args = process.argv.slice(2);
const soRemover = args.includes('--so-remover');
const diasArg = args.find((a) => a.startsWith('--dias='));
const dias = diasArg ? Number(diasArg.slice('--dias='.length)) : 90;
if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
  console.error('--dias precisa ser um inteiro entre 1 e 365');
  process.exit(1);
}
const dominio = (process.env.DOMINIO_BASE && process.env.DOMINIO_BASE !== 'localhost')
  ? process.env.DOMINIO_BASE : 'aprimoree.com.br';
const emails = args.filter((a) => !a.startsWith('--'));
if (!soRemover && emails.length === 0) emails.push(`demo@${dominio}`);
for (const e of emails) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { console.error(`e-mail inválido: ${e}`); process.exit(1); }
  if (LEGADO.includes(e.toLowerCase())) { console.error(`${e} é a conta de senha pública — escolha outro e-mail`); process.exit(1); }
}

async function hash(s) {
  const sal = randomBytes(16);
  const d = await scrypt(s.normalize('NFKC'), sal, 64);
  return `scrypt$16384$${sal.toString('base64')}$${d.toString('base64')}`;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});
const c = await pool.connect();

try {
  await c.query('BEGIN');

  // ---------------------------------------------------------------------
  // 1. Exclusão das contas de senha pública
  // ---------------------------------------------------------------------
  const { rows: perfis } = await c.query(
    `SELECT u.id, u.portal_id, u.papel, u.conta_id
       FROM usuario u JOIN conta ct ON ct.id = u.conta_id
      WHERE lower(ct.email) = ANY($1)`, [LEGADO]);
  const ids = perfis.map((p) => p.id);

  if (ids.length) {
    // Conta de professor carrega portal e repasse: apagar no automático
    // levaria dinheiro junto. Não é o caso da conta do seed — se um dia
    // for, a decisão é de gente, não de script.
    const { rows: [prof] } = await c.query(
      `SELECT count(*)::int AS n FROM portal WHERE professor_id = ANY($1)`, [ids]);
    if (prof.n > 0) throw new Error('a conta legada é dona de portal — exclusão manual');

    // O resto das referências a `usuario` apaga em cascata (licença,
    // progresso, resposta, sessão, pedido, assinatura). Estas três são
    // NO ACTION e precisam sair antes.
    await c.query('DELETE FROM conclusao WHERE usuario_id = ANY($1)', [ids]);
    await c.query('DELETE FROM tentativa_avaliacao WHERE usuario_id = ANY($1)', [ids]);
    await c.query('DELETE FROM atribuicao WHERE alvo_usuario_id = ANY($1)', [ids]);
    await c.query('DELETE FROM usuario WHERE id = ANY($1)', [ids]);
    await c.query(
      `DELETE FROM conta WHERE id = ANY($1)
         AND NOT EXISTS (SELECT 1 FROM usuario WHERE conta_id = conta.id)`,
      [[...new Set(perfis.map((p) => p.conta_id))]]);
    await c.query(
      `INSERT INTO log_auditoria (ator, acao, entidade, entidade_id, detalhe)
       VALUES ('script', 'conta.demo_legada_excluida', 'usuario', $1, $2)`,
      [ids[0], JSON.stringify({ emails: LEGADO, perfis: ids.length })]);
    console.log(`✔ excluída a conta de senha pública: ${LEGADO.join(', ')} (${ids.length} perfil/perfis)`);
  } else {
    console.log(`· nada a excluir: ${LEGADO.join(', ')} não existe`);
  }

  // ---------------------------------------------------------------------
  // 2. Contas novas, com senha sorteada
  // ---------------------------------------------------------------------
  const criadas = [];
  if (!soRemover) {
    const { rows: materias } = await c.query(
      `SELECT id, slug FROM materia
        WHERE portal_id = 0 AND status = 'publicado' AND slug = ANY($1)`, [MATERIAS]);

    for (const email of emails) {
      const senha = randomBytes(12).toString('base64url');
      const nome = 'Conta de demonstração';
      const { rows: [conta] } = await c.query(
        `INSERT INTO conta (email, nome, senha_hash)
         VALUES (lower($1), $2, $3)
         ON CONFLICT (lower(email)) DO UPDATE SET senha_hash = EXCLUDED.senha_hash
         RETURNING id, email`, [email, nome, await hash(senha)]);
      const { rows: [u] } = await c.query(
        `INSERT INTO usuario (portal_id, conta_id, nome, email, papel, status_conta)
         VALUES (0, $1, $2, $3, 'aluno', 'ATIVA')
         ON CONFLICT (conta_id, portal_id) DO UPDATE SET status_conta = 'ATIVA'
         RETURNING id`, [conta.id, nome, conta.email]);

      // Cortesia nas matérias de vitrine — sem campanha, sem cobrança, e
      // sem queimar o teste gratuito (quem demonstra quer mostrar o teste).
      for (const m of materias) {
        await c.query(
          `INSERT INTO licenca (usuario_id, portal_id, escopo, materia_id, origem, status,
                                inicio_em, fim_em, materia_portal_id)
           SELECT $1, 0, 'MATERIA', $2, 'PROMOCIONAL', 'ATIVA', now(), now() + make_interval(days => $3), 0
            WHERE NOT EXISTS (
              SELECT 1 FROM licenca WHERE usuario_id = $1 AND materia_id = $2
                 AND status = 'ATIVA' AND fim_em > now())`,
          [u.id, m.id, dias]);
      }
      await c.query(
        `INSERT INTO log_auditoria (ator, acao, entidade, entidade_id, detalhe)
         VALUES ('script', 'conta.demo_criada', 'usuario', $1, $2)`,
        [u.id, JSON.stringify({ email: conta.email, materias: materias.map((m) => m.slug), dias })]);
      criadas.push({ email: conta.email, senha, materias: materias.length });
    }
  }

  await c.query('COMMIT');

  for (const k of criadas) {
    console.log(`\n✔ conta de demonstração: ${k.email}`);
    console.log(`  senha: ${k.senha}`);
    console.log(`  cortesia em ${k.materias} matéria(s) por ${dias} dias`);
  }
  if (criadas.length) console.log('\n  (anote agora — as senhas não serão mostradas de novo)\n');
} catch (e) {
  await c.query('ROLLBACK');
  console.error(`✖ nada foi alterado: ${e.message}`);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
