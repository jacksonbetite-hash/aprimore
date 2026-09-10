'use server';

import { revalidatePath } from 'next/cache';
import { alterarPreco, concederLicenca, estenderLicenca, mudarStatusLicenca } from '../../lib/admin.ts';
import { exigirPermissao } from '../../lib/sessao.ts';
import type { Permissao } from '../../lib/permissoes.ts';
import type { Periodo, Produto } from '../../lib/precos.ts';

export interface EstadoAdmin { erro?: string; ok?: string }

/**
 * Toda ação administrativa reconfere o papel no servidor. Esconder o
 * link no cabeçalho não é controle de acesso — é decoração.
 */
async function admin(permissao: Permissao) {
  // A permissão é da AÇÃO, não da tela: o financeiro vê a tabela de
  // preços e não a altera; o suporte estende licença e não concede.
  const u = await exigirPermissao(permissao);
  if (!u) throw new Error('acesso negado');
  return u;
}

export async function acaoAlterarPreco(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('financeiro.agir'); } catch { return { erro: 'Acesso negado.' }; }

  const produto = String(dados.get('produto') ?? '') as Produto;
  const periodo = String(dados.get('periodo') ?? '') as Periodo;
  const valor = String(dados.get('valor') ?? '').replace(/\./g, '').replace(',', '.');
  const vigenteDe = String(dados.get('vigenteDe') ?? '');
  // §5.10: cada portal tem a própria tabela. O identificador vem do
  // formulário, mas `alterarPreco` refaz o `WHERE portal_id` em toda
  // consulta — um valor forjado não alcança a tabela de outro portal.
  const portalBruto = Number(dados.get('portalId'));
  const portalId = Number.isInteger(portalBruto) && portalBruto >= 0 ? portalBruto : 0;

  const reais = Number(valor);
  if (!Number.isFinite(reais) || reais < 0) return { erro: 'Valor inválido.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenteDe)) return { erro: 'Data de vigência inválida.' };
  if (!['MATERIA', 'CATALOGO'].includes(produto)) return { erro: 'Produto inválido.' };
  if (!['mensal', 'trimestral', 'semestral', 'anual'].includes(periodo)) return { erro: 'Período inválido.' };

  try {
    await alterarPreco(u.email, produto, periodo, Math.round(reais * 100), vigenteDe, portalId);
  } catch (err) {
    return { erro: 'Não foi possível alterar: ' + (err as Error).message };
  }
  revalidatePath('/admin/precos');
  revalidatePath(`/admin/portais/${portalId}`);
  if (portalId === 0) {
    revalidatePath('/planos');
    revalidatePath('/catalogo');
  }
  return { ok: `Novo preço vale a partir de ${vigenteDe.split('-').reverse().join('/')}.` };
}

export async function acaoConcederLicenca(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('licencas.conceder'); } catch { return { erro: 'Acesso negado.' }; }

  const usuarioId = Number(dados.get('usuarioId'));
  const materiaBruta = String(dados.get('materiaId') ?? '');
  const materiaId = materiaBruta === 'catalogo' ? null : Number(materiaBruta);
  const dias = Number(dados.get('dias'));

  if (!Number.isInteger(usuarioId)) return { erro: 'Aluno inválido.' };
  if (materiaId !== null && !Number.isInteger(materiaId)) return { erro: 'Matéria inválida.' };
  if (!Number.isInteger(dias) || dias < 1) return { erro: 'Informe quantos dias.' };

  try {
    await concederLicenca(u.email, usuarioId, materiaId, dias);
  } catch (err) {
    return { erro: 'Não foi possível conceder: ' + (err as Error).message };
  }
  revalidatePath('/admin/licencas');
  return { ok: `Cortesia de ${dias} dias concedida.` };
}

export async function acaoEstender(dados: FormData) {
  const u = await admin('licencas.suporte');
  await estenderLicenca(u.email, Number(dados.get('licencaId')), Number(dados.get('dias') ?? 30));
  revalidatePath('/admin/licencas');
}

export async function acaoSuspender(dados: FormData) {
  const u = await admin('licencas.suporte');
  const status = String(dados.get('status') ?? 'SUSPENSA') as 'ATIVA' | 'SUSPENSA' | 'CANCELADA';
  await mudarStatusLicenca(u.email, Number(dados.get('licencaId')), status);
  revalidatePath('/admin/licencas');
}
