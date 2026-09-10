'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalDoProfessor } from '../../lib/professor.ts';
import {
  criarMateria, editarMateria, mudarStatusMateria, buscarMateria,
  salvarAssunto, excluirAssunto, criarAula, editarAula, mudarStatusAula,
  salvarQuestao, excluirQuestao,
} from '../../lib/admin-cursos.ts';
import { lerMateria, lerAula, lerQuestao, situacao, numero } from '../../lib/admin-cursos-form.ts';
import { contestarApuracao, informarNota } from '../../lib/apuracao.ts';
import { removerVideoDaAula } from '../../lib/video-aula.ts';
import {
  ehProfessorDoCatalogo, posseDaMateria, materiaDe, assinarMateria,
  situacaoPermitidaAoProfessor, definirChavePix,
} from '../../lib/professor-catalogo.ts';
import { query } from '../../lib/db.ts';
import { PORTAL_PLATAFORMA } from '../../lib/portal.ts';
import type { EstadoAdmin } from '../admin/acoes.ts';

/**
 * Ações do professor SEM portal (docs/plano-perfis-e-acessos.md, etapa 5).
 *
 * Mesmas funções de biblioteca da retaguarda, sempre no portal 0, com a
 * trava que substitui "o portal vem da sessão": aqui a POSSE vem da
 * sessão — toda ação sobe do alvo (questão, aula, assunto) até a matéria
 * e confere `materia.professor_id = eu` antes de tocar no banco. Id de
 * curso alheio no formulário simplesmente não passa.
 */
async function eu() {
  const u = await alunoAtual();
  if (!u || (u.papel !== 'professor' && u.papel !== 'admin')) throw new Error('acesso negado');
  if (await portalDoProfessor(u.id)) throw new Error('quem tem portal opera pelo portal');
  if (!(await ehProfessorDoCatalogo(u.id))) throw new Error('você não é professor do catálogo');
  return u;
}

async function minhaMateria(usuarioId: number, materiaId: number) {
  if (!Number.isInteger(materiaId)) throw new Error('curso inválido');
  await posseDaMateria(query, usuarioId, materiaId);
  return materiaId;
}
async function materiaDaAula(usuarioId: number, aulaId: number) {
  const materiaId = await materiaDe({ aulaId });
  if (materiaId === null) throw new Error('aula não encontrada');
  return minhaMateria(usuarioId, materiaId);
}
async function materiaDoAssunto(usuarioId: number, assuntoId: number) {
  const materiaId = await materiaDe({ assuntoId });
  if (materiaId === null) throw new Error('assunto não encontrado');
  return minhaMateria(usuarioId, materiaId);
}

function revalidar() {
  revalidatePath('/professor', 'layout');
  revalidatePath('/catalogo');
  revalidatePath('/admin/cursos');
}

// ---------- Cursos ----------

export async function acaoCriarMateriaCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  const d = lerMateria(dados);
  // O que o professor do catálogo não decide: vitrine (o curso JÁ está
  // nela), destaque (é da casa), quem assina (é ele) e publicar (é da revisão).
  d.naVitrinePlataforma = false;
  d.destaque = false;
  d.professor = u.nome;
  if (!situacaoPermitidaAoProfessor(d.status, 'rascunho')) d.status = 'rascunho';
  let id: number;
  try {
    ({ id } = await criarMateria(u.email, PORTAL_PLATAFORMA, d));
    await assinarMateria(u.id, id, u.nome);
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  redirect(`/professor/cursos/${id}?criada=1`);
}

export async function acaoEditarMateriaCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  const id = Number(dados.get('id'));
  try {
    await minhaMateria(u.id, id);
    const atual = await buscarMateria(PORTAL_PLATAFORMA, id);
    const d = lerMateria(dados);
    d.naVitrinePlataforma = false;
    d.destaque = atual?.destaque ?? false;   // é da casa: o professor não mexe
    d.professor = u.nome;
    if (!situacaoPermitidaAoProfessor(d.status, atual?.status ?? 'rascunho')) d.status = atual!.status;
    await editarMateria(u.email, PORTAL_PLATAFORMA, id, d);
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  return { ok: 'Curso salvo.' };
}

export async function acaoStatusMateriaCatalogo(dados: FormData) {
  const u = await eu();
  const id = await minhaMateria(u.id, Number(dados.get('id')));
  const atual = await buscarMateria(PORTAL_PLATAFORMA, id);
  const pedido = situacao(dados.get('status'));
  if (!situacaoPermitidaAoProfessor(pedido, atual?.status ?? 'rascunho')) throw new Error('publicar é da revisão');
  await mudarStatusMateria(u.email, PORTAL_PLATAFORMA, id, pedido);
  revalidar();
}

// ---------- Assuntos ----------

export async function acaoSalvarAssuntoCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  const bruto = String(dados.get('id') ?? '');
  try {
    const materiaId = await minhaMateria(u.id, Number(dados.get('materiaId')));
    if (bruto) await materiaDoAssunto(u.id, Number(bruto));
    await salvarAssunto(u.email, PORTAL_PLATAFORMA, materiaId, bruto ? Number(bruto) : null,
      String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  return { ok: bruto ? 'Assunto atualizado.' : 'Assunto criado.' };
}

export async function acaoEditarAssuntoLinhaCatalogo(dados: FormData) {
  const u = await eu();
  const id = Number(dados.get('id'));
  const materiaId = await materiaDoAssunto(u.id, id);
  await salvarAssunto(u.email, PORTAL_PLATAFORMA, materiaId, id,
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidar();
}

export async function acaoExcluirAssuntoCatalogo(dados: FormData) {
  const u = await eu();
  const id = Number(dados.get('id'));
  await materiaDoAssunto(u.id, id);
  await excluirAssunto(u.email, PORTAL_PLATAFORMA, id);
  revalidar();
}

// ---------- Aulas ----------

export async function acaoCriarAulaCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  const d = lerAula(dados);
  let id: number;
  try {
    await materiaDoAssunto(u.id, d.assuntoId);
    ({ id } = await criarAula(u.email, PORTAL_PLATAFORMA, d));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  redirect(`/professor/cursos/aula/${id}?criada=1`);
}

export async function acaoEditarAulaCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  const id = Number(dados.get('id'));
  const d = lerAula(dados);
  try {
    await materiaDaAula(u.id, id);
    await materiaDoAssunto(u.id, d.assuntoId);   // mover para assunto alheio: não
    await editarAula(u.email, PORTAL_PLATAFORMA, id, d);
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  return { ok: 'Aula salva.' };
}

export async function acaoStatusAulaCatalogo(dados: FormData) {
  const u = await eu();
  const id = Number(dados.get('id'));
  await materiaDaAula(u.id, id);
  await mudarStatusAula(u.email, PORTAL_PLATAFORMA, id, situacao(dados.get('status')));
  revalidar();
}

export async function acaoRemoverVideoCatalogo(dados: FormData) {
  const u = await eu();
  const id = Number(dados.get('aulaId'));
  await materiaDaAula(u.id, id);
  await removerVideoDaAula(u.email, PORTAL_PLATAFORMA, id);
  revalidar();
}

// ---------- Questões ----------

export async function acaoSalvarQuestaoCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  const aulaId = Number(dados.get('aulaId'));
  const bruto = String(dados.get('id') ?? '');
  try {
    await materiaDaAula(u.id, aulaId);
    await salvarQuestao(u.email, PORTAL_PLATAFORMA, aulaId, bruto ? Number(bruto) : null, lerQuestao(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  return { ok: bruto ? 'Questão salva.' : 'Questão criada.' };
}

export async function acaoExcluirQuestaoCatalogo(dados: FormData) {
  const u = await eu();
  const aulaId = Number(dados.get('aulaId'));
  await materiaDaAula(u.id, aulaId);
  await excluirQuestao(u.email, PORTAL_PLATAFORMA, aulaId, Number(dados.get('id')));
  revalidar();
}

// ---------- Financeiro ----------

export async function acaoContestarCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await contestarApuracao({ professorId: u.id }, numero(dados.get('apuracaoId')), String(dados.get('texto') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/professor/financeiro');
  return { ok: 'Contestação registrada. A plataforma responde e aprova em seguida.' };
}

export async function acaoInformarNotaCatalogo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await informarNota({ professorId: u.id }, numero(dados.get('apuracaoId')), String(dados.get('numero') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/professor/financeiro');
  return { ok: 'Nota registrada. O repasse sai por Pix, na chave do seu contrato.' };
}

export async function acaoChavePix(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await eu(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await definirChavePix(u.id, String(dados.get('chave') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/professor/financeiro');
  return { ok: 'Chave Pix salva. É para ela que o repasse vai.' };
}
