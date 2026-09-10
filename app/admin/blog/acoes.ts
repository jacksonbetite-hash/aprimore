'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirPermissao } from '../../../lib/sessao.ts';
import type { Permissao } from '../../../lib/permissoes.ts';
import {
  criarPost, editarPost, mudarStatusPost, salvarCategoria, excluirCategoria,
  type DadosPost, type StatusPublicacao,
} from '../../../lib/admin-blog.ts';
import type { EstadoAdmin } from '../acoes.ts';

/**
 * Toda ação reconfere o papel no servidor. Esconder o link do menu não é
 * controle de acesso — é decoração (a mesma nota de `app/admin/acoes.ts`).
 */
async function admin(permissao: Permissao) {
  const u = await exigirPermissao(permissao);
  if (!u) throw new Error('acesso negado');
  return u;
}

const STATUS: StatusPublicacao[] = ['rascunho', 'em_revisao', 'aprovado', 'publicado', 'arquivado'];

/** O blog inteiro é estático até alguém publicar: revalidar é o que faz o site ver. */
function revalidarBlog(slug?: string) {
  revalidatePath('/blog');
  revalidatePath('/');
  if (slug) revalidatePath(`/blog/${slug}`);
}

function lerFormulario(dados: FormData): DadosPost {
  const status = String(dados.get('status') ?? 'rascunho') as StatusPublicacao;
  const minutos = Number(dados.get('minutosLeitura'));
  return {
    categoriaId: Number(dados.get('categoriaId')),
    titulo: String(dados.get('titulo') ?? ''),
    resumo: String(dados.get('resumo') ?? ''),
    corpo: String(dados.get('corpo') ?? ''),
    autorNome: String(dados.get('autorNome') ?? ''),
    autorCargo: String(dados.get('autorCargo') ?? ''),
    autorFoto: String(dados.get('autorFoto') ?? ''),
    capa: String(dados.get('capa') ?? ''),
    destaque: dados.get('destaque') === 'on',
    minutosLeitura: Number.isFinite(minutos) && minutos > 0 ? minutos : null,
    status: STATUS.includes(status) ? status : 'rascunho',
    slug: String(dados.get('slug') ?? ''),
  };
}

export async function acaoCriarPost(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }

  let id: number;
  let slug: string;
  try {
    ({ id, slug } = await criarPost(u.email, lerFormulario(dados)));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarBlog(slug);
  // Redirecionar para a edição, e não voltar à lista: quem acabou de
  // criar quase sempre quer conferir o texto no formulário cheio.
  redirect(`/admin/blog/${id}?criado=1`);
}

export async function acaoEditarPost(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }

  const id = Number(dados.get('id'));
  if (!Number.isInteger(id)) return { erro: 'Artigo inválido.' };

  try {
    const { slug } = await editarPost(u.email, id, lerFormulario(dados));
    revalidarBlog(slug);
    revalidatePath(`/admin/blog/${id}`);
    return { ok: 'Artigo salvo.' };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}

/** Publicar, despublicar e arquivar direto da lista, sem abrir o artigo. */
export async function acaoStatusPost(dados: FormData) {
  const u = await admin('conteudo.agir');
  const id = Number(dados.get('id'));
  const status = String(dados.get('status') ?? '') as StatusPublicacao;
  if (!STATUS.includes(status)) throw new Error('situação inválida');
  await mudarStatusPost(u.email, id, status);
  revalidarBlog(String(dados.get('slug') ?? '') || undefined);
  revalidatePath('/admin/blog');
  revalidatePath(`/admin/blog/${id}`);
}

export async function acaoSalvarCategoria(
  _e: EstadoAdmin, dados: FormData,
): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('conteudo.agir'); } catch { return { erro: 'Acesso negado.' }; }

  const bruto = String(dados.get('id') ?? '');
  const id = bruto ? Number(bruto) : null;
  const ordem = Number(dados.get('ordem') ?? 0);

  try {
    await salvarCategoria(u.email, id, String(dados.get('nome') ?? ''),
      Number.isFinite(ordem) ? ordem : 0);
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/blog/categorias');
  revalidarBlog();
  return { ok: id ? 'Categoria atualizada.' : 'Categoria criada.' };
}

/**
 * Edição na própria linha da tabela: nome e ordem, sem abrir tela.
 *
 * É uma ação separada da de criar porque a assinatura é outra — aqui não
 * há `useActionState` guardando estado, é um formulário por linha, e um
 * `(estado, dados)` receberia o FormData no lugar errado.
 */
export async function acaoEditarCategoriaLinha(dados: FormData) {
  const u = await admin('conteudo.agir');
  const ordem = Number(dados.get('ordem') ?? 0);
  await salvarCategoria(u.email, Number(dados.get('id')), String(dados.get('nome') ?? ''),
    Number.isFinite(ordem) ? ordem : 0);
  revalidatePath('/admin/blog/categorias');
  revalidarBlog();
}

export async function acaoExcluirCategoria(dados: FormData) {
  const u = await admin('conteudo.agir');
  await excluirCategoria(u.email, Number(dados.get('id')));
  revalidatePath('/admin/blog/categorias');
  revalidarBlog();
}
