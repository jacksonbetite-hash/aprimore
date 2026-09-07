'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '../../../lib/sessao.ts';
import { mudarStatusInteresse, STATUS, type StatusInteresse } from '../../../lib/empresas.ts';

/**
 * Fila do comercial: pegar um lead ("em contato"), encerrar ou devolver
 * à fila. Reconfere o papel no servidor, como toda ação do admin.
 */
export async function acaoStatusInteresse(dados: FormData) {
  const u = await exigirAdmin();
  if (!u) throw new Error('acesso negado');

  const id = Number(dados.get('id'));
  const status = String(dados.get('status') ?? '') as StatusInteresse;
  if (!Number.isInteger(id) || !STATUS.includes(status)) throw new Error('pedido inválido');

  await mudarStatusInteresse(u.email, id, status);
  revalidatePath('/admin/empresas');
}
