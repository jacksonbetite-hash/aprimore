import { query, queryOne } from './db.ts';
import {
  conferirSenha, gerarHashSenha, validarEmail, validarSenha, revogarSessoesDaConta,
} from './auth.ts';

/**
 * O próprio usuário mudando os dados dele — §10.
 *
 * Até aqui só a retaguarda mexia em `usuario`: o admin criava professor,
 * o aluno se cadastrava e ninguém mais editava nada. Quem opera o sistema
 * todo dia (admin e professor) não tinha como corrigir o próprio nome nem
 * trocar a senha inicial que recebeu por canal externo — o que empurra
 * para o pior caminho possível, que é nunca trocá-la.
 *
 * Três regras, todas conferidas aqui e não na tela:
 *
 *  1. Trocar e-mail ou senha exige a senha ATUAL. Uma sessão esquecida
 *     aberta numa máquina alheia não pode virar tomada de conta.
 *  2. O e-mail é único por portal (§5.10): o índice
 *     `usuario_email_por_portal` é a autoridade, e o erro dele vira
 *     mensagem legível em vez de estouro.
 *  3. Papel e status da conta NÃO se editam aqui. Ninguém se promove a
 *     admin pela própria tela de perfil.
 */
export interface DadosPerfil {
  nome: string;
  email: string;
  senhaAtual: string;
  senhaNova: string;
}

export interface PerfilAtual {
  id: number; nome: string; email: string; papel: string;
  criadoEm: Date; ultimoLoginEm: Date | null; temSenha: boolean;
}

export function lerPerfil(usuarioId: number, portalId: number) {
  // A senha mora na conta (db/045); o perfil só sabe se ela existe.
  return queryOne<PerfilAtual>(
    `SELECT u.id, u.nome, u.email, u.papel, u.criado_em AS "criadoEm",
            u.ultimo_login_em AS "ultimoLoginEm", (c.senha_hash IS NOT NULL) AS "temSenha"
       FROM usuario u JOIN conta c ON c.id = u.conta_id
      WHERE u.id = $1 AND u.portal_id = $2`,
    [usuarioId, portalId],
  );
}

export interface ResultadoPerfil {
  /** Verdadeiro quando a senha mudou: quem chamou precisa renovar a sessão. */
  senhaTrocada: boolean;
  emailTrocado: boolean;
}

export async function atualizarPerfil(
  usuarioId: number, portalId: number, d: DadosPerfil,
): Promise<ResultadoPerfil> {
  const atual = await queryOne<{ nome: string; email: string; senhaHash: string | null; contaId: number }>(
    `SELECT u.nome, c.email, c.senha_hash AS "senhaHash", c.id::int AS "contaId"
       FROM usuario u JOIN conta c ON c.id = u.conta_id
      WHERE u.id = $1 AND u.portal_id = $2`,
    [usuarioId, portalId],
  );
  if (!atual) throw new Error('conta não encontrada');

  const nome = d.nome.trim();
  if (nome.length < 2) throw new Error('Diga como podemos te chamar.');
  if (nome.length > 120) throw new Error('Nome longo demais.');

  const email = d.email.trim().toLowerCase();
  const erroEmail = validarEmail(email);
  if (erroEmail) throw new Error(erroEmail);

  const emailTrocado = email !== atual.email.trim().toLowerCase();
  const senhaTrocada = d.senhaNova.length > 0;

  if (emailTrocado || senhaTrocada) {
    if (!atual.senhaHash) throw new Error('Esta conta ainda não tem senha. Fale com o suporte.');
    if (!d.senhaAtual) throw new Error('Informe a sua senha atual para confirmar a mudança.');
    if (!(await conferirSenha(d.senhaAtual, atual.senhaHash))) {
      throw new Error('A senha atual não confere.');
    }
  }
  if (senhaTrocada) {
    const erroSenha = validarSenha(d.senhaNova);
    if (erroSenha) throw new Error(erroSenha);
    if (d.senhaNova === d.senhaAtual) throw new Error('A senha nova é igual à atual.');
  }

  const hash = senhaTrocada ? await gerarHashSenha(d.senhaNova) : null;
  try {
    // O nome é do perfil (cada portal pode conhecer a pessoa por um nome);
    // e-mail e senha são da CONTA, e valem em todos os portais de uma vez
    // — o gatilho de db/045 propaga o e-mail novo aos perfis.
    await query(
      `UPDATE usuario SET nome = $3 WHERE id = $1 AND portal_id = $2`,
      [usuarioId, portalId, nome],
    );
    await query(
      `UPDATE conta SET email = $2, senha_hash = coalesce($3, senha_hash) WHERE id = $1`,
      [atual.contaId, email, hash],
    );
  } catch (err) {
    // 23505 = violação de unicidade; aqui só existe uma, a do e-mail.
    if ((err as { code?: string }).code === '23505') {
      throw new Error('Já existe uma conta com esse e-mail.');
    }
    throw err;
  }
  // Senha nova: a chave antiga deixou de valer em TODOS os portais.
  if (senhaTrocada) await revogarSessoesDaConta(atual.contaId);

  await query(
    `INSERT INTO log_auditoria (ator, acao, entidade, entidade_id, detalhe)
     VALUES ($1, 'perfil.editado', 'usuario', $2, $3)`,
    [atual.email, usuarioId, JSON.stringify({ emailTrocado, senhaTrocada, nome })],
  );
  return { senhaTrocada, emailTrocado };
}
