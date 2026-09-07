'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { registrarInteresse } from '../../lib/empresas.ts';
import { assinarPortal } from '../../lib/portal-assinatura.ts';
import { criarSessao, COOKIE_SESSAO, DURACAO_SESSAO_DIAS } from '../../lib/auth.ts';
import type { MeioPagamento } from '../../lib/pagamento.ts';

export interface EstadoInteresse { erro?: string; ok?: string }

/**
 * O formulário de interesse corporativo (§12-B.1). Público, sem sessão:
 * quem preenche é o RH de uma empresa, não um aluno. A validação mora em
 * lib/empresas.ts; aqui só se traduz o FormData e a exceção.
 */
export async function acaoRegistrarInteresse(
  _estado: EstadoInteresse, dados: FormData,
): Promise<EstadoInteresse> {
  // Campo que só robô preenche: humano não vê, e o envio é descartado em
  // silêncio — responder "erro" ensinaria o robô a pular o campo.
  if (String(dados.get('site') ?? '')) return { ok: 'Recebemos o seu contato.' };

  const campo = (c: string) => String(dados.get(c) ?? '');
  try {
    await registrarInteresse({
      nome: campo('nome'), email: campo('email'), telefone: campo('telefone'),
      empresa: campo('empresa'), cnpj: campo('cnpj'), porte: campo('porte'),
      plano: campo('plano'), mensagem: campo('mensagem'),
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  return { ok: 'Recebemos o seu contato. Em até 2 dias úteis alguém do nosso time escreve para marcar a apresentação.' };
}

/**
 * A contratação do Portal da Empresa (§5.11, etapa 1). O trabalho pesado
 * mora em `assinarPortal`, o mesmo do professor; aqui fica só o que
 * pertence à requisição: o IP que sustenta o aceite do contrato, e a
 * sessão — quem acabou de contratar sai logado, direto para a tela de
 * pagamento, sem passar por um login que ainda nem sabe que tem.
 */
export interface EstadoContratarEmpresa { erro?: string }

export async function acaoContratarEmpresa(
  _estado: EstadoContratarEmpresa, dados: FormData,
): Promise<EstadoContratarEmpresa> {
  const meio = String(dados.get('meio') ?? 'PIX');
  if (meio !== 'PIX' && meio !== 'CARTAO') return { erro: 'Meio de pagamento inválido.' };
  const planoId = Number(dados.get('planoId'));
  if (!Number.isInteger(planoId)) return { erro: 'Escolha um plano.' };

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim();

  let referencia: string;
  let responsavelId: number;
  try {
    const r = await assinarPortal({
      tipo: 'EMPRESA',
      planoId,
      nome: String(dados.get('nome') ?? ''),
      email: String(dados.get('email') ?? ''),
      senha: String(dados.get('senha') ?? ''),
      cnpj: String(dados.get('cnpj') ?? ''),
      // A empresa não abre subconta: o KYC do §8.2 não se aplica, e pedir
      // renda e endereço de quem não vai receber seria coleta sem
      // finalidade (§12.1).
      telefone: '', rendaMensalCentavos: 0,
      endereco: { cep: '', logradouro: '', numero: '', bairro: '' },
      mascara: String(dados.get('mascara') ?? '').trim().toLowerCase(),
      nomeExibicao: String(dados.get('nomeExibicao') ?? ''),
      meio: meio as MeioPagamento,
      aceitouContrato: dados.get('aceite') === 'on',
      ip,
    });
    referencia = r.referencia;
    responsavelId = r.professorId;
  } catch (err) {
    return { erro: (err as Error).message };
  }

  const { token, expiraEm } = await criarSessao(responsavelId);
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/', expires: expiraEm, maxAge: DURACAO_SESSAO_DIAS * 86_400,
  });

  redirect(`/empresas/pagamento/${referencia}`);
}
