'use server';

import { revalidatePath } from 'next/cache';
import { exigirPermissao } from '../../../lib/sessao.ts';
import { mudarStatusInteresse, STATUS, type StatusInteresse } from '../../../lib/empresas.ts';
import { responderOrcamento, recusarOrcamento } from '../../../lib/empresa-catalogo.ts';
import type { EstadoAdmin } from '../acoes.ts';

/**
 * Fila do comercial: pegar um lead ("em contato"), encerrar ou devolver
 * à fila. Reconfere o papel no servidor, como toda ação do admin.
 */
export async function acaoStatusInteresse(dados: FormData) {
  const u = await exigirPermissao('cadastros.agir');
  if (!u) throw new Error('acesso negado');

  const id = Number(dados.get('id'));
  const status = String(dados.get('status') ?? '') as StatusInteresse;
  if (!Number.isInteger(id) || !STATUS.includes(status)) throw new Error('pedido inválido');

  await mudarStatusInteresse(u.email, id, status);
  revalidatePath('/admin/empresas');
}

// ---------------------------------------------------------------------
// Orçamentos de vagas do catálogo (db/047) — resposta do comercial
// ---------------------------------------------------------------------

/** "1.990,00" → 199000. Ninguém digita centavos na retaguarda. */
const centavosDe = (v: FormDataEntryValue | null) => {
  const reais = Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(reais) && reais >= 0 ? Math.round(reais * 100) : NaN;
};

export async function acaoResponderOrcamento(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await exigirPermissao('financeiro.agir');
  if (!u) return { erro: 'Acesso negado.' };
  const valor = centavosDe(dados.get('valor'));
  if (!Number.isFinite(valor)) return { erro: 'Valor inválido.' };
  try {
    await responderOrcamento(u.email, Number(dados.get('id')), valor, String(dados.get('resposta') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/empresas');
  return { ok: 'Proposta enviada. A empresa aceita e paga pelo checkout.' };
}

export async function acaoRecusarOrcamento(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await exigirPermissao('financeiro.agir');
  if (!u) return { erro: 'Acesso negado.' };
  try {
    await recusarOrcamento(u.email, Number(dados.get('id')), String(dados.get('resposta') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/empresas');
  return { ok: 'Orçamento recusado.' };
}
