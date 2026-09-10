import { redirect } from 'next/navigation';
import { alunoAtual, exigirPermissao } from '../../lib/sessao.ts';
import { pode, type Permissao } from '../../lib/permissoes.ts';

/**
 * As duas perguntas que uma tela da retaguarda faz sobre quem a abriu.
 *
 * `exigirTela` é para a tela que NÃO existe para quem não tem a
 * permissão — Cursos, Blog e Vagas para o financeiro. Ela redireciona
 * para a visão geral com o aviso, em vez de renderizar formulários cujas
 * ações vão recusar um a um.
 *
 * `permissoesDaTela` é para a tela que existe para todo mundo da equipe
 * e só ESCONDE os botões de agir — a tabela de preços que o financeiro
 * lê e o admin edita. O que ela devolve é conforto visual: cada ação
 * reconfere a permissão no servidor (app/admin/**\/acoes.ts).
 *
 * Vive em `app/` e não em `lib/` porque redireciona — depende de
 * `next/navigation`, que o executor de testes do Node não carrega.
 */
export async function exigirTela(permissao: Permissao) {
  const u = await exigirPermissao(permissao);
  if (!u) redirect('/admin?sem-permissao=1');
  return u;
}

export async function permissoesDaTela<const P extends readonly Permissao[]>(
  ...permissoes: P
): Promise<Record<P[number], boolean> & { papel: string }> {
  const u = await alunoAtual();
  const papel = u?.papel ?? '';
  const saida = { papel } as Record<P[number], boolean> & { papel: string };
  for (const p of permissoes) (saida as Record<string, unknown>)[p] = pode(papel, p);
  return saida;
}
