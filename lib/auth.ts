import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { query, queryOne } from './db.ts';

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
  papel: 'aluno' | 'professor' | 'revisor' | 'admin' | 'gestor';
  statusConta: 'ATIVA' | 'INATIVA_AVISO' | 'BLOQUEADA_INATIVIDADE' | 'ENCERRADA';
}

/**
 * §5.10: a base de alunos é separada por portal, então a sessão também é.
 * O cookie é por host e já não atravessa subdomínios, mas confiar só nisso
 * deixaria a separação a cargo do navegador. Aqui ela é verificada: token
 * de aluno do portal 7 não abre sessão no portal 3 nem na plataforma.
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

/** Usada ao trocar a senha: derruba todas as outras sessões. */
export async function revogarSessoesDo(usuarioId: number): Promise<void> {
  await query(
    'UPDATE sessao SET revogada_em = now() WHERE usuario_id = $1 AND revogada_em IS NULL',
    [usuarioId],
  );
}


/**
 * O mesmo e-mail pode existir na plataforma e no portal de um professor:
 * são bases separadas (§5.10), e quem cadastra num portal não vira aluno
 * do outro. Por isso o conflito é resolvido contra
 * `usuario_email_por_portal` — o índice global de e-mail deixou de existir
 * em `db/018_portal.sql`, e um `ON CONFLICT (lower(email))` aqui quebraria
 * o cadastro inteiro.
 */
export async function cadastrar(portalId: number, nome: string, email: string, senha: string) {
  const limpo = email.trim().toLowerCase();
  const linha = await queryOne<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, senha_hash, papel)
     VALUES ($1, $2, $3, $4, 'aluno')
     ON CONFLICT (portal_id, lower(email)) DO NOTHING
     RETURNING id`,
    [portalId, nome.trim().slice(0, 120), limpo, await gerarHashSenha(senha)],
  );
  return linha?.id ?? null;   // null = e-mail já cadastrado neste portal
}

export async function autenticar(portalId: number, email: string, senha: string) {
  const u = await queryOne<{
    id: number; senhaHash: string | null; statusConta: string; papel: UsuarioSessao['papel'];
  }>(
    `SELECT id, senha_hash AS "senhaHash", status_conta AS "statusConta", papel
       FROM usuario WHERE portal_id = $1 AND lower(email) = lower($2)`,
    [portalId, email.trim()],
  );
  // Confere a senha mesmo sem usuário, com um hash descartável: sem isso o
  // tempo de resposta revelaria quais e-mails existem.
  const referencia = u?.senhaHash ?? 'scrypt$16384$YWJjZGVmZ2hpamtsbW5vcA==$'
    + Buffer.alloc(64).toString('base64');
  const confere = await conferirSenha(senha, referencia);
  if (!u || !confere) return { ok: false as const, motivo: 'credenciais' as const };
  if (u.statusConta === 'ENCERRADA') return { ok: false as const, motivo: 'encerrada' as const };
  return { ok: true as const, usuarioId: u.id, statusConta: u.statusConta, papel: u.papel };
}
