'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirPermissao } from '../../../lib/sessao.ts';
import type { Permissao } from '../../../lib/permissoes.ts';
import { PORTAL_PLATAFORMA } from '../../../lib/portal.ts';
import {
  salvarArea, excluirArea, criarMateria, editarMateria, mudarStatusMateria,
  salvarAssunto, excluirAssunto, criarAula, editarAula, mudarStatusAula,
  salvarQuestao, excluirQuestao,
  type DadosMateria, type DadosAula, type DadosQuestao,
  type StatusPublicacao, type TipoQuestao,
} from '../../../lib/admin-cursos.ts';
import type { EstadoAdmin } from '../acoes.ts';

async function admin(permissao: Permissao) {
  const u = await exigirPermissao(permissao);
  if (!u) throw new Error('acesso negado');
  return u;
}

const STATUS: StatusPublicacao[] = ['rascunho', 'em_revisao', 'aprovado', 'publicado', 'arquivado'];
const situacao = (v: FormDataEntryValue | null): StatusPublicacao => {
  const s = String(v ?? '') as StatusPublicacao;
  return STATUS.includes(s) ? s : 'rascunho';
};

/**
 * De qual portal é a operação (§5.10).
 *
 * Vem do formulário, mas nunca é aceito de olhos fechados: as funções de
 * `lib/admin-cursos.ts` refazem o `WHERE portal_id` em toda consulta, de
 * modo que um identificador forjado não alcança acervo de outro portal —
 * ele simplesmente não encontra a linha.
 */
const portalDo = (dados: FormData) => {
  const p = Number(dados.get('portalId'));
  return Number.isInteger(p) && p >= 0 ? p : PORTAL_PLATAFORMA;
};

const numero = (v: FormDataEntryValue | null, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : padrao;
};

function revalidarCatalogo(portalId: number) {
  revalidatePath('/admin/cursos');
  if (portalId === PORTAL_PLATAFORMA) {
    revalidatePath('/catalogo');
    revalidatePath('/');
  }
}

// ---------- Áreas ----------

export async function acaoSalvarArea(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = portalDo(dados);
  const bruto = String(dados.get('id') ?? '');
  try {
    await salvarArea(u.email, portalId, bruto ? Number(bruto) : null,
      String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarCatalogo(portalId);
  return { ok: bruto ? 'Área atualizada.' : 'Área criada.' };
}

export async function acaoEditarAreaLinha(dados: FormData) {
  const u = await admin('conteudo.agir');
  const portalId = portalDo(dados);
  await salvarArea(u.email, portalId, Number(dados.get('id')),
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidarCatalogo(portalId);
}

export async function acaoExcluirArea(dados: FormData) {
  const u = await admin('conteudo.agir');
  const portalId = portalDo(dados);
  await excluirArea(u.email, portalId, Number(dados.get('id')));
  revalidarCatalogo(portalId);
}

// ---------- Matérias ----------

function lerMateria(dados: FormData): DadosMateria {
  const onda = Number(dados.get('onda'));
  return {
    areaId: Number(dados.get('areaId')),
    nome: String(dados.get('nome') ?? ''),
    ementa: String(dados.get('ementa') ?? ''),
    onda: Number.isInteger(onda) && onda > 0 ? onda : null,
    status: situacao(dados.get('status')),
    professor: String(dados.get('professor') ?? ''),
    ordem: numero(dados.get('ordem')),
    naVitrinePlataforma: dados.get('naVitrinePlataforma') === 'on',
    destaque: dados.get('destaque') === 'on',
    nivel: String(dados.get('nivel') ?? ''),
  };
}

export async function acaoCriarMateria(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = portalDo(dados);
  let id: number;
  try {
    ({ id } = await criarMateria(u.email, portalId, lerMateria(dados)));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarCatalogo(portalId);
  redirect(`/admin/cursos/${id}?portal=${portalId}&criada=1`);
}

export async function acaoEditarMateria(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = portalDo(dados);
  const id = Number(dados.get('id'));
  try {
    await editarMateria(u.email, portalId, id, lerMateria(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/${id}`);
  return { ok: 'Curso salvo.' };
}

export async function acaoStatusMateria(dados: FormData) {
  const u = await admin('conteudo.agir');
  const portalId = portalDo(dados);
  const id = Number(dados.get('id'));
  await mudarStatusMateria(u.email, portalId, id, situacao(dados.get('status')));
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/${id}`);
}

// ---------- Assuntos ----------

export async function acaoSalvarAssunto(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = portalDo(dados);
  const materiaId = Number(dados.get('materiaId'));
  const bruto = String(dados.get('id') ?? '');
  try {
    await salvarAssunto(u.email, portalId, materiaId, bruto ? Number(bruto) : null,
      String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/${materiaId}`);
  return { ok: bruto ? 'Assunto atualizado.' : 'Assunto criado.' };
}

export async function acaoEditarAssuntoLinha(dados: FormData) {
  const u = await admin('conteudo.agir');
  const portalId = portalDo(dados);
  const materiaId = Number(dados.get('materiaId'));
  await salvarAssunto(u.email, portalId, materiaId, Number(dados.get('id')),
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/${materiaId}`);
}

export async function acaoExcluirAssunto(dados: FormData) {
  const u = await admin('conteudo.agir');
  const portalId = portalDo(dados);
  const materiaId = Number(dados.get('materiaId'));
  await excluirAssunto(u.email, portalId, Number(dados.get('id')));
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/${materiaId}`);
}

// ---------- Aulas ----------

function lerAula(dados: FormData): DadosAula {
  // A duração é digitada em minutos e segundos: pedir 4380 segundos a
  // quem acabou de gravar 1h13 é pedir uma conta de cabeça a cada aula.
  const minutos = numero(dados.get('minutos'));
  const segundos = numero(dados.get('segundos'));
  return {
    assuntoId: Number(dados.get('assuntoId')),
    titulo: String(dados.get('titulo') ?? ''),
    resumo: String(dados.get('resumo') ?? ''),
    duracaoSegundos: minutos * 60 + segundos,
    videoProvedor: String(dados.get('videoProvedor') ?? ''),
    videoId: String(dados.get('videoId') ?? ''),
    amostraGratuita: dados.get('amostraGratuita') === 'on',
    noTrial: dados.get('noTrial') === 'on',
    status: situacao(dados.get('status')),
    ordem: numero(dados.get('ordem')),
  };
}

export async function acaoCriarAula(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = portalDo(dados);
  let id: number;
  try {
    ({ id } = await criarAula(u.email, portalId, lerAula(dados)));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarCatalogo(portalId);
  redirect(`/admin/cursos/aula/${id}?portal=${portalId}&criada=1`);
}

export async function acaoEditarAula(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = portalDo(dados);
  const id = Number(dados.get('id'));
  try {
    await editarAula(u.email, portalId, id, lerAula(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/aula/${id}`);
  return { ok: 'Aula salva.' };
}

export async function acaoStatusAula(dados: FormData) {
  const u = await admin('conteudo.agir');
  const portalId = portalDo(dados);
  const id = Number(dados.get('id'));
  await mudarStatusAula(u.email, portalId, id, situacao(dados.get('status')));
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/aula/${id}`);
  revalidatePath(`/admin/cursos/${numero(dados.get('materiaId'))}`);
}

// ---------- Questões ----------

const TIPOS: TipoQuestao[] = ['multipla_escolha', 'certo_errado'];

function lerQuestao(dados: FormData): DadosQuestao {
  const tipo = String(dados.get('tipo') ?? '') as TipoQuestao;
  const correta = String(dados.get('correta') ?? '');
  // As alternativas chegam como campos numerados: texto0, comentario0…
  const alternativas: DadosQuestao['alternativas'] = [];
  for (let i = 0; i < 8; i++) {
    const texto = String(dados.get(`texto${i}`) ?? '');
    if (!texto.trim()) continue;
    alternativas.push({
      texto,
      comentario: String(dados.get(`comentario${i}`) ?? ''),
      correta: correta === String(i),
    });
  }
  return {
    tipo: TIPOS.includes(tipo) ? tipo : 'multipla_escolha',
    enunciado: String(dados.get('enunciado') ?? ''),
    origem: String(dados.get('origem') ?? 'autoral'),
    dificuldade: String(dados.get('dificuldade') ?? 'introdutorio'),
    ordem: numero(dados.get('ordem')),
    alternativas,
  };
}

export async function acaoSalvarQuestao(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = portalDo(dados);
  const aulaId = Number(dados.get('aulaId'));
  const bruto = String(dados.get('id') ?? '');
  try {
    await salvarQuestao(u.email, portalId, aulaId, bruto ? Number(bruto) : null,
      lerQuestao(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/aula/${aulaId}`);
  return { ok: bruto ? 'Questão salva.' : 'Questão criada.' };
}

export async function acaoExcluirQuestao(dados: FormData) {
  const u = await admin('conteudo.agir');
  const portalId = portalDo(dados);
  const aulaId = Number(dados.get('aulaId'));
  await excluirQuestao(u.email, portalId, aulaId, Number(dados.get('id')));
  revalidarCatalogo(portalId);
  revalidatePath(`/admin/cursos/aula/${aulaId}`);
}
