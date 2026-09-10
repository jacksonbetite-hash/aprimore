import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * O cadastro de usuários da retaguarda contra banco de verdade — as regras
 * que só as constraints reais conferem: e-mail único por portal, enum de
 * papel, sessão revogada ao trocar senha e papel.
 *
 * Sem banco alcançável, pula em vez de falhar (padrão de admin.test.ts).
 */
const { pool, query, queryOne } = await import('./db.ts');
const {
  criarUsuario, editarUsuario, definirSenhaProvisoria, mudarStatusConta, definirPapel,
  listarUsuarios, buscarUsuario, outrosPerfis,
} = await import('./admin-usuarios.ts');
const { criarSessao, usuarioPorToken, conferirSenha } = await import('./auth.ts');

let temBanco = true;
try {
  await pool.query('SELECT 1 FROM usuario LIMIT 1');
} catch {
  temBanco = false;
}
const talvez = { skip: temBanco ? false : 'banco não disponível' };

const PREFIXO = 'teste-usuarios-';
const email = (s: string) => `${PREFIXO}${s}@exemplo.com`;
const ATOR = 'teste-admin@exemplo.com';

async function limpar() {
  await query(`DELETE FROM usuario WHERE email LIKE $1`, [`${PREFIXO}%`]);
  await query(`DELETE FROM log_auditoria WHERE ator = $1`, [ATOR]);
}

test('aluno da plataforma nasce uma vez; a segunda vez recusa', talvez, async () => {
  await limpar();
  const r = await criarUsuario(ATOR, {
    tipo: 'aluno', nome: 'Aluna Teste', email: email('aluna'), senha: 'senha-longa-1', portalId: 0,
    cpf: '529.982.247-25',
  });
  assert.equal(r.ligadoAExistente, false);
  const u = await buscarUsuario(r.id);
  assert.equal(u?.papel, 'aluno');
  assert.equal(u?.portalId, 0);
  assert.equal(u?.cpf, '52998224725', 'o CPF é guardado só com dígitos');

  await assert.rejects(
    () => criarUsuario(ATOR, { tipo: 'aluno', nome: 'Outra', email: email('aluna'), senha: 'senha-longa-1', portalId: 0 }),
    /já tem conta/,
  );
});

test('CPF inválido é recusado antes de gravar', talvez, async () => {
  await assert.rejects(
    () => criarUsuario(ATOR, { tipo: 'aluno', nome: 'X Y', email: email('cpf'), senha: 'senha-longa-1', portalId: 0, cpf: '111.111.111-11' }),
    /CPF inválido/,
  );
  assert.equal(await queryOne('SELECT 1 FROM usuario WHERE email = $1', [email('cpf')]), null);
});

test('equipe: e-mail de aluno é promovido, senha trocada; professor não vira equipe', talvez, async () => {
  await limpar();
  const aluno = await criarUsuario(ATOR, {
    tipo: 'aluno', nome: 'Futuro Suporte', email: email('suporte'), senha: 'senha-antiga-1', portalId: 0,
  });
  const promovido = await criarUsuario(ATOR, {
    tipo: 'equipe', papel: 'suporte', nome: 'Futuro Suporte', email: email('suporte'),
    senha: 'senha-nova-22', portalId: 0,
  });
  assert.equal(promovido.id, aluno.id, 'a mesma conta, não uma nova');
  assert.equal(promovido.ligadoAExistente, true);
  const u = await queryOne<{ papel: string; senhaHash: string }>(
    `SELECT u.papel, c.senha_hash AS "senhaHash" FROM usuario u JOIN conta c ON c.id = u.conta_id
      WHERE u.id = $1`, [aluno.id]);
  assert.equal(u?.papel, 'suporte');
  assert.equal(await conferirSenha('senha-nova-22', u!.senhaHash), true);
  assert.equal(await conferirSenha('senha-antiga-1', u!.senhaHash), false);

  await assert.rejects(
    () => criarUsuario(ATOR, { tipo: 'equipe', papel: 'gerente', nome: 'X Y', email: email('x'), senha: 'senha-longa-1', portalId: 0 }),
    /Escolha o papel/,
  );

  const prof = await criarUsuario(ATOR, {
    tipo: 'professor', nome: 'Prof Teste', email: email('prof'), senha: 'senha-longa-1', portalId: 0,
  });
  await assert.rejects(
    () => criarUsuario(ATOR, { tipo: 'equipe', papel: 'admin', nome: 'Prof Teste', email: email('prof'), senha: 'senha-longa-1', portalId: 0 }),
    /não vira equipe/,
  );
  await assert.rejects(() => definirPapel(ATOR, prof.id, 'admin'), /vem do portal/);
});

test('senha provisória e troca de papel derrubam as sessões abertas', talvez, async () => {
  await limpar();
  const r = await criarUsuario(ATOR, {
    tipo: 'aluno', nome: 'Com Sessão', email: email('sessao'), senha: 'senha-longa-1', portalId: 0,
  });
  const { token } = await criarSessao(r.id);
  assert.ok(await usuarioPorToken(token, 0), 'a sessão abre');

  await definirSenhaProvisoria(ATOR, r.id, 'provisoria-99');
  assert.equal(await usuarioPorToken(token, 0), null, 'caiu com a senha nova');

  const { token: token2 } = await criarSessao(r.id);
  await definirPapel(ATOR, r.id, 'financeiro');
  assert.equal(await usuarioPorToken(token2, 0), null, 'caiu com o papel novo');
  assert.equal((await buscarUsuario(r.id))?.papel, 'financeiro');

  await definirPapel(ATOR, r.id, 'aluno');
  assert.equal((await buscarUsuario(r.id))?.papel, 'aluno');
  await assert.rejects(() => definirSenhaProvisoria(ATOR, r.id, 'curta'), /8 caracteres/);
});

test('estado da conta: encerrar derruba sessão e a lista filtra por estado', talvez, async () => {
  await limpar();
  const r = await criarUsuario(ATOR, {
    tipo: 'aluno', nome: 'Vai Encerrar', email: email('encerra'), senha: 'senha-longa-1', portalId: 0,
  });
  const { token } = await criarSessao(r.id);
  await mudarStatusConta(ATOR, r.id, 'ENCERRADA');
  assert.equal(await usuarioPorToken(token, 0), null);

  const encerradas = await listarUsuarios({ busca: PREFIXO, status: 'ENCERRADA' });
  assert.ok(encerradas.some((u) => u.id === r.id));
  const ativas = await listarUsuarios({ busca: PREFIXO, status: 'ATIVA' });
  assert.ok(!ativas.some((u) => u.id === r.id));

  await mudarStatusConta(ATOR, r.id, 'ATIVA');
  assert.equal((await buscarUsuario(r.id))?.statusConta, 'ATIVA');
});

test('editar: e-mail que colide no mesmo portal é recusado; busca acha por CPF', talvez, async () => {
  await limpar();
  const a = await criarUsuario(ATOR, { tipo: 'aluno', nome: 'A A', email: email('a'), senha: 'senha-longa-1', portalId: 0 });
  await criarUsuario(ATOR, { tipo: 'aluno', nome: 'B B', email: email('b'), senha: 'senha-longa-1', portalId: 0 });
  await assert.rejects(
    () => editarUsuario(ATOR, a.id, { nome: 'A A', email: email('b'), cpf: '', nascimento: '' }),
    /já é de outra conta/,
  );
  await editarUsuario(ATOR, a.id, { nome: 'A Editada', email: email('a'), cpf: '529.982.247-25', nascimento: '2000-01-31' });
  const u = await buscarUsuario(a.id);
  assert.equal(u?.nome, 'A Editada');
  assert.equal(u?.cpf, '52998224725');

  const porCpf = await listarUsuarios({ busca: '529982' });
  assert.ok(porCpf.some((x) => x.id === a.id), 'acha pelo começo do CPF');
  assert.equal(porCpf.find((x) => x.id === a.id)?.documentoMascarado, '***.***.247-25');

  const auditoria = await query(
    `SELECT acao FROM log_auditoria WHERE ator = $1 AND entidade = 'usuario' AND entidade_id = $2 ORDER BY id`,
    [ATOR, a.id]);
  assert.deepEqual(auditoria.map((l) => l.acao), ['usuario.criado', 'usuario.editado']);
});

test('outros perfis: o mesmo e-mail em outro portal aparece na ficha', talvez, async () => {
  await limpar();
  const portal = await queryOne<{ id: number }>(
    `SELECT id::int AS id FROM portal WHERE id <> 0 AND tipo = 'PROFESSOR' AND status <> 'ENCERRADO' LIMIT 1`);
  if (!portal) return; // sem portal de professor no banco, nada a cruzar
  const a = await criarUsuario(ATOR, { tipo: 'aluno', nome: 'Dupla', email: email('dupla'), senha: 'senha-longa-1', portalId: 0 });
  const b = await criarUsuario(ATOR, { tipo: 'aluno', nome: 'Dupla', email: email('dupla'), senha: 'senha-longa-1', portalId: portal.id });
  const outros = await outrosPerfis(a.id);
  assert.deepEqual(outros.map((o) => o.id), [b.id]);
  await limpar();
});

test.after(async () => {
  if (temBanco) await limpar();
  await pool.end();
});
