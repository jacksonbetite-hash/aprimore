'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { exigirPermissao } from '../../../lib/sessao.ts';
import type { Permissao } from '../../../lib/permissoes.ts';
import {
  criarPortal, editarPortal, mudarStatusPortal, salvarPlano, criarProfessor,
  registrarContrato, registrarAceite,
  type DadosPortal, type DadosPlano, type DadosContrato, type Personalizacao,
} from '../../../lib/admin-portais.ts';
import type { StatusPortal } from '../../../lib/portal.ts';
import type { EstadoAdmin } from '../acoes.ts';
import {
  fecharFatura, medirArmazenamento, suspenderInadimplentes,
} from '../../../lib/portal-financeiro.ts';
import { concederLicenca } from '../../../lib/admin.ts';
import { brl } from '../../../lib/precos.ts';
import { apurarComissao, aprovarApuracao, registrarRepasse, pagarRepasse } from '../../../lib/apuracao.ts';
import { lerFerramentas } from '../../../lib/ferramentas.ts';

// ---------- Apuração da comissão de vitrine (§5.6.1) ----------

export async function acaoApurar(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await admin('financeiro.agir');
  const portalId = numero(dados.get('portalId'));
  const mes = String(dados.get('mes') ?? '');
  const competencia = /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : mes;
  try {
    const r = await apurarComissao(u.email, portalId, competencia);
    revalidatePath(`/admin/portais/${portalId}/financeiro`);
    return { ok: `Competência apurada: ${r.vendas} venda(s), ${r.reembolsos} reembolso(s), comissão ${brl(r.centavosComissao)} — ${r.status.toLowerCase().replace('_', ' ')}.` };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}

export async function acaoAprovarApuracao(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await admin('financeiro.agir');
  const portalId = numero(dados.get('portalId'));
  try {
    await aprovarApuracao(u.email, numero(dados.get('apuracaoId')), String(dados.get('resposta') ?? ''));
    revalidatePath(`/admin/portais/${portalId}/financeiro`);
    return { ok: 'Apuração aprovada. O professor pode emitir a nota.' };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}

export async function acaoRegistrarRepasse(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await admin('financeiro.agir');
  const portalId = numero(dados.get('portalId'));
  try {
    await registrarRepasse(u.email, numero(dados.get('apuracaoId')), String(dados.get('comprovante') ?? ''));
    revalidatePath(`/admin/portais/${portalId}/financeiro`);
    return { ok: 'Repasse registrado. Apuração paga.' };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}

export async function acaoPagarRepasse(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await admin('financeiro.agir');
  const portalId = numero(dados.get('portalId'));
  try {
    const r = await pagarRepasse(u.email, numero(dados.get('apuracaoId')));
    revalidatePath(`/admin/portais/${portalId}/financeiro`);
    return { ok: `Transferência enviada (${r.comprovante}). Apuração paga.` };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}

async function admin(permissao: Permissao) {
  const u = await exigirPermissao(permissao);
  if (!u) throw new Error('acesso negado');
  return u;
}

const numero = (v: FormDataEntryValue | null, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
};

/** "149,90" → 14990. Ninguém digita centavos na retaguarda. */
const centavos = (v: FormDataEntryValue | null) => {
  const reais = Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(reais) || reais < 0) throw new Error('valor inválido');
  return Math.round(reais * 100);
};

const STATUS: StatusPortal[] = ['RASCUNHO', 'ATIVO', 'SUSPENSO', 'ENCERRADO'];

// ---------- Professores ----------

export async function acaoCriarProfessor(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('cadastros.agir'); } catch { return { erro: 'Acesso negado.' }; }
  try {
    await criarProfessor(u.email, String(dados.get('nome') ?? ''),
      String(dados.get('email') ?? ''), String(dados.get('senha') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/portais');
  return {
    ok: 'Professor cadastrado. Entregue a senha por um canal seguro e peça que ele a troque.',
  };
}

// ---------- Planos ----------

function lerPlano(dados: FormData): DadosPlano {
  return {
    nome: String(dados.get('nome') ?? ''),
    licencaMensalCentavos: centavos(dados.get('licencaMensal')),
    percentualBase: numero(dados.get('percentualBase')),
    acrescimoIndicacaoPp: numero(dados.get('acrescimoIndicacaoPp'), 5),
    gbArmazenamento: Math.trunc(numero(dados.get('gbArmazenamento'))),
    gbBandaMes: Math.trunc(numero(dados.get('gbBandaMes'))),
    centavosPorGbExcedente: centavos(dados.get('porGbExcedente')),
    // vazio = o plano não oferece domínio próprio (Fase 2)
    centavosDominioProprio: String(dados.get('dominioProprio') ?? '').trim()
      ? centavos(dados.get('dominioProprio')) : null,
    ativo: dados.get('ativo') === 'on',
  };
}

export async function acaoSalvarPlano(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('financeiro.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const bruto = String(dados.get('id') ?? '');
  try {
    await salvarPlano(u.email, bruto ? Number(bruto) : null, lerPlano(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/portais');
  return {
    ok: bruto
      ? 'Plano atualizado. Contrato já assinado não muda — ele copiou os números no aceite.'
      : 'Plano criado.',
  };
}

// ---------- Portais ----------

function lerPortal(dados: FormData): DadosPortal {
  return {
    mascara: String(dados.get('mascara') ?? ''),
    nomeExibicao: String(dados.get('nomeExibicao') ?? ''),
    professorId: Number(dados.get('professorId')),
    planoId: Number(dados.get('planoId')),
    responsavelNome: String(dados.get('responsavelNome') ?? ''),
    responsavelDoc: String(dados.get('responsavelDoc') ?? ''),
    responsavelEmail: String(dados.get('responsavelEmail') ?? ''),
  };
}

export async function acaoCriarPortal(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('cadastros.agir'); } catch { return { erro: 'Acesso negado.' }; }
  let id: number;
  try {
    id = await criarPortal(u.email, lerPortal(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/portais');
  redirect(`/admin/portais/${id}?criado=1`);
}

export async function acaoEditarPortal(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('cadastros.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const id = Number(dados.get('id'));
  try {
    await editarPortal(u.email, id, {
      ...lerPortal(dados),
      dominioProprio: String(dados.get('dominioProprio') ?? ''),
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/portais');
  revalidatePath(`/admin/portais/${id}`);
  return { ok: 'Portal salvo.' };
}

/** A página única do §5.10: as seções fixas que o professor preenche. */
export async function acaoEditarSite(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('cadastros.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const id = Number(dados.get('id'));
  const personalizacao: Personalizacao = {
    chamada: String(dados.get('chamada') ?? '').trim(),
    proposito: String(dados.get('proposito') ?? '').trim(),
    sobre: String(dados.get('sobre') ?? '').trim(),
    contato: String(dados.get('contato') ?? '').trim(),
    corPrimaria: String(dados.get('corPrimaria') ?? '').trim(),
    foto: String(dados.get('foto') ?? '').trim(),
    ferramentas: lerFerramentas(dados.getAll('ferramentas').map(String)),
  };
  try {
    await editarPortal(u.email, id, { personalizacao });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath(`/admin/portais/${id}`);
  return { ok: 'Página do portal salva.' };
}

export async function acaoStatusPortal(dados: FormData) {
  const u = await admin('cadastros.agir');
  const id = Number(dados.get('id'));
  const status = String(dados.get('status') ?? '') as StatusPortal;
  if (!STATUS.includes(status)) throw new Error('situação inválida');
  await mudarStatusPortal(u.email, id, status);
  revalidatePath('/admin/portais');
  revalidatePath(`/admin/portais/${id}`);
}

// ---------- Contrato ----------

function lerContrato(dados: FormData): DadosContrato {
  return {
    planoId: Number(dados.get('planoId')),
    licencaMensalCentavos: centavos(dados.get('licencaMensal')),
    percentualBase: numero(dados.get('percentualBase')),
    acrescimoIndicacaoPp: numero(dados.get('acrescimoIndicacaoPp'), 5),
    validadeCliqueDias: Math.trunc(numero(dados.get('validadeCliqueDias'), 90)),
    diasRetencao: Math.trunc(numero(dados.get('diasRetencao'), 30)),
    percentualReserva: numero(dados.get('percentualReserva')),
    vigenteDe: String(dados.get('vigenteDe') ?? ''),
  };
}

export async function acaoRegistrarContrato(
  _e: EstadoAdmin, dados: FormData,
): Promise<EstadoAdmin> {
  let u;
  try { u = await admin('financeiro.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const portalId = Number(dados.get('portalId'));
  try {
    await registrarContrato(u.email, portalId, lerContrato(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath(`/admin/portais/${portalId}`);
  return { ok: 'Contrato registrado. Falta o aceite do professor para o portal poder ir ao ar.' };
}

/**
 * Registro do aceite. O IP vem do cabeçalho da requisição porque é ele
 * que sustenta a declaração de titularidade do conteúdo (§5.10) — e
 * porque um aceite sem origem registrada não prova nada.
 */
export async function acaoRegistrarAceite(dados: FormData) {
  const u = await admin('financeiro.agir');
  const portalId = Number(dados.get('portalId'));
  const cabecalhos = await headers();
  const ip = (cabecalhos.get('x-forwarded-for') ?? '').split(',')[0].trim()
    || cabecalhos.get('x-real-ip') || '';
  await registrarAceite(u.email, Number(dados.get('contratoId')), ip);
  revalidatePath('/admin/portais');
  revalidatePath(`/admin/portais/${portalId}`);
}

// ---------- Financeiro e alunos (§5.10.2, etapa 4) ----------

/** Fecha a competência do portal: licença + excedente + ajuste opcional. */
export async function acaoFecharFatura(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await admin('financeiro.agir');
  const portalId = numero(dados.get('portalId'));
  const competencia = String(dados.get('competencia') ?? '');
  const motivo = String(dados.get('ajusteMotivo') ?? '').trim();
  const valor = String(dados.get('ajusteValor') ?? '').trim();
  const ajustes = valor
    ? [{ centavos: Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100), motivo }]
    : [];
  try {
    const r = await fecharFatura(u.email, portalId, competencia, ajustes);
    revalidatePath(`/admin/portais/${portalId}/financeiro`);
    return {
      ok: r.referencia
        ? `Fatura ${r.referencia} fechada: ${brl(r.centavosTotal)}. Em desenvolvimento, confirme com npm run confirmar-pagamento ${r.referencia}.`
        : `Competência fechada sem cobrança (total ${brl(r.centavosTotal)}).`,
    };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}

/** Mede o que o portal ocupa em disco agora. */
export async function acaoMedirConsumo(dados: FormData) {
  await admin('financeiro.agir');
  const portalId = numero(dados.get('portalId'));
  await medirArmazenamento(portalId);
  revalidatePath(`/admin/portais/${portalId}/financeiro`);
}

/** Régua de inadimplência de todos os portais (§5.10). */
export async function acaoReguaInadimplencia() {
  const u = await admin('financeiro.agir');
  await suspenderInadimplentes(u.email);
  revalidatePath('/admin/portais');
}

/** Cortesia a um aluno DO PORTAL — o admin dá suporte; a base é do professor. */
export async function acaoCortesiaPortal(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  const u = await admin('licencas.conceder');
  const portalId = numero(dados.get('portalId'));
  const materiaBruta = String(dados.get('materiaId') ?? '');
  try {
    await concederLicenca(
      u.email, numero(dados.get('usuarioId')),
      materiaBruta === '' ? null : Number(materiaBruta),
      numero(dados.get('dias'), 30), 'CORTESIA',
    );
    revalidatePath(`/admin/portais/${portalId}/alunos`);
    return { ok: 'Cortesia concedida.' };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}
