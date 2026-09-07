'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { alunoAtual } from '../../lib/sessao.ts';
import { gerarHashSenha, validarSenha, validarEmail } from '../../lib/auth.ts';
import { editarPortal } from '../../lib/admin-portais.ts';
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
  return {
    ok: `${email} já pode entrar no portal com a senha provisória`
      + (t ? ` — e já recebeu ${t === 1 ? '1 trilha' : `${t} trilhas`} do setor.` : '.'),
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
