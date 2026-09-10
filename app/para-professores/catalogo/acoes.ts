'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cadastrarProfessorDoCatalogo } from '../../../lib/professor-catalogo.ts';
import { criarSessao, COOKIE_SESSAO, DURACAO_SESSAO_DIAS } from '../../../lib/auth.ts';

export interface EstadoCatalogo { erro?: string }

/**
 * O cadastro do professor SEM portal (etapa 5 do plano de perfis). O
 * trabalho mora em lib/professor-catalogo.ts; aqui é o que pertence à
 * requisição: o IP que sustenta o aceite do contrato e a sessão — quem
 * acabou de se cadastrar sai logado, direto no painel.
 */
export async function acaoCadastrarNoCatalogo(
  _e: EstadoCatalogo, dados: FormData,
): Promise<EstadoCatalogo> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim();
  let usuarioId: number;
  try {
    usuarioId = await cadastrarProfessorDoCatalogo({
      nome: String(dados.get('nome') ?? ''),
      email: String(dados.get('email') ?? ''),
      senha: String(dados.get('senha') ?? ''),
      documento: String(dados.get('documento') ?? ''),
      aceitouContrato: dados.get('aceite') === 'on',
      ip,
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  const { token, expiraEm } = await criarSessao(usuarioId);
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', expires: expiraEm, maxAge: DURACAO_SESSAO_DIAS * 86_400,
  });
  redirect('/professor?bemvindo=1');
}
