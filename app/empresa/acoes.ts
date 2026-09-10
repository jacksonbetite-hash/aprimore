'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { alunoAtual } from '../../lib/sessao.ts';
import { gerarHashSenha, validarSenha, validarEmail } from '../../lib/auth.ts';
import { editarPortal } from '../../lib/admin-portais.ts';
import {
  comprarVagas, pedirOrcamento, aceitarOrcamento, cancelarOrcamento, distribuirVaga, devolverVaga,
} from '../../lib/empresa-catalogo.ts';
import { definirDominio, verificarDominio } from '../../lib/portal-dominio.ts';
import {
  portalDaEmpresa, adicionarGestor, removerGestor, definirDominiosEmail,
} from '../../lib/empresa.ts';
import {
  salvarArea, excluirArea, criarMateria, editarMateria, mudarStatusMateria,
  salvarAssunto, excluirAssunto, criarAula, editarAula, mudarStatusAula,
  salvarQuestaoDe, excluirQuestaoDe,
} from '../../lib/admin-cursos.ts';
import { lerMateria, lerAula, lerQuestao, situacao, numero } from '../../lib/admin-cursos-form.ts';
import { salvarAvaliacao } from '../../lib/avaliacao.ts';
import {
  salvarSetor, excluirSetor, cadastrarColaborador, editarColaborador,
  desativarColaborador, reativarColaborador, atribuirTrilha, removerAtribuicao,
  criarConvite, cancelarConvite, importarConvites, type LinhaImportada,
} from '../../lib/empresa-equipe.ts';
import { medirArmazenamento } from '../../lib/portal-financeiro.ts';
import { enderecoDoPortal } from '../../lib/portal-consultas.ts';
import { unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { pertenceAoPortal } from '../../lib/upload.ts';
import {
  salvarItem, lerItem, mudarStatus, excluirItem, registrarBytes, partirAssuntos,
  validarItem, type RascunhoItem,
} from '../../lib/acervo.ts';
import type { EstadoAdmin } from '../admin/acoes.ts';

/**
 * Ações do painel da empresa (§5.11).
 *
 * A garantia que sustenta tudo é a mesma do painel do professor: o
 * PORTAL VEM DA SESSÃO, nunca do formulário. Um `portalId` escondido num
 * campo seria o caminho mais curto para o RH de uma empresa editar a
 * página de outra — e o isolamento do §15.14 não serve de nada se a
 * aplicação escolher o tenant pelo que a rua mandou.
 *
 * `gestor()` acrescenta uma segunda pergunta que o professor não precisa
 * fazer: além de "qual portal é seu", há "o que você pode fazer nele".
 * Só o RESPONSAVEL mexe em quem administra.
 */
async function gestor() {
  const u = await alunoAtual();
  if (!u || (u.papel !== 'gestor' && u.papel !== 'admin')) throw new Error('acesso negado');
  const portal = await portalDaEmpresa(u.id);
  if (!portal) throw new Error('você ainda não administra uma empresa');
  return { u, portal };
}

async function responsavel() {
  const d = await gestor();
  if (d.portal.papelNoPortal !== 'RESPONSAVEL' && d.u.papel !== 'admin') {
    throw new Error('Só quem assinou o contrato pode mudar quem administra o portal.');
  }
  return d;
}

function revalidarPortal() {
  revalidatePath('/empresa', 'layout');
  // O acervo do portal é servido pelo cache do catálogo (tag única).
  revalidatePath('/');
  revalidatePath('/catalogo');
}

/** Executa e devolve `{erro}` em vez de derrubar a página. */
async function tentar<T>(fn: () => Promise<T>): Promise<{ valor?: T; erro?: string }> {
  try { return { valor: await fn() }; } catch (err) { return { erro: (err as Error).message }; }
}

// ---------------------------------------------------------------------
// Minha página
// ---------------------------------------------------------------------

export async function acaoSalvarPaginaEmpresa(
  _e: EstadoAdmin, dados: FormData,
): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  try {
    await editarPortal(d.u.email, d.portal.id, {
      personalizacao: {
        chamada: String(dados.get('chamada') ?? '').trim(),
        proposito: String(dados.get('proposito') ?? '').trim(),
        sobre: String(dados.get('sobre') ?? '').trim(),
        contato: String(dados.get('contato') ?? '').trim(),
        corPrimaria: String(dados.get('corPrimaria') ?? '').trim(),
        foto: String(dados.get('foto') ?? '').trim(),
      },
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/empresa', 'layout');
  revalidatePath('/');
  return { ok: 'Página salva. Abra o portal para ver como o colaborador vê.' };
}

export async function acaoSalvarDominiosEmail(
  _e: EstadoAdmin, dados: FormData,
): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  let dominios: string[];
  try {
    dominios = await definirDominiosEmail(
      d.u.email, d.portal.id, String(dados.get('dominios') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/empresa/site');
  return {
    ok: dominios.length === 0
      ? 'Autocadastro desligado: agora só entra quem receber convite.'
      : `Quem tiver e-mail em ${dominios.join(', ')} pode criar a conta sozinho.`,
  };
}

// ---------------------------------------------------------------------
// Domínio próprio — o mesmo mecanismo do professor (§5.10, Fase 2)
// ---------------------------------------------------------------------

export async function acaoDefinirDominioEmpresa(
  _e: EstadoAdmin, dados: FormData,
): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  let dominio: string | null;
  try {
    dominio = await definirDominio(d.u.email, d.portal.id, String(dados.get('dominio') ?? ''));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/empresa/site');
  return { ok: dominio ? 'Domínio salvo. Agora aponte o CNAME e verifique.' : 'Domínio removido.' };
}

export async function acaoVerificarDominioEmpresa(_e: EstadoAdmin): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  let r;
  try {
    r = await verificarDominio(d.u.email, d.portal.id);
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/empresa/site');
  if (r.ok) return { ok: `${r.dominio} verificado: o portal já responde nele.` };
  return {
    erro: r.alvos.length
      ? `O CNAME de ${r.dominio} aponta para ${r.alvos.join(', ')} — precisa apontar para ${r.esperado}.`
      : `Ainda não há CNAME para ${r.dominio}. Confira o registro e tente de novo em alguns minutos.`,
  };
}

// ---------------------------------------------------------------------
// Quem administra
// ---------------------------------------------------------------------

export async function acaoAdicionarGestor(
  _e: EstadoAdmin, dados: FormData,
): Promise<EstadoAdmin> {
  let d;
  try { d = await responsavel(); } catch (err) { return { erro: (err as Error).message }; }

  const nome = String(dados.get('nome') ?? '').trim();
  const email = String(dados.get('email') ?? '').trim();
  const senha = String(dados.get('senha') ?? '');
  if (nome.length < 2) return { erro: 'Diga o nome de quem vai administrar.' };
  const erroEmail = validarEmail(email);
  if (erroEmail) return { erro: erroEmail };
  const erroSenha = validarSenha(senha);
  if (erroSenha) return { erro: erroSenha };

  try {
    await adicionarGestor(d.u.email, d.portal.id, nome, email, await gerarHashSenha(senha));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidatePath('/empresa/gestores');
  return {
    ok: `${nome} já pode entrar em ${email}. Passe a senha por um canal seguro — `
      + 'e peça que ela troque no primeiro acesso.',
  };
}

export async function acaoRemoverGestor(dados: FormData) {
  const d = await responsavel();
  const usuarioId = Number(dados.get('usuarioId'));
  if (!Number.isInteger(usuarioId)) throw new Error('pedido inválido');
  await removerGestor(d.u.email, d.portal.id, usuarioId);
  revalidatePath('/empresa/gestores');
}

// ---------------------------------------------------------------------
// Trilhas — etapa 3: os mesmos formulários de área/curso/assunto/aula da
// retaguarda, com o portal vindo da sessão.
// ---------------------------------------------------------------------

export async function acaoSalvarArea(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const bruto = String(dados.get('id') ?? '');
  const r = await tentar(() => salvarArea(d.u.email, d.portal.id, bruto ? Number(bruto) : null,
    String(dados.get('nome') ?? ''), numero(dados.get('ordem'))));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  return { ok: bruto ? 'Área atualizada.' : 'Área criada.' };
}

export async function acaoEditarAreaLinha(dados: FormData) {
  const d = await gestor();
  await salvarArea(d.u.email, d.portal.id, Number(dados.get('id')),
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidarPortal();
}

export async function acaoExcluirArea(dados: FormData) {
  const d = await gestor();
  await excluirArea(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidarPortal();
}

export async function acaoCriarTrilha(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  // §5.11: trilha de empresa nunca vai à vitrine — o banco recusa, e aqui
  // nem tentamos: o campo é ignorado.
  const r = await tentar(() => criarMateria(d.u.email, d.portal.id,
    { ...lerMateria(dados), naVitrinePlataforma: false }));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  redirect(`/empresa/trilhas/${r.valor!.id}?criada=1`);
}

export async function acaoEditarTrilha(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => editarMateria(d.u.email, d.portal.id, Number(dados.get('id')),
    { ...lerMateria(dados), naVitrinePlataforma: false }));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  return { ok: 'Trilha salva.' };
}

export async function acaoStatusTrilha(dados: FormData) {
  const d = await gestor();
  await mudarStatusMateria(d.u.email, d.portal.id, Number(dados.get('id')), situacao(dados.get('status')));
  revalidarPortal();
}

export async function acaoSalvarModulo(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const bruto = String(dados.get('id') ?? '');
  const r = await tentar(() => salvarAssunto(d.u.email, d.portal.id, Number(dados.get('materiaId')),
    bruto ? Number(bruto) : null, String(dados.get('nome') ?? ''), numero(dados.get('ordem'))));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  return { ok: bruto ? 'Módulo atualizado.' : 'Módulo criado.' };
}

export async function acaoEditarModuloLinha(dados: FormData) {
  const d = await gestor();
  await salvarAssunto(d.u.email, d.portal.id, Number(dados.get('materiaId')), Number(dados.get('id')),
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidarPortal();
}

export async function acaoExcluirModulo(dados: FormData) {
  const d = await gestor();
  await excluirAssunto(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidarPortal();
}

export async function acaoCriarAula(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => criarAula(d.u.email, d.portal.id,
    { ...lerAula(dados), amostraGratuita: false, noTrial: false }));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  redirect(`/empresa/trilhas/aula/${r.valor!.id}?criada=1`);
}

export async function acaoEditarAula(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => editarAula(d.u.email, d.portal.id, Number(dados.get('id')),
    { ...lerAula(dados), amostraGratuita: false, noTrial: false }));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  return { ok: 'Aula salva.' };
}

export async function acaoStatusAula(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const status = situacao(dados.get('status'));
  const r = await tentar(() => mudarStatusAula(d.u.email, d.portal.id, Number(dados.get('id')), status));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  return { ok: status === 'publicado' ? 'Aula publicada.' : 'Aula despublicada.' };
}

export async function acaoSalvarQuestao(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const bruto = String(dados.get('id') ?? '');
  const avaliacaoId = Number(dados.get('avaliacaoId'));
  const dono = avaliacaoId ? { avaliacaoId } : { aulaId: Number(dados.get('aulaId')) };
  const r = await tentar(() => salvarQuestaoDe(d.u.email, d.portal.id, dono,
    bruto ? Number(bruto) : null, lerQuestao(dados)));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  return { ok: bruto ? 'Questão salva.' : 'Questão criada.' };
}

export async function acaoExcluirQuestao(dados: FormData) {
  const d = await gestor();
  const avaliacaoId = Number(dados.get('avaliacaoId'));
  const dono = avaliacaoId ? { avaliacaoId } : { aulaId: Number(dados.get('aulaId')) };
  await excluirQuestaoDe(d.u.email, d.portal.id, dono, Number(dados.get('id')));
  revalidarPortal();
}

export async function acaoSalvarAvaliacao(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const tentativas = String(dados.get('maxTentativas') ?? '').trim();
  const r = await tentar(() => salvarAvaliacao(d.u.email, d.portal.id, Number(dados.get('materiaId')), {
    titulo: String(dados.get('titulo') ?? ''),
    descricao: String(dados.get('descricao') ?? ''),
    notaMinima: numero(dados.get('notaMinima'), 70),
    maxTentativas: tentativas ? Number(tentativas) : null,
    embaralhar: dados.get('embaralhar') === 'on',
    status: situacao(dados.get('status')),
  }));
  if (r.erro) return { erro: r.erro };
  revalidarPortal();
  return { ok: 'Avaliação salva. As questões ficam logo abaixo.' };
}

export async function acaoMedirMeuConsumo() {
  const d = await gestor();
  await medirArmazenamento(d.portal.id);
  revalidatePath('/empresa/financeiro');
}

// ---------------------------------------------------------------------
// Equipe — etapa 4
// ---------------------------------------------------------------------

/** O estado das ações de equipe: além de ok/erro, o link do convite ou o resultado da importação. */
export interface EstadoEquipe extends EstadoAdmin {
  link?: string;
  linhas?: LinhaImportada[];
  /** Base do endereço do portal, para montar o link das linhas importadas. */
  endereco?: string;
}

const setorDoForm = (dados: FormData) => {
  const s = String(dados.get('setorId') ?? '').trim();
  return s ? Number(s) : null;
};

export async function acaoSalvarSetor(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const bruto = String(dados.get('id') ?? '');
  const r = await tentar(() => salvarSetor(d.u.email, d.portal.id, bruto ? Number(bruto) : null,
    String(dados.get('nome') ?? ''), numero(dados.get('ordem'))));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa', 'layout');
  return { ok: bruto ? 'Setor atualizado.' : 'Setor criado.' };
}

export async function acaoEditarSetorLinha(dados: FormData) {
  const d = await gestor();
  await salvarSetor(d.u.email, d.portal.id, Number(dados.get('id')),
    String(dados.get('nome') ?? ''), numero(dados.get('ordem')));
  revalidatePath('/empresa', 'layout');
}

export async function acaoExcluirSetor(dados: FormData) {
  const d = await gestor();
  await excluirSetor(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidatePath('/empresa', 'layout');
}

export async function acaoCadastrarColaborador(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const email = String(dados.get('email') ?? '').trim();
  const senha = String(dados.get('senha') ?? '');
  const erroEmail = validarEmail(email);
  if (erroEmail) return { erro: erroEmail };
  const erroSenha = validarSenha(senha);
  if (erroSenha) return { erro: erroSenha };
  const r = await tentar(async () => cadastrarColaborador(d.u.email, d.portal.id, {
    nome: String(dados.get('nome') ?? ''), email,
    setorId: setorDoForm(dados), matricula: String(dados.get('matricula') ?? ''),
  }, await gerarHashSenha(senha)));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa', 'layout');
  const t = r.valor!.trilhas;
  const trilhas = t ? ` — e já recebeu ${t === 1 ? '1 trilha' : `${t} trilhas`} do setor.` : '.';
  // Credencial global (db/045): quem já tinha conta entra com a senha de
  // sempre; a provisória digitada aqui não valeu, e o RH precisa saber.
  return {
    ok: r.valor!.ligadoAExistente
      ? `${email} já tinha conta na plataforma: entra neste portal com a senha que já usa `
        + `(a provisória informada foi ignorada)${trilhas}`
      : `${email} já pode entrar no portal com a senha provisória${trilhas}`,
  };
}

export async function acaoEditarColaborador(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => editarColaborador(d.u.email, d.portal.id, Number(dados.get('id')), {
    nome: String(dados.get('nome') ?? ''), setorId: setorDoForm(dados),
    matricula: String(dados.get('matricula') ?? ''),
  }));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa', 'layout');
  return { ok: 'Dados salvos.' };
}

export async function acaoDesativarColaborador(dados: FormData) {
  const d = await gestor();
  await desativarColaborador(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidatePath('/empresa', 'layout');
}

export async function acaoReativarColaborador(dados: FormData) {
  const d = await gestor();
  await reativarColaborador(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidatePath('/empresa', 'layout');
}

export async function acaoAtribuir(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const alvo = String(dados.get('alvo') ?? '');           // "u:12" ou "s:3"
  const [tipo, idBruto] = alvo.split(':');
  const id = Number(idBruto);
  const r = await tentar(() => atribuirTrilha(d.u.email, d.portal.id, {
    materiaId: Number(dados.get('materiaId')),
    usuarioId: tipo === 'u' && id ? id : null,
    setorId: tipo === 's' && id ? id : null,
    obrigatoria: dados.get('obrigatoria') === 'on',
    prazoEm: String(dados.get('prazoEm') ?? ''),
  }));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa', 'layout');
  const { pessoas, trilhaPublicada } = r.valor!;
  return {
    ok: `Trilha liberada para ${pessoas === 1 ? '1 pessoa' : `${pessoas} pessoas`}.`
      + (trilhaPublicada ? '' : ' Atenção: a trilha ainda está em rascunho — ninguém a vê até você publicá-la.')
      + (pessoas === 0 ? ' Quem entrar no setor depois recebe automaticamente.' : ''),
  };
}

export async function acaoRemoverAtribuicao(dados: FormData) {
  const d = await gestor();
  await removerAtribuicao(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidatePath('/empresa', 'layout');
}

const trilhasDoForm = (dados: FormData) =>
  dados.getAll('trilhas').map(Number).filter((n) => Number.isInteger(n) && n > 0);

const prazoDoForm = (dados: FormData) => {
  const p = String(dados.get('prazoDias') ?? '').trim();
  return p ? Number(p) : null;
};

export async function acaoConvidar(_e: EstadoEquipe, dados: FormData): Promise<EstadoEquipe> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => criarConvite(d.u.email, d.portal.id, {
    email: String(dados.get('email') ?? ''), nome: String(dados.get('nome') ?? ''),
    setorId: setorDoForm(dados), trilhas: trilhasDoForm(dados), prazoDias: prazoDoForm(dados),
  }));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa', 'layout');
  const endereco = await enderecoDoPortal(d.portal.mascara);
  return {
    ok: 'Convite criado. Copie o link e mande por onde preferir — ele vale por 7 dias e só '
      + 'funciona para esse e-mail.',
    link: `${endereco}/convite/${r.valor!.token}`,
  };
}

export async function acaoCancelarConvite(dados: FormData) {
  const d = await gestor();
  await cancelarConvite(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidatePath('/empresa', 'layout');
}

export async function acaoImportar(_e: EstadoEquipe, dados: FormData): Promise<EstadoEquipe> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => importarConvites(d.u.email, d.portal.id,
    String(dados.get('csv') ?? ''), trilhasDoForm(dados), prazoDoForm(dados)));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa', 'layout');
  const linhas = r.valor!;
  const ok = linhas.filter((l) => l.token).length;
  const ruins = linhas.length - ok;
  return {
    ok: `${ok} convite(s) criado(s)${ruins ? ` · ${ruins} linha(s) com problema, listadas abaixo` : ''}.`,
    linhas,
    endereco: await enderecoDoPortal(d.portal.mascara),
  };
}

// ---------------------------------------------------------------------
// Biblioteca — o acervo que a empresa disponibiliza (db/042)
// ---------------------------------------------------------------------

/**
 * Salva a ficha de um item. O arquivo já subiu antes, pela rota de
 * upload — aqui ele só é amarrado ao item, junto com o tamanho, que é o
 * que entra na cota de GB do plano.
 *
 * `validarItem` roda antes do banco de propósito: o CHECK da migração
 * derruba a transação com "violates check constraint acervo_tem_conteudo",
 * e o RH precisa ler "Envie o arquivo PDF".
 */
export async function acaoSalvarItemAcervo(
  _e: EstadoAdmin, dados: FormData,
): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }

  const bruto = String(dados.get('id') ?? '');
  const id = bruto ? Number(bruto) : null;
  const formato = String(dados.get('formato') ?? 'PDF') === 'LINK' ? 'LINK' : 'PDF';
  const anoBruto = String(dados.get('ano') ?? '').trim();
  const setorBruto = String(dados.get('setorId') ?? '').trim();

  const item: RascunhoItem = {
    titulo: String(dados.get('titulo') ?? ''),
    autor: String(dados.get('autor') ?? ''),
    assuntos: partirAssuntos(String(dados.get('assuntos') ?? '')),
    descricao: String(dados.get('descricao') ?? ''),
    formato,
    arquivo: String(dados.get('arquivo') ?? '') || null,
    url: String(dados.get('url') ?? '') || null,
    capa: String(dados.get('capa') ?? '') || null,
    ano: anoBruto ? Number(anoBruto) : null,
    editora: String(dados.get('editora') ?? ''),
    setorId: setorBruto ? Number(setorBruto) : null,
  };

  /* Na EDIÇÃO de um item PDF, campo de arquivo vazio significa "manter o
     que está lá" — o RH abriu para corrigir o título, não para trocar o
     livro. Sem esta linha a validação recusaria a edição pedindo um
     arquivo que já existe. */
  if (id && formato === 'PDF' && !item.arquivo) {
    const atual = await lerItem(d.portal.id, id);
    item.arquivo = atual?.arquivo ?? null;
  }

  const problema = validarItem(item);
  if (problema) return { erro: problema };

  const r = await tentar(() => salvarItem(d.portal.id, d.u.id, item, id));
  if (r.erro) return { erro: r.erro };

  // O tamanho do arquivo enviado nesta submissão, medido pela rota de
  // upload e devolvido ao formulário. Só grava quando veio: na edição
  // sem troca de arquivo, o valor de antes continua valendo.
  const bytes = Number(String(dados.get('bytes') ?? '').trim());
  if (formato === 'PDF' && Number.isFinite(bytes) && bytes > 0) {
    await registrarBytes(d.portal.id, r.valor!, bytes);
  }
  // Cota: o acervo pesa como vídeo, e a fatura precisa saber. Fora do
  // caminho da resposta — medir percorre o volume, e o RH veio salvar
  // uma ficha.
  void medirArmazenamento(d.portal.id).catch(() => {});

  revalidarBiblioteca();
  return { ok: id ? 'Item atualizado.' : 'Item criado. Publique quando estiver pronto.' };
}

export async function acaoStatusItemAcervo(dados: FormData) {
  const d = await gestor();
  const status = String(dados.get('status')) === 'PUBLICADO' ? 'PUBLICADO' : 'RASCUNHO';
  await mudarStatus(d.portal.id, Number(dados.get('id')), status);
  revalidarBiblioteca();
}

/**
 * Exclui o item e, só depois, o arquivo do volume.
 *
 * Nesta ordem porque o inverso deixa rastro pior: apagado o arquivo e
 * falhando o banco, sobra um item que aparece na estante e não abre
 * nada. Ao contrário, sobra um arquivo órfão — que não abre para
 * ninguém, porque a entrega exige item publicado, e some na próxima
 * medição de cota.
 */
export async function acaoExcluirItemAcervo(dados: FormData) {
  const d = await gestor();
  const arquivo = await excluirItem(d.portal.id, Number(dados.get('id')));
  if (arquivo && pertenceAoPortal(arquivo, d.portal.id)) {
    const raiz = process.env.DOCUMENTO_RAIZ
      ?? join(dirname(process.env.VIDEO_RAIZ ?? './midia/video'), 'documento');
    await unlink(join(raiz, arquivo)).catch(() => {});
  }
  void medirArmazenamento(d.portal.id).catch(() => {});
  revalidarBiblioteca();
}

function revalidarBiblioteca() {
  revalidatePath('/empresa/biblioteca');
  // A estante do colaborador vive no portal da empresa, noutra rota.
  revalidatePath('/painel/biblioteca');
}

// ---------------------------------------------------------------------
// Catálogo da plataforma: vagas, orçamentos e distribuição (db/047)
// ---------------------------------------------------------------------

export async function acaoComprarVagas(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const meio = String(dados.get('meio') ?? 'PIX');
  if (meio !== 'PIX' && meio !== 'CARTAO') return { erro: 'Meio de pagamento inválido.' };
  const r = await tentar(() => comprarVagas(
    { id: d.u.id, email: d.u.email }, d.portal.id,
    Number(dados.get('materiaId')), Number(dados.get('quantidade')), meio));
  if (r.erro) return { erro: r.erro };
  // O checkout é o de sempre; quem paga é o gestor, a venda é da plataforma.
  redirect(`/checkout/${r.valor!.referencia}`);
}

export async function acaoPedirOrcamento(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => pedirOrcamento(d.u.email, d.portal.id,
    Number(dados.get('materiaId')), Number(dados.get('quantidade')), String(dados.get('mensagem') ?? '')));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa/catalogo');
  revalidatePath('/admin/empresas');
  return { ok: 'Orçamento pedido. O comercial responde aqui mesmo, com o valor.' };
}

export async function acaoAceitarOrcamento(dados: FormData) {
  const d = await gestor();
  const meio = String(dados.get('meio') ?? 'PIX');
  const pedido = await aceitarOrcamento({ id: d.u.id, email: d.u.email }, d.portal.id,
    Number(dados.get('id')), meio === 'CARTAO' ? 'CARTAO' : 'PIX');
  revalidatePath('/empresa/catalogo');
  redirect(`/checkout/${pedido.referencia}`);
}

export async function acaoCancelarOrcamento(dados: FormData) {
  const d = await gestor();
  await cancelarOrcamento(d.u.email, d.portal.id, Number(dados.get('id')));
  revalidatePath('/empresa/catalogo');
  revalidatePath('/admin/empresas');
}

export async function acaoDistribuirVaga(_e: EstadoAdmin, dados: FormData): Promise<EstadoAdmin> {
  let d;
  try { d = await gestor(); } catch (err) { return { erro: (err as Error).message }; }
  const r = await tentar(() => distribuirVaga(d.u.email, d.portal.id,
    Number(dados.get('loteId')), Number(dados.get('usuarioId'))));
  if (r.erro) return { erro: r.erro };
  revalidatePath('/empresa', 'layout');
  return { ok: 'Vaga liberada: o curso já aparece nas trilhas da pessoa.' };
}

export async function acaoDevolverVaga(dados: FormData) {
  const d = await gestor();
  await devolverVaga(d.u.email, d.portal.id, Number(dados.get('licencaId')));
  revalidatePath('/empresa', 'layout');
}
