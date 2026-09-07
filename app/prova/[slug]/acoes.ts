'use server';

import { revalidatePath } from 'next/cache';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalAtual } from '../../../lib/portal-consultas.ts';
import { entregarTentativa, type ResultadoProva } from '../../../lib/avaliacao.ts';

export interface EstadoProva {
  erro?: string;
  resultado?: ResultadoProva;
}

/**
 * A entrega da prova. As respostas chegam como um mapa questão→
 * alternativa; a correção é toda no servidor (lib/avaliacao.ts), e o que
 * volta para a tela já é o veredito com o comentário de cada questão.
 *
 * O portal vem da requisição e o usuário da sessão: uma tentativa só
 * corrige contra a avaliação daquele portal, e só para quem a abriu.
 */
export async function acaoEntregarProva(
  _e: EstadoProva, dados: FormData,
): Promise<EstadoProva> {
  const portal = await portalAtual();
  const aluno = await alunoAtual();
  if (portal.tipo !== 'EMPRESA' || !aluno) return { erro: 'sessão expirada — entre de novo' };

  const avaliacaoId = Number(dados.get('avaliacaoId'));
  if (!Number.isInteger(avaliacaoId)) return { erro: 'avaliação inválida' };

  const respostas: Record<string, number> = {};
  for (const [chave, valor] of dados.entries()) {
    const m = /^q(\d+)$/.exec(chave);
    if (m) respostas[m[1]] = Number(valor);
  }

  try {
    const resultado = await entregarTentativa(portal.id, aluno.id, avaliacaoId, respostas);
    revalidatePath('/painel');
    return { resultado };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}
