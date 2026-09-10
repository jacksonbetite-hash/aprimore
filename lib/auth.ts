import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { query, queryOne } from './db.ts';
import { emTransacao, type Exec } from './auditoria.ts';

const scrypt = promisify(scryptCb) as (
  senha: string | Buffer, sal: string | Buffer, tamanho: number,
) => Promise<Buffer>;

/**
 * Autenticação — §10 do discovery.
 *
 * Senha: scrypt do próprio Node. Sem dependência externa, e é uma KDF
 * lenta de memória rígida — o que bcrypt/argon dariam aqui também.
 * Sessão: token aleatório no cookie, mas o banco guarda só o SHA-256
 * dele. Vazar a tabela `sessao` não entrega sessão utilizável, e a
 * revogação é imediata (é uma linha, não um JWT solto no mundo).
 *
 * Desde db/045 a credencial é a CONTA (uma por e-mail, global) e o
 * `usuario` é o PERFIL num portal: a mesma senha entra na plataforma, no
 * portal do professor e no da empresa; o perfil de cada portal continua
 * separado, com licenças e progresso próprios (docs/plano-perfis-e-
 * acessos.md, §2.1).
 */

const CUSTO = { N: 16384, r: 8, p: 1 };   // ~100ms por hash, alvo usual
const TAMANHO_HASH = 64;
export const DURACAO_SESSAO_DIAS = 30;
export const COOKIE_SESSAO = 'ad_sessao';

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const derivada = await scrypt(senha.normalize('NFKC'), sal, TAMANHO_HASH);
  return `scrypt$${CUSTO.N}$${sal.toString('base64')}$${derivada.toString('base64')}`;
}

export async function conferirSenha(senha: string, guardado: string | null): Promise<boolean> {
  if (!guardado) return false;
  const [algoritmo, , salB64, hashB64] = guardado.split('$');
  if (algoritmo !== 'scrypt' || !salB64 || !hashB64) return false;

  const esperado = Buffer.from(hashB64, 'base64');
  const derivada = await scrypt(senha.normalize('NFKC'), Buffer.from(salB64, 'base64'), esperado.length);
  // timingSafeEqual exige mesmo tamanho — garantido acima pelo esperado.length
  return timingSafeEqual(derivada, esperado);
}

/** Requisitos mínimos de senha. Comprimento pesa mais que "complexidade". */
export function validarSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa de pelo menos 8 caracteres.';
  if (senha.length > 200) return 'Senha longa demais.';
  if (/^\d+$/.test(senha)) return 'Só números é fácil demais de adivinhar. Misture letras.';
  return null;
}

export function validarEmail(email: string): string | null {
  const limpo = email.trim();
  if (limpo.length < 5 || limpo.length > 254) return 'E-mail inválido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo)) return 'E-mail inválido.';
  return null;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface SessaoCriada { token: string; expiraEm: Date }

export async function criarSessao(usuarioId: number, userAgent?: string): Promise<SessaoCriada> {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_DIAS * 86_400_000);
  await query(
    `INSERT INTO sessao (usuario_id, token_hash, expira_em, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [usuarioId, hashToken(token), expiraEm, userAgent?.slice(0, 300) ?? null],
  );
  // §6.5: qualquer login zera o relógio de inatividade
  await query('UPDATE usuario SET ultimo_login_em = now() WHERE id = $1', [usuarioId]);
  return { token, expiraEm };
}

export interface UsuarioSessao {
  id: number; nome: string; email: string;
  // §5.11 — 'gestor' opera o portal de uma empresa. Vive no portal 0,
  // como o professor, e alcança /empresa pelo vínculo em portal_gestor:
  // o papel diz o que a pessoa é, o vínculo diz de QUAL empresa.
  // 'financeiro' e 'suporte' (db/044) são a equipe da plataforma ao lado
  // do admin; o que cada um pode está em lib/permissoes.ts.
  papel: 'aluno' | 'professor' | 'revisor' | 'admin' | 'gestor' | 'financeiro' | 'suporte';
  statusConta: 'ATIVA' | 'INATIVA_AVISO' | 'BLOQUEADA_INATIVIDADE' | 'ENCERRADA';
}

/**
 * §5.10: a base de alunos é separada por portal, então a sessão também é.
 * O cookie é por host e já não atravessa subdomínios, mas confiar só nisso
 * deixaria a separação a cargo do navegador. Aqui ela é verificada: token
 * de aluno do portal 7 não abre sessão no portal 3 nem na plataforma.
 * A credencial global (db/045) não muda isso: uma senha, uma sessão POR
 * portal — entrar no portal do professor não abre a plataforma.
 */
export function usuarioPorToken(token: string, portalId: number) {
  return queryOne<UsuarioSessao>(
    `SELECT u.id, u.nome, u.email, u.papel, u.status_conta AS "statusConta"
       FROM sessao s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.token_hash = $1
        AND u.portal_id = $2
        AND s.revogada_em IS NULL
        AND s.expira_em > now()`,
    [hashToken(token), portalId],
  );
}

export async function revogarSessao(token: string): Promise<void> {
  await query(
    'UPDATE sessao SET revogada_em = now() WHERE token_hash = $1 AND revogada_em IS NULL',
    [hashToken(token)],
  );
}

/** Derruba todas as sessões de UM perfil (o de um portal). */
export async function revogarSessoesDo(usuarioId: number): Promise<void> {
  await query(
    'UPDATE sessao SET revogada_em = now() WHERE usuario_id = $1 AND revogada_em IS NULL',
    [usuarioId],
  );
}

/**
 * Derruba as sessões da PESSOA em todos os portais — o que trocar a senha
 * exige: a chave antiga deixou de valer em todo lugar, não só onde ela
 * foi trocada.
 */
export async function revogarSessoesDaConta(contaId: number): Promise<void> {
  await query(
    `UPDATE sessao SET revogada_em = now()
      WHERE revogada_em IS NULL
        AND usuario_id IN (SELECT id FROM usuario WHERE conta_id = $1)`,
    [contaId],
  );
}

// ---------------------------------------------------------------------
// A conta (credencial global)
// ---------------------------------------------------------------------

export interface Conta {
  id: number; email: string; nome: string; senhaHash: string | null;
  documento: string | null; tipoDocumento: 'CPF' | 'CNPJ' | null;
}

export function contaPorEmail(email: string) {
  return queryOne<Conta>(
    `SELECT id::int AS id, email, nome, senha_hash AS "senhaHash",
            documento, tipo_documento AS "tipoDocumento"
       FROM conta WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
}

export interface ContaGarantida {
  id: number;
  /** A conta já existia (a pessoa já tem senha em algum portal). */
  existia: boolean;
  /** Depois desta chamada a conta tem senha. */
  temSenha: boolean;
}

/**
 * Acha a conta do e-mail ou cria uma — a operação que TODO cadastro passa
 * a usar (aluno, colaborador, convite, gestor, professor, equipe).
 *
 * Regras, na ordem:
 *  - conta nova nasce com o nome, a senha e o documento informados;
 *  - conta existente NÃO troca de senha por aqui (quem cadastra um
 *    perfil novo para um e-mail que já tem conta não entrega chave
 *    nova; a pessoa entra com a que já tem). Só uma conta ainda SEM
 *    senha ganha a informada;
 *  - documento: se os dois lados têm e diferem, é outra pessoa com o
 *    mesmo e-mail — recusa, e a orientação é usar outro e-mail. Se só
 *    um lado tem, a conta fica com ele.
 *
 * Roda dentro da transação de quem chama (`exec`) para que perfil e
 * conta nasçam ou falhem juntos.
 */
export async function garantirConta(
  exec: Exec,
  d: { nome: string; email: string; senhaHash: string | null; documento?: string | null },
): Promise<ContaGarantida> {
  const email = d.email.trim().toLowerCase();
  const nome = d.nome.trim().slice(0, 120);
  const documento = d.documento?.trim() || null;
  const tipo = documento ? (documento.length === 11 ? 'CPF' : 'CNPJ') : null;

  const [nova] = await exec<{ id: number }>(
    `INSERT INTO conta (email, nome, senha_hash, documento, tipo_documento)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (lower(email)) DO NOTHING
     RETURNING id::int AS id`,
    [email, nome || email, d.senhaHash, documento, tipo],
  );
  if (nova) return { id: nova.id, existia: false, temSenha: d.senhaHash !== null };

  const [atual] = await exec<{ id: number; senhaHash: string | null; documento: string | null }>(
    `SELECT id::int AS id, senha_hash AS "senhaHash", documento
       FROM conta WHERE lower(email) = $1 FOR UPDATE`,
    [email],
  );
  if (documento && atual.documento && atual.documento !== documento) {
    throw new Error(
      `${email} já é a conta de outra pessoa (o documento não confere). `
      + 'Para um acesso separado, use outro e-mail.',
    );
  }
  await exec(
    `UPDATE conta
        SET senha_hash = coalesce(senha_hash, $2),
            documento = coalesce(documento, $3),
            tipo_documento = coalesce(tipo_documento, $4)
      WHERE id = $1`,
    [atual.id, d.senhaHash, documento, tipo],
  );
  return { id: atual.id, existia: true, temSenha: Boolean(atual.senhaHash ?? d.senhaHash) };
}

/**
 * Cadastro pela tela pública (/cadastrar) — conta nova E perfil de aluno
 * no portal em que a tela foi aberta.
 *
 * E-mail que já tem conta em qualquer portal devolve `null`: a pessoa
 * não cria "outra" conta com o mesmo e-mail — entra com a senha que já
 * tem, e o perfil neste portal nasce na primeira entrada (`entrar`, em
 * app/acoes-auth.ts). Quem quer acesso distinto usa outro e-mail — é a
 * regra do pedido, e a tela diz isso com todas as letras.
 */
export async function cadastrar(portalId: number, nome: string, email: string, senha: string) {
  const limpo = email.trim().toLowerCase();
  const hash = await gerarHashSenha(senha);
  return emTransacao(async (exec) => {
    const conta = await garantirConta(exec, { nome, email: limpo, senhaHash: hash });
    if (conta.existia) return null;   // já tem conta: entre com a mesma senha
    const [u] = await exec<{ id: number }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
       VALUES ($1, $2, $3, $4, 'aluno')
       ON CONFLICT (portal_id, lower(email)) DO NOTHING
       RETURNING id::int AS id`,
      [portalId, conta.id, nome.trim().slice(0, 120), limpo],
    );
    return u?.id ?? null;
  });
}

/**
 * O perfil de aluno que nasce na PRIMEIRA ENTRADA num portal em que a
 * conta ainda não existe — plataforma e portal de professor. Portal de
 * empresa não passa por aqui (é fechado; quem libera é o RH), salvo o
 * autocadastro por domínio, que tem função própria em empresa-equipe.
 */
export async function vincularNoPortal(contaId: number, portalId: number) {
  const linha = await queryOne<{ id: number }>(
    `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
     SELECT $2, c.id, c.nome, c.email, 'aluno' FROM conta c WHERE c.id = $1
     ON CONFLICT (conta_id, portal_id) DO NOTHING
     RETURNING id::int AS id`,
    [contaId, portalId],
  );
  if (linha) return linha.id;
  const existente = await queryOne<{ id: number }>(
    'SELECT id::int AS id FROM usuario WHERE conta_id = $1 AND portal_id = $2', [contaId, portalId]);
  return existente!.id;
}

export type ResultadoAutenticacao =
  | { ok: false; motivo: 'credenciais' | 'encerrada' }
  | { ok: true; contaId: number; usuarioId: number; statusConta: string; papel: UsuarioSessao['papel'] }
  /** Senha certa, mas a pessoa ainda não tem perfil neste portal. */
  | { ok: true; contaId: number; usuarioId: null; semPerfil: true };

/**
 * A senha é da CONTA; o perfil é do portal em que o login foi feito.
 * Senha certa sem perfil aqui devolve `semPerfil`, e quem chama decide
 * se o perfil nasce (plataforma, portal de professor) ou se a porta
 * fica fechada (empresa).
 */
export async function autenticar(
  portalId: number, email: string, senha: string,
): Promise<ResultadoAutenticacao> {
  const conta = await queryOne<{ id: number; senhaHash: string | null }>(
    `SELECT id::int AS id, senha_hash AS "senhaHash" FROM conta WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  // Confere a senha mesmo sem conta, com um hash descartável: sem isso o
  // tempo de resposta revelaria quais e-mails existem.
  const referencia = conta?.senhaHash ?? 'scrypt$16384$YWJjZGVmZ2hpamtsbW5vcA==$'
    + Buffer.alloc(64).toString('base64');
  const confere = await conferirSenha(senha, referencia);
  if (!conta || !confere) return { ok: false, motivo: 'credenciais' };

  const u = await queryOne<{ id: number; statusConta: string; papel: UsuarioSessao['papel'] }>(
    `SELECT id::int AS id, status_conta AS "statusConta", papel
       FROM usuario WHERE conta_id = $1 AND portal_id = $2`,
    [conta.id, portalId],
  );
  if (!u) return { ok: true, contaId: conta.id, usuarioId: null, semPerfil: true };
  if (u.statusConta === 'ENCERRADA') return { ok: false, motivo: 'encerrada' };
  return { ok: true, contaId: conta.id, usuarioId: u.id, statusConta: u.statusConta, papel: u.papel };
}
