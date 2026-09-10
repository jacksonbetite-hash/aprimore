'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirPermissao } from '../../../lib/sessao.ts';
import type { Permissao } from '../../../lib/permissoes.ts';
import {
  criarVaga, editarVaga, publicarVaga, recusarVaga, pausarVaga, retomarVaga, reporVaga,
  type DadosVaga,
} from '../../../lib/admin-vagas.ts';
import {
  DIAS_MAXIMOS, TIPOS, REGIMES, MODALIDADES,
  type TipoVaga, type RegimeVaga, type ModalidadeVaga,
} from '../../../lib/vagas-rotulos.ts';
import type { EstadoAdmin } from '../acoes.ts';

async function admin(permissao: Permissao) {
  const u = await exigirPermissao(permissao);
  if (!u) throw new Error('acesso negado');
  return u;
}

function revalidarMural(id?: number) {
  revalidatePath('/vagas');
  revalidatePath('/admin/vagas');
  if (id) {
    revalidatePath(`/vagas/${id}`);
    revalidatePath(`/admin/vagas/${id}`);
  }
}

function lerFormulario(dados: FormData): DadosVaga {
  const escolha = <T extends string>(campo: string, aceitos: T[], padrao: T): T => {
    const v = String(dados.get(campo) ?? '') as T;
    return aceitos.includes(v) ? v : padrao;
  };
  return {
    titulo: String(dados.get('titulo') ?? ''),
    empresa: String(dados.get('empresa') ?? ''),
    empresaCnpj: String(dados.get('empresaCnpj') ?? ''),
    tipo: escolha('tipo', TIPOS, 'estagio'),
    regime: escolha('regime', REGIMES, 'integral'),
    modalidade: escolha('modalidade', MODALIDADES, 'presencial'),
    cidade: String(dados.get('cidade') ?? ''),
    uf: String(dados.get('uf') ?? ''),
    areaAtuacao: String(dados.get('areaAtuacao') ?? ''),
    descricao: String(dados.get('descricao') ?? ''),
    requisitos: String(dados.get('requisitos') ?? ''),
    faixaSalarial: String(dados.get('faixaSalarial') ?? ''),
    comoCandidatar: String(dados.get('comoCandidatar') ?? ''),
    contatoAnunciante: String(dados.get('contatoAnunciante') ?? ''),
  };
}

export async function acaoCriarVaga(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }

  let id: number;
  try {
    id = await criarVaga(u.email, lerFormulario(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarMural(id);
  redirect(`/admin/vagas/${id}?criada=1`);
}

export async function acaoEditarVaga(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }

  const id = Number(dados.get('id'));
  if (!Number.isInteger(id)) return { erro: 'Vaga inválida.' };
  try {
    await editarVaga(u.email, id, lerFormulario(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarMural(id);
  return { ok: 'Vaga salva.' };
}

/**
 * Aprovar e publicar. `dias` vem da tela porque nem toda vaga merece o
 * teto; o teto de 3 meses (§5.7.1) é conferido em `lib/admin-vagas.ts`,
 * onde a regra não depende de nenhum formulário.
 */
export async function acaoPublicarVaga(dados: FormData) {
  const u = await admin('conteudo.agir');
  const id = Number(dados.get('id'));
  const dias = Number(dados.get('dias') ?? DIAS_MAXIMOS);
  await publicarVaga(u.email, id, Number.isInteger(dias) ? dias : DIAS_MAXIMOS);
  revalidarMural(id);
}

export async function acaoRecusarVaga(dados: FormData) {
  const u = await admin('conteudo.agir');
  const id = Number(dados.get('id'));
  await recusarVaga(u.email, id, String(dados.get('motivo') ?? ''));
  revalidarMural(id);
}

export async function acaoPausarVaga(dados: FormData) {
  const u = await admin('conteudo.agir');
  const id = Number(dados.get('id'));
  await pausarVaga(u.email, id);
  revalidarMural(id);
}

export async function acaoRetomarVaga(dados: FormData) {
  const u = await admin('conteudo.agir');
  const id = Number(dados.get('id'));
  await retomarVaga(u.email, id);
  revalidarMural(id);
}

export async function acaoReporVaga(dados: FormData) {
  const u = await admin('conteudo.agir');
  const id = Number(dados.get('id'));
  await reporVaga(u.email, id);
  revalidarMural(id);
}
