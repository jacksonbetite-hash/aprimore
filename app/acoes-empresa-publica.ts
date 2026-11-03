'use server';

import { portalAtual } from '../lib/portal-consultas.ts';
import { registrarPedidoAcesso } from '../lib/empresa-equipe.ts';
import type { EstadoInteresse } from './empresas/acoes.ts';

/**
 * O "Fale com o RH" da página pública da universidade (db/048). Pública
 * e anônima, como o formulário de interesse da vitrine: o portal vem do
 * endereço da requisição, nunca do formulário — o pedido é da empresa
 * cujo endereço a pessoa abriu.
 */
export async function acaoPedirAcesso(
  _estado: EstadoInteresse, dados: FormData,
): Promise<EstadoInteresse> {
  // Campo que só robô preenche: descartado em silêncio, como em /empresas.
  if (String(dados.get('site') ?? '')) return { ok: 'Pedido enviado.' };

  const portal = await portalAtual();
  if (portal.tipo !== 'EMPRESA') return { erro: 'Este endereço não recebe pedidos de acesso.' };

  const campo = (c: string) => String(dados.get(c) ?? '');
  try {
    await registrarPedidoAcesso(portal.id, {
      nome: campo('nome'), email: campo('email'), setor: campo('setor'), mensagem: campo('mensagem'),
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  return {
    ok: 'Pedido enviado ao setor responsável pelo treinamento. Se o acesso for liberado, '
      + 'você recebe um link de convite no e-mail informado.',
  };
}
