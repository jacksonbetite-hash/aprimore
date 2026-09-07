'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { alunoAtual } from '../lib/sessao.ts';
import { portalIdAtual } from '../lib/portal-consultas.ts';
import { atualizarPerfil } from '../lib/perfil.ts';
import { criarSessao, revogarSessoesDo, COOKIE_SESSAO, DURACAO_SESSAO_DIAS } from '../lib/auth.ts';

export interface EstadoPerfil { erro?: string; ok?: string }

/**
 * Salvar o próprio perfil. Vale para qualquer papel — admin, professor e
 * aluno usam a mesma ação, porque a regra é a mesma: o usuário mexe na
 * conta DELE, e quem diz qual é vem da sessão, nunca do formulário.
 *
 * Ao trocar a senha, todas as sessões caem (é o ponto de trocar senha) e
 * uma nova é aberta para este navegador — senão quem acabou de trocar
 * seria deslogado como prêmio.
 */
export async function acaoSalvarPerfil(
  _e: EstadoPerfil, dados: FormData,
): Promise<EstadoPerfil> {
  const u = await alunoAtual();
  if (!u) return { erro: 'Sessão expirada. Entre de novo.' };
  const portalId = await portalIdAtual();

  let r;
  try {
    r = await atualizarPerfil(u.id, portalId, {
      nome: String(dados.get('nome') ?? ''),
      email: String(dados.get('email') ?? ''),
      senhaAtual: String(dados.get('senhaAtual') ?? ''),
      senhaNova: String(dados.get('senhaNova') ?? ''),
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }

  if (r.senhaTrocada) {
    await revogarSessoesDo(u.id);
    const { token, expiraEm } = await criarSessao(u.id);
    (await cookies()).set(COOKIE_SESSAO, token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      path: '/', expires: expiraEm, maxAge: DURACAO_SESSAO_DIAS * 86_400,
    });
  }

  revalidatePath('/', 'layout');
  return {
    ok: r.senhaTrocada
      ? 'Perfil salvo e senha trocada. As outras sessões suas foram encerradas.'
      : r.emailTrocado
        ? 'Perfil salvo. O próximo login é com o novo e-mail.'
        : 'Perfil salvo.',
  };
}
