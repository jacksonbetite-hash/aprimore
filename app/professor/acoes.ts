'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalDoProfessor } from '../../lib/professor.ts';
import { editarPortal } from '../../lib/admin-portais.ts';
import { medirArmazenamento } from '../../lib/portal-financeiro.ts';
import {
  salvarArea, excluirArea, criarMateria, editarMateria, mudarStatusMateria,
  salvarAssunto, excluirAssunto, criarAula, editarAula, mudarStatusAula,
  salvarQuestao, excluirQuestao,
} from '../../lib/admin-cursos.ts';
import { lerMateria, lerAula, lerQuestao, situacao, numero } from '../../lib/admin-cursos-form.ts';
import { contestarApuracao, informarNota } from '../../lib/apuracao.ts';
import { definirDominio, verificarDominio } from '../../lib/portal-dominio.ts';
import { lerFerramentas } from '../../lib/ferramentas.ts';
import { removerVideoDaAula } from '../../lib/video-aula.ts';
import type { EstadoAdmin } from '../admin/acoes.ts';

// ---------- Apuração da comissão de vitrine (§5.6.1) ----------

export async function acaoContestar(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await contestarApuracao(d.portal.id, numero(dados.get('apuracaoId')), String(dados.get('texto') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/professor/financeiro');
  return { ok: 'Contestação registrada. A plataforma responde e aprova em seguida.' };
}

export async function acaoInformarNota(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await informarNota(d.portal.id, numero(dados.get('apuracaoId')), String(dados.get('numero') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/professor/financeiro');
  return { ok: 'Nota registrada. O repasse sai depois da conferência do comprovante.' };
}

/**
 * Ações do painel do professor (§5.10). Mesmas funções de biblioteca da
 * retaguarda, com UMA diferença que é o coração da segurança: o portal
 * nunca vem do formulário. Vem da sessão — o professor só alcança o
 * portal que é dele. O `portalId` que os formulários mandam é ignorado.
 */
async function dono() {
  const u = await alunoAtual();
  if (!u || (u.papel !== 'professor' && u.papel !== 'admin')) throw new Error('acesso negado');
  const portal = await portalDoProfessor(u.id);
  if (!portal) throw new Error('você ainda não tem um portal');
  return { u, portal };
}

function revalidarPortal(portalId: number) {
  revalidatePath('/professor', 'layout');
  // O acervo público do portal é servido pelo cache do catálogo (tag única).
  revalidatePath('/');
  revalidatePath('/catalogo');
  void portalId;
}

// ---------- Site ----------

export async function acaoSalvarSite(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await editarPortal(d.u.email, d.portal.id, {
      personalizacao: {
        chamada: String(dados.get('chamada') ?? '').trim(),
        proposito: String(dados.get('proposito') ?? '').trim(),
        sobre: String(dados.get('sobre') ?? '').trim(),
        contato: String(dados.get('contato') ?? '').trim(),
        corPrimaria: String(dados.get('corPrimaria') ?? '').trim(),
        foto: String(dados.get('foto') ?? '').trim(),
        ferramentas: lerFerramentas(dados.getAll('ferramentas').map(String)),
      },
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  return { ok: 'Página salva. Abra o seu portal para ver.' };
}

// ---------- Domínio próprio (Fase 2) ----------

export async function acaoDefinirDominio(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  let dominio: string | null;
  try {
    dominio = await definirDominio(d.u.email, d.portal.id, String(dados.get('dominio') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/professor/site');
  return { ok: dominio ? `Domínio salvo. Agora aponte o CNAME e verifique.` : 'Domínio removido.' };
}

export async function acaoVerificarDominio(_e: EstadoAdmin): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  let r;
  try {
    r = await verificarDominio(d.u.email, d.portal.id);
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/professor/site');
  if (r.ok) return { ok: `${r.dominio} verificado: o seu portal já responde nele.` };
  return {
    erro: r.alvos.length
      ? `O CNAME de ${r.dominio} aponta para ${r.alvos.join(', ')} — precisa apontar para ${r.esperado}.`
      : `Ainda não há CNAME para ${r.dominio}. Confira o registro e tente de novo em alguns minutos.`,
  };
}

export async function acaoMedirMeuConsumo() {
  const d = await dono();
  await medirArmazenamento(d.portal.id);
  revalidatePath('/professor/financeiro');
}

// ---------- Áreas ----------

export async function acaoSalvarArea(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  const bruto = String(dados.get('id') ?? '');
  try {
    await salvarArea(d.u.email, d.portal.id, bruto ? Number(bruto) : null,
      String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  return { ok: bruto ? 'Área atualizada.' : 'Área criada.' };
}

export async function acaoEditarAreaLinha(dados: FormData) {
  const d = await dono();
  await salvarArea(d.u.email, d.portal.id, Number(dados.get('id')),
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidarPortal(d.portal.id);
}

export async function acaoExcluirArea(dados: FormData) {
  const d = await dono();
  await excluirArea(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidarPortal(d.portal.id);
}

// ---------- Cursos ----------

export async function acaoCriarMateria(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  let id: number;
  try {
    ({ id } = await criarMateria(d.u.email, d.portal.id, lerMateria(dados)));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  redirect(`/professor/cursos/${id}?criada=1`);
}

export async function acaoEditarMateria(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  const id = Number(dados.get('id'));
  try {
    await editarMateria(d.u.email, d.portal.id, id, lerMateria(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  return { ok: 'Curso salvo.' };
}

export async function acaoStatusMateria(dados: FormData) {
  const d = await dono();
  await mudarStatusMateria(d.u.email, d.portal.id, Number(dados.get('id')), situacao(dados.get('status')));
  revalidarPortal(d.portal.id);
}

// ---------- Assuntos ----------

export async function acaoSalvarAssunto(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  const materiaId = Number(dados.get('materiaId'));
  const bruto = String(dados.get('id') ?? '');
  try {
    await salvarAssunto(d.u.email, d.portal.id, materiaId, bruto ? Number(bruto) : null,
      String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  return { ok: bruto ? 'Assunto atualizado.' : 'Assunto criado.' };
}

export async function acaoEditarAssuntoLinha(dados: FormData) {
  const d = await dono();
  await salvarAssunto(d.u.email, d.portal.id, Number(dados.get('materiaId')), Number(dados.get('id')),
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidarPortal(d.portal.id);
}

export async function acaoExcluirAssunto(dados: FormData) {
  const d = await dono();
  await excluirAssunto(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidarPortal(d.portal.id);
}

// ---------- Aulas ----------

export async function acaoCriarAula(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  let id: number;
  try {
    ({ id } = await criarAula(d.u.email, d.portal.id, lerAula(dados)));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  redirect(`/professor/cursos/aula/${id}?criada=1`);
}

export async function acaoEditarAula(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await editarAula(d.u.email, d.portal.id, Number(dados.get('id')), lerAula(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  return { ok: 'Aula salva.' };
}

export async function acaoStatusAula(dados: FormData) {
  const d = await dono();
  await mudarStatusAula(d.u.email, d.portal.id, Number(dados.get('id')), situacao(dados.get('status')));
  revalidarPortal(d.portal.id);
}

// ---------- Vídeo da aula ----------

/**
 * Tira o vídeo da aula (§5.10 — o professor é dono do próprio acervo:
 * anexa, troca e também retira). Enviar outro arquivo continua sendo o
 * caminho da TROCA; esta ação é a de deixar a aula sem gravação, e ela
 * libera a cota de armazenamento na mesma hora.
 */
export async function acaoRemoverVideo(dados: FormData) {
  const d = await dono();
  await removerVideoDaAula(d.u.email, d.portal.id, Number(dados.get('aulaId')));
  // Armazenamento é foto, não soma: com um arquivo a menos, a medição
  // precisa ser refeita, senão a fatura cobra espaço que já não existe.
  void medirArmazenamento(d.portal.id).catch(() => {});
  revalidarPortal(d.portal.id);
  revalidatePath('/professor/videos');
}

// ---------- Questões ----------

export async function acaoSalvarQuestao(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await dono(); } catch (err) { return { erro: (err as Error).message }; }
  const aulaId = Number(dados.get('aulaId'));
  const bruto = String(dados.get('id') ?? '');
  try {
    await salvarQuestao(d.u.email, d.portal.id, aulaId, bruto ? Number(bruto) : null, lerQuestao(dados));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidarPortal(d.portal.id);
  return { ok: bruto ? 'Questão salva.' : 'Questão criada.' };
}

export async function acaoExcluirQuestao(dados: FormData) {
  const d = await dono();
  await excluirQuestao(d.u.email, d.portal.id, Number(dados.get('aulaId')), Number(dados.get('id')));
  revalidarPortal(d.portal.id);
}
