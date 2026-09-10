import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Perfil do próprio usuário, contra banco real.
 *
 * O que estes testes travam é o que separa "editar meus dados" de um
 * buraco de segurança: trocar e-mail ou senha exige a senha atual, o
 * e-mail continua único dentro do portal, e o papel não é editável por
 * aqui — quem entra como professor não sai admin.
 */
const { pool, query, queryOne } = await import('./db.ts');
const { atualizarPerfil, lerPerfil } = await import('./perfil.ts');
const { cadastrar, autenticar, conferirSenha } = await import('./auth.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM usuario LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

let n = 0;
const SENHA = 'senha-bem-longa-2026';

async function novoUsuario() {
  const email = `teste-perfil-${Date.now()}-${++n}@exemplo.com`;
  const id = await cadastrar(0, 'Fulano de Teste', email, SENHA);
  assert.ok(id, 'o cadastro precisa ter criado o usuário');
  return { id: id!, email };
}

async function limpar() {
  await query(`DELETE FROM sessao WHERE usuario_id IN
                 (SELECT id FROM usuario WHERE email LIKE 'teste-perfil-%')`);
  await query(`DELETE FROM usuario WHERE email LIKE 'teste-perfil-%'`);
  await query(`DELETE FROM log_auditoria WHERE ator LIKE 'teste-perfil-%'`);
}

test.after(async () => { if (temBanco) { await limpar(); } await pool.end(); });

test('corrigir só o nome não exige senha nenhuma', talvez, async () => {
  const u = await novoUsuario();
  const r = await atualizarPerfil(u.id, 0, {
    nome: 'Fulano Corrigido', email: u.email, senhaAtual: '', senhaNova: '',
  });
  assert.deepEqual(r, { senhaTrocada: false, emailTrocado: false });
  assert.equal((await lerPerfil(u.id, 0))?.nome, 'Fulano Corrigido');
});

test('trocar o e-mail sem a senha atual é recusado', talvez, async () => {
  const u = await novoUsuario();
  await assert.rejects(
    atualizarPerfil(u.id, 0, {
      nome: 'Fulano', email: `outro-${u.email}`, senhaAtual: '', senhaNova: '',
    }),
    /senha atual/i,
  );
  assert.equal((await lerPerfil(u.id, 0))?.email, u.email, 'o e-mail não pode ter mudado');
});

test('senha atual errada não troca nada', talvez, async () => {
  const u = await novoUsuario();
  await assert.rejects(
    atualizarPerfil(u.id, 0, {
      nome: 'Fulano', email: u.email, senhaAtual: 'chute-errado', senhaNova: 'outra-senha-longa',
    }),
    /não confere/i,
  );
  assert.equal((await autenticar(0, u.email, SENHA)).ok, true, 'a senha velha continua valendo');
});

test('com a senha atual, e-mail e senha mudam de verdade', talvez, async () => {
  const u = await novoUsuario();
  const novoEmail = `teste-perfil-novo-${Date.now()}@exemplo.com`;
  const r = await atualizarPerfil(u.id, 0, {
    nome: 'Fulano', email: novoEmail, senhaAtual: SENHA, senhaNova: 'outra-senha-bem-longa',
  });
  assert.deepEqual(r, { senhaTrocada: true, emailTrocado: true });

  const entrada = await autenticar(0, novoEmail, 'outra-senha-bem-longa');
  assert.equal(entrada.ok, true, 'entra com o e-mail e a senha novos');
  assert.equal((await autenticar(0, u.email, SENHA)).ok, false, 'o par antigo não entra mais');
});

test('e-mail já usado no portal vira mensagem, não estouro', talvez, async () => {
  const a = await novoUsuario();
  const b = await novoUsuario();
  await assert.rejects(
    atualizarPerfil(b.id, 0, {
      nome: 'Fulano', email: a.email, senhaAtual: SENHA, senhaNova: '',
    }),
    /Já existe uma conta/i,
  );
});

test('o papel não se edita pelo perfil', talvez, async () => {
  const u = await novoUsuario();
  await query(`UPDATE usuario SET papel = 'professor' WHERE id = $1`, [u.id]);
  await atualizarPerfil(u.id, 0, {
    nome: 'Professor Fulano', email: u.email, senhaAtual: '', senhaNova: '',
  });
  const linha = await queryOne<{ papel: string }>(
    'SELECT papel FROM usuario WHERE id = $1', [u.id]);
  assert.equal(linha?.papel, 'professor', 'o papel continua o que a retaguarda definiu');
});

test('senha nova fraca é recusada antes de tocar no banco', talvez, async () => {
  const u = await novoUsuario();
  await assert.rejects(
    atualizarPerfil(u.id, 0, {
      nome: 'Fulano', email: u.email, senhaAtual: SENHA, senhaNova: '1234',
    }),
    /8 caracteres/,
  );
  const linha = await queryOne<{ senhaHash: string }>(
    `SELECT c.senha_hash AS "senhaHash" FROM usuario u JOIN conta c ON c.id = u.conta_id
      WHERE u.id = $1`, [u.id]);
  assert.equal(await conferirSenha(SENHA, linha!.senhaHash), true);
});
