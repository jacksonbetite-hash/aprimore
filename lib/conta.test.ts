import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * A credencial global (db/045) contra banco de verdade: uma senha para
 * todos os portais, um perfil por portal, e as regras de vinculação de
 * docs/plano-perfis-e-acessos.md §2.2.
 *
 * Sem banco alcançável, pula em vez de falhar (padrão de admin.test.ts).
 */
const { pool, query, queryOne } = await import('./db.ts');
const {
  cadastrar, autenticar, vincularNoPortal, garantirConta, contaPorEmail, criarSessao,
  usuarioPorToken, gerarHashSenha, revogarSessoesDaConta,
} = await import('./auth.ts');
const { emTransacao } = await import('./auditoria.ts');
const { cadastrarColaborador } = await import('./empresa-equipe.ts');

let temBanco = true;
try {
  await pool.query('SELECT 1 FROM conta LIMIT 1');
} catch {
  temBanco = false;
}
const talvez = { skip: temBanco ? false : 'banco não disponível' };

const PREFIXO = 'teste-conta-';
const email = (s: string) => `${PREFIXO}${s}@exemplo.com`;
const SENHA = 'senha-bem-longa-2026';

async function limpar() {
  await query(`DELETE FROM usuario WHERE email LIKE $1`, [`${PREFIXO}%`]);
  await query(`DELETE FROM conta WHERE email LIKE $1`, [`${PREFIXO}%`]);
}

/** Um portal de professor qualquer do banco, para cruzar com a plataforma. */
async function portalDeProfessor() {
  const p = await queryOne<{ id: number }>(
    `SELECT id::int AS id FROM portal WHERE id <> 0 AND tipo = 'PROFESSOR' AND status <> 'ENCERRADO' LIMIT 1`);
  return p?.id ?? null;
}

test('cadastrar cria conta + perfil; o mesmo e-mail em outro portal devolve null', talvez, async () => {
  await limpar();
  const id = await cadastrar(0, 'Pessoa Uma', email('uma'), SENHA);
  assert.ok(id);
  const conta = await contaPorEmail(email('uma'));
  assert.ok(conta?.senhaHash, 'a senha mora na conta');
  const perfil = await queryOne<{ contaId: number }>(
    'SELECT conta_id::int AS "contaId" FROM usuario WHERE id = $1', [id]);
  assert.equal(perfil?.contaId, conta!.id);

  const portal = await portalDeProfessor();
  if (portal) {
    assert.equal(await cadastrar(portal, 'Pessoa Uma', email('uma'), 'outra-senha-123'), null,
      'não nasce segunda conta com o mesmo e-mail, em portal nenhum');
  }
  assert.equal(await cadastrar(0, 'Pessoa Uma', email('uma'), SENHA), null);
});

test('a senha certa sem perfil no portal devolve semPerfil; vincular cria o perfil e a sessão abre lá', talvez, async () => {
  await limpar();
  const portal = await portalDeProfessor();
  if (!portal) return;
  await cadastrar(0, 'Pessoa Duas', email('duas'), SENHA);

  const r = await autenticar(portal, email('duas'), SENHA);
  assert.equal(r.ok, true);
  assert.ok(r.ok && r.usuarioId === null && r.semPerfil, 'senha certa, perfil nenhum aqui');

  const usuarioId = await vincularNoPortal(r.ok ? r.contaId : 0, portal);
  const de_novo = await autenticar(portal, email('duas'), SENHA);
  assert.ok(de_novo.ok && de_novo.usuarioId === usuarioId, 'na segunda vez o perfil já existe');
  assert.equal(await vincularNoPortal(r.ok ? r.contaId : 0, portal), usuarioId, 'vincular é idempotente');

  // Sessão continua por portal: o token do portal não abre a plataforma.
  const { token } = await criarSessao(usuarioId);
  assert.ok(await usuarioPorToken(token, portal));
  assert.equal(await usuarioPorToken(token, 0), null);

  // Senha errada continua sendo senha errada, com ou sem perfil.
  assert.equal((await autenticar(portal, email('duas'), 'errada-errada')).ok, false);
});

test('trocar a senha derruba as sessões da pessoa em todos os portais', talvez, async () => {
  await limpar();
  const portal = await portalDeProfessor();
  if (!portal) return;
  const naPlataforma = (await cadastrar(0, 'Pessoa Três', email('tres'), SENHA))!;
  const conta = (await contaPorEmail(email('tres')))!;
  const noPortal = await vincularNoPortal(conta.id, portal);
  const a = await criarSessao(naPlataforma);
  const b = await criarSessao(noPortal);
  assert.ok(await usuarioPorToken(a.token, 0));
  assert.ok(await usuarioPorToken(b.token, portal));

  await revogarSessoesDaConta(conta.id);
  assert.equal(await usuarioPorToken(a.token, 0), null);
  assert.equal(await usuarioPorToken(b.token, portal), null);
});

test('garantirConta: conta existente não troca de senha; documento divergente é recusado', talvez, async () => {
  await limpar();
  await cadastrar(0, 'Pessoa Quatro', email('quatro'), SENHA);
  const antes = (await contaPorEmail(email('quatro')))!;

  const r = await emTransacao((exec) => garantirConta(exec, {
    nome: 'Outro Nome', email: email('quatro'), senhaHash: 'scrypt$fake', documento: '52998224725',
  }));
  assert.equal(r.existia, true);
  const depois = (await contaPorEmail(email('quatro')))!;
  assert.equal(depois.senhaHash, antes.senhaHash, 'a senha de quem já tem conta não muda');
  assert.equal(depois.documento, '52998224725', 'o documento que faltava entra');
  assert.equal(depois.tipoDocumento, 'CPF');

  await assert.rejects(
    () => emTransacao((exec) => garantirConta(exec, {
      nome: 'Impostor', email: email('quatro'), senhaHash: null, documento: '11144477735',
    })),
    /outra pessoa/,
  );
  assert.equal((await contaPorEmail(email('quatro')))!.documento, '52998224725', 'nada mudou');
});

test('RH cadastra colaborador com e-mail que já tem conta: só o perfil nasce, a senha é a de sempre', talvez, async () => {
  await limpar();
  const empresa = await queryOne<{ id: number }>(
    `SELECT id::int AS id FROM portal WHERE tipo = 'EMPRESA' AND status <> 'ENCERRADO' LIMIT 1`);
  if (!empresa) return;
  await cadastrar(0, 'Pessoa Cinco', email('cinco'), SENHA);
  const r = await cadastrarColaborador('teste-rh', empresa.id,
    { nome: 'Pessoa Cinco', email: email('cinco'), setorId: null, matricula: '' },
    await gerarHashSenha('provisoria-ignorada'));
  assert.equal(r.ligadoAExistente, true);
  assert.ok((await autenticar(empresa.id, email('cinco'), SENHA)).ok, 'entra na empresa com a senha da plataforma');
  assert.equal((await autenticar(empresa.id, email('cinco'), 'provisoria-ignorada')).ok, false);
  await query('DELETE FROM usuario WHERE email = $1 AND portal_id = $2', [email('cinco'), empresa.id]);
});

test('trocar o e-mail da conta propaga a todos os perfis; UPDATE direto no perfil é recusado', talvez, async () => {
  await limpar();
  const portal = await portalDeProfessor();
  await cadastrar(0, 'Pessoa Seis', email('seis'), SENHA);
  const conta = (await contaPorEmail(email('seis')))!;
  if (portal) await vincularNoPortal(conta.id, portal);

  await query('UPDATE conta SET email = $2 WHERE id = $1', [conta.id, email('seis-novo')]);
  const perfis = await query<{ email: string }>('SELECT email FROM usuario WHERE conta_id = $1', [conta.id]);
  assert.ok(perfis.length >= 1);
  assert.ok(perfis.every((p) => p.email === email('seis-novo')), 'todos os perfis seguem a conta');

  await assert.rejects(
    () => query('UPDATE usuario SET email = $2 WHERE conta_id = $1', [conta.id, email('seis-fora')]),
    /vem da conta/,
  );
});

test('perfil inserido sem conta_id ganha a conta pelo e-mail; o último perfil apagado leva a conta', talvez, async () => {
  await limpar();
  await query(`INSERT INTO usuario (portal_id, nome, email, papel) VALUES (0, 'Legado', $1, 'aluno')`, [email('legado')]);
  const conta = await contaPorEmail(email('legado'));
  assert.ok(conta, 'o gatilho criou a conta');
  assert.equal(conta!.senhaHash, null, 'sem senha: ninguém entra até alguém definir uma');
  await query('DELETE FROM usuario WHERE email = $1', [email('legado')]);
  assert.equal(await contaPorEmail(email('legado')), null, 'conta órfã não fica para trás');
});

test.after(async () => {
  if (temBanco) await limpar();
  await pool.end();
});
