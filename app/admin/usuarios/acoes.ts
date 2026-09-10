'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirPermissao } from '../../../lib/sessao.ts';
import { pode, type Permissao } from '../../../lib/permissoes.ts';
import {
  criarUsuario, editarUsuario, definirSenhaProvisoria, mudarStatusConta, derrubarSessoes,
  definirPapel, type TipoDeCadastro, type StatusConta,
} from '../../../lib/admin-usuarios.ts';
import { concederLicenca, estenderLicenca, mudarStatusLicenca } from '../../../lib/admin.ts';
import { registrarContratoProfessor } from '../../../lib/professor-catalogo.ts';
import { aprovarApuracao, registrarRepasse, pagarRepasse, buscarApuracao } from '../../../lib/apuracao.ts';
import type { EstadoAdmin } from '../acoes.ts';

/**
 * As ações do cadastro de usuários. Cada uma reconfere a permissão no
 * servidor (lib/permissoes.ts) — a tela esconder o formulário é conforto,
 * não trava.
 */
async function guarda(permissao: Permissao) {
  const u = await exigirPermissao(permissao);
  if (!u) throw new Error('acesso negado');
  return u;
}

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? '').trim();
const numero = (d: FormData, campo: string) => {
  const n = Number(d.get(campo));
  return Number.isInteger(n) ? n : NaN;
};

const TIPOS: TipoDeCadastro[] = ['equipe', 'aluno', 'professor', 'gestor'];

export async function acaoCriarUsuario(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('cadastros.agir'); } catch { return { erro: 'Acesso negado.' }; }

  const tipo = texto(dados, 'tipo') as TipoDeCadastro;
  if (!TIPOS.includes(tipo)) return { erro: 'Escolha o que está sendo criado.' };
  // Criar equipe é do admin: ninguém se dá um colega de retaguarda.
  if (tipo === 'equipe' && !pode(u.papel, 'equipe.agir')) {
    return { erro: 'Só a administração cria contas da equipe.' };
  }

  const portalId = tipo === 'equipe' || tipo === 'professor' ? 0 : numero(dados, 'portalId');
  const setorBruto = texto(dados, 'setorId');

  let criado;
  try {
    criado = await criarUsuario(u.email, {
      tipo,
      nome: texto(dados, 'nome'),
      email: texto(dados, 'email'),
      senha: String(dados.get('senha') ?? ''),
      portalId,
      papel: texto(dados, 'papel') || undefined,
      cpf: texto(dados, 'cpf') || undefined,
      setorId: setorBruto ? Number(setorBruto) : null,
      matricula: texto(dados, 'matricula'),
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/admin/usuarios');
  revalidatePath('/admin/alunos');
  redirect(`/admin/usuarios/${criado.id}?criado=${criado.ligadoAExistente ? 'ligado' : '1'}`);
}

export async function acaoEditarUsuario(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('cadastros.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const id = numero(dados, 'id');
  try {
    await editarUsuario(u.email, id, {
      nome: texto(dados, 'nome'), email: texto(dados, 'email'),
      cpf: texto(dados, 'cpf'), nascimento: texto(dados, 'nascimento'),
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath(`/admin/usuarios/${id}`);
  revalidatePath('/admin/usuarios');
  return { ok: 'Dados salvos.' };
}

export async function acaoSenhaProvisoria(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('cadastros.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const id = numero(dados, 'id');
  const senha = String(dados.get('senha') ?? '');
  try {
    await definirSenhaProvisoria(u.email, id, senha);
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath(`/admin/usuarios/${id}`);
  return {
    ok: `Senha provisória definida: ${senha} — passe por um canal seguro e peça a troca no `
      + 'primeiro acesso. As sessões abertas foram encerradas.',
  };
}

export async function acaoStatusConta(dados: FormData) {
  const u = await guarda('cadastros.agir');
  const id = numero(dados, 'id');
  await mudarStatusConta(u.email, id, texto(dados, 'status') as StatusConta);
  revalidatePath(`/admin/usuarios/${id}`);
  revalidatePath('/admin/usuarios');
}

export async function acaoDerrubarSessoes(dados: FormData) {
  const u = await guarda('cadastros.agir');
  const id = numero(dados, 'id');
  await derrubarSessoes(u.email, id);
  revalidatePath(`/admin/usuarios/${id}`);
}

export async function acaoDefinirPapel(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('equipe.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const id = numero(dados, 'id');
  try {
    await definirPapel(u.email, id, texto(dados, 'papel') as 'admin' | 'financeiro' | 'suporte' | 'aluno');
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath(`/admin/usuarios/${id}`);
  revalidatePath('/admin/usuarios');
  return { ok: 'Papel atualizado. A pessoa precisa entrar de novo.' };
}

// ---- professor do catálogo (db/046): contrato e apurações ----

export async function acaoContratoProfessor(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('financeiro.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const id = numero(dados, 'id');
  try {
    await registrarContratoProfessor(u.email, id, {
      comissaoPp: Number(String(dados.get('comissaoPp') ?? '').replace(',', '.')),
      vigenteDe: texto(dados, 'vigenteDe'),
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: 'Contrato registrado.' };
}

async function revalidarFichaDaApuracao(apuracaoId: number) {
  const a = await buscarApuracao(apuracaoId);
  if (a?.professorId) revalidatePath(`/admin/usuarios/${a.professorId}`);
  revalidatePath('/admin/financeiro');
}

export async function acaoAprovarApuracaoFicha(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('financeiro.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const apuracaoId = numero(dados, 'apuracaoId');
  try {
    await aprovarApuracao(u.email, apuracaoId, texto(dados, 'resposta'));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  await revalidarFichaDaApuracao(apuracaoId);
  return { ok: 'Apuração aprovada. O professor pode emitir a nota.' };
}

export async function acaoRegistrarRepasseFicha(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('financeiro.agir'); } catch { return { erro: 'Acesso negado.' }; }
  const apuracaoId = numero(dados, 'apuracaoId');
  try {
    await registrarRepasse(u.email, apuracaoId, texto(dados, 'comprovante'));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  await revalidarFichaDaApuracao(apuracaoId);
  return { ok: 'Repasse registrado. Apuração paga.' };
}

/** Professor do catálogo não tem subconta: o gateway sempre recusa, e a mensagem diz o caminho. */
export async function acaoPagarRepasseFicha(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('financeiro.agir'); } catch { return { erro: 'Acesso negado.' }; }
  try {
    const r = await pagarRepasse(u.email, numero(dados, 'apuracaoId'));
    await revalidarFichaDaApuracao(numero(dados, 'apuracaoId'));
    return { ok: `Transferência enviada (${r.comprovante}).` };
  } catch (err) {
    return { erro: (err as Error).message };
  }
}

// ---- licenças, a partir da ficha ----

export async function acaoConcederNaFicha(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let u;
  try { u = await guarda('licencas.conceder'); } catch { return { erro: 'Acesso negado.' }; }
  const id = numero(dados, 'id');
  const materiaBruta = texto(dados, 'materiaId');
  const materiaId = materiaBruta === 'catalogo' ? null : Number(materiaBruta);
  const dias = numero(dados, 'dias');
  if (materiaId !== null && !Number.isInteger(materiaId)) return { erro: 'Matéria inválida.' };
  if (!Number.isInteger(dias) || dias < 1) return { erro: 'Informe quantos dias.' };
  try {
    await concederLicenca(u.email, id, materiaId, dias);
  } catch (err) {
    return { erro: 'Não foi possível conceder: ' + (err as Error).message };
  }
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: `Cortesia de ${dias} dias concedida.` };
}

export async function acaoEstenderNaFicha(dados: FormData) {
  const u = await guarda('licencas.suporte');
  const id = numero(dados, 'id');
  await estenderLicenca(u.email, numero(dados, 'licencaId'), Number(dados.get('dias') ?? 30));
  revalidatePath(`/admin/usuarios/${id}`);
}

export async function acaoStatusLicencaNaFicha(dados: FormData) {
  const u = await guarda('licencas.suporte');
  const id = numero(dados, 'id');
  const status = texto(dados, 'status') as 'ATIVA' | 'SUSPENSA' | 'CANCELADA';
  if (!['ATIVA', 'SUSPENSA', 'CANCELADA'].includes(status)) throw new Error('situação inválida');
  await mudarStatusLicenca(u.email, numero(dados, 'licencaId'), status);
  revalidatePath(`/admin/usuarios/${id}`);
}
