'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  criarSessao, gerarHashSenha, validarSenha, COOKIE_SESSAO, DURACAO_SESSAO_DIAS,
} from '../../../lib/auth.ts';
import { portalAtual } from '../../../lib/portal-consultas.ts';
import { aceitarConvite } from '../../../lib/empresa-equipe.ts';

export interface EstadoConvite { erro?: string }

/**
 * Aceitar o convite: cria a conta no e-mail do convite (nunca em outro),
 * libera as trilhas e já abre a sessão — pedir login logo depois de
 * escolher a senha seria um passo a mais sem ganho nenhum.
 */
export async function acaoAceitarConvite(
  _e: EstadoConvite, dados: FormData,
): Promise<EstadoConvite> {
  const portal = await portalAtual();
  if (portal.tipo !== 'EMPRESA') return { erro: 'convite inválido' };

  const token = String(dados.get('token') ?? '');
  const nome = String(dados.get('nome') ?? '').trim();
  const senha = String(dados.get('senha') ?? '');
  if (nome.length < 2) return { erro: 'Diga como podemos te chamar.' };
  const erroSenha = validarSenha(senha);
  if (erroSenha) return { erro: erroSenha };

  let usuarioId: number;
  try {
    ({ usuarioId } = await aceitarConvite(portal.id, token, nome, await gerarHashSenha(senha)));
  } catch (err) {
    return { erro: (err as Error).message };
  }

  const { token: sessao, expiraEm } = await criarSessao(usuarioId);
  (await cookies()).set(COOKIE_SESSAO, sessao, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', expires: expiraEm, maxAge: DURACAO_SESSAO_DIAS * 86_400,
  });
  redirect('/painel?bemvindo=1');
}
