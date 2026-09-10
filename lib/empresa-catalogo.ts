import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { abrirPedido } from './checkout.ts';
import type { MeioPagamento } from './pagamento.ts';
import { PORTAL_PLATAFORMA } from './portal.ts';

/**
 * A compra de cursos do catálogo pela EMPRESA — docs/plano-perfis-e-
 * acessos.md, etapa 6 (revista em 10/09/2026).
 *
 * A empresa não sobe só as trilhas dela: compra VAGAS de cursos do
 * catálogo da plataforma (os da casa, os dos professores do catálogo e
 * os de portal compartilhados na vitrine) para os colaboradores. Três
 * peças:
 *
 *  - a LOJA: o que está à venda, com o preço anual e o limite de vagas
 *    que o curso declara (`materia.vagas_sem_orcamento`, db/047);
 *  - a COMPRA: até o limite, pedido pago na hora pelo checkout de sempre
 *    (a venda é da plataforma, feita pelo gestor); acima, ORÇAMENTO, que
 *    o comercial responde com um valor e o RH aceita — e vira o mesmo
 *    pedido;
 *  - o LOTE: o pagamento confirmado nasce como lote de vagas
 *    (lib/checkout.ts), e o RH DISTRIBUI cada vaga a um colaborador — é
 *    uma licença B2B no perfil dele, apontando para o curso da
 *    plataforma, válida até o fim do lote. Devolver cancela a licença e
 *    libera a vaga.
 */

/** A vaga comprada vale um ano (decisão 7 do plano, premissa registrada). */
export const PERIODO_DA_VAGA = 'anual' as const;

// ---------------------------------------------------------------------
// A loja
// ---------------------------------------------------------------------

export interface CursoAVenda {
  id: number; slug: string; nome: string; ementa: string; areaNome: string;
  professor: string | null; portalId: number; portalNome: string | null;
  aulasPublicadas: number; capa: string | null;
  vagasSemOrcamento: number; precoAnualCentavos: number;
}

/**
 * Publicados e vendáveis: da plataforma (inclusive de professor do
 * catálogo, que tem contrato) e de portal ATIVO com contrato, marcados
 * para a vitrine. O preço é o anual da tabela da plataforma — a venda é
 * nossa, em qualquer dos casos.
 */
export async function cursosAVenda(): Promise<CursoAVenda[]> {
  const preco = await queryOne<{ centavos: number }>(
    `SELECT centavos FROM preco
      WHERE portal_id = ${PORTAL_PLATAFORMA} AND produto = 'MATERIA' AND periodo = $1
        AND vigente_ate IS NULL AND vigente_de <= current_date`, [PERIODO_DA_VAGA]);
  if (!preco) return [];
  const cursos = await query<Omit<CursoAVenda, 'precoAnualCentavos'>>(
    `SELECT m.id::int AS id, m.slug, m.nome, m.ementa, a.nome AS "areaNome", m.professor,
            m.portal_id::int AS "portalId",
            CASE WHEN m.portal_id = 0 THEN NULL ELSE p.nome_exibicao END AS "portalNome",
            m.capa, m.vagas_sem_orcamento AS "vagasSemOrcamento",
            (SELECT count(*)::int FROM aula au JOIN assunto s ON s.id = au.assunto_id
              WHERE s.materia_id = m.id AND au.status = 'publicado') AS "aulasPublicadas"
       FROM materia m
       JOIN area a ON a.id = m.area_id
       JOIN portal p ON p.id = m.portal_id
      WHERE m.status = 'publicado'
        AND (
          (m.portal_id = 0 AND (m.professor_id IS NULL OR EXISTS (
             SELECT 1 FROM contrato_professor c
              WHERE c.usuario_id = m.professor_id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL)))
          OR (m.portal_id <> 0 AND m.na_vitrine_plataforma AND p.status = 'ATIVO' AND EXISTS (
             SELECT 1 FROM portal_contrato c
              WHERE c.portal_id = p.id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL))
        )
      ORDER BY a.ordem, m.ordem, m.nome`);
  return cursos
    .filter((c) => c.aulasPublicadas > 0)
    .map((c) => ({ ...c, precoAnualCentavos: preco.centavos }));
}

async function cursoAVenda(materiaId: number) {
  // BIGINT chega como texto de quem leu o id do banco: comparação numérica (§15.14).
  const c = (await cursosAVenda()).find((x) => Number(x.id) === Number(materiaId));
  if (!c) throw new Error('este curso não está à venda para empresas');
  return c;
}

// ---------------------------------------------------------------------
// A compra direta (até o limite do curso)
// ---------------------------------------------------------------------

/**
 * Até `vagas_sem_orcamento`, o RH paga na hora. O pedido é do GESTOR
 * (perfil da plataforma), a venda é da plataforma, e o lote nasce para a
 * empresa no pagamento.
 */
export async function comprarVagas(
  gestor: { id: number; email: string }, empresaPortalId: number,
  materiaId: number, quantidade: number, meio: MeioPagamento,
) {
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new Error('quantas vagas?');
  const curso = await cursoAVenda(materiaId);
  if (quantidade > curso.vagasSemOrcamento) {
    throw new Error(`acima de ${curso.vagasSemOrcamento} vaga(s) deste curso a compra é por orçamento — peça um logo abaixo`);
  }
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, gestor.id, gestor.email, 'MATERIA', PERIODO_DA_VAGA,
    materiaId, meio, { quantidade, empresaPortalId });
  return pedido;
}

// ---------------------------------------------------------------------
// O orçamento (acima do limite)
// ---------------------------------------------------------------------

export type StatusOrcamento = 'novo' | 'proposto' | 'aceito' | 'recusado' | 'cancelado';

export interface Orcamento {
  id: number; portalId: number; portalNome: string; materiaId: number; materiaNome: string;
  quantidade: number; mensagem: string | null; status: StatusOrcamento; solicitadoPor: string;
  valorCentavos: number | null; resposta: string | null; respondidoPor: string | null;
  respondidoEm: Date | null; pedidoId: number | null; pedidoReferencia: string | null;
  pedidoStatus: string | null; criadoEm: Date;
}

const CAMPOS_ORCAMENTO = `
  o.id::int AS id, o.portal_id::int AS "portalId", p.nome_exibicao AS "portalNome",
  o.materia_id::int AS "materiaId", m.nome AS "materiaNome", o.quantidade, o.mensagem,
  o.status, o.solicitado_por AS "solicitadoPor", o.valor_centavos AS "valorCentavos",
  o.resposta, o.respondido_por AS "respondidoPor", o.respondido_em AS "respondidoEm",
  o.pedido_id::int AS "pedidoId", pd.referencia AS "pedidoReferencia", pd.status AS "pedidoStatus",
  o.criado_em AS "criadoEm"`;
const DE_ORCAMENTO = `
  FROM orcamento_empresa o
  JOIN portal p ON p.id = o.portal_id
  JOIN materia m ON m.id = o.materia_id
  LEFT JOIN pedido pd ON pd.id = o.pedido_id`;

export async function pedirOrcamento(
  gestorEmail: string, empresaPortalId: number, materiaId: number, quantidade: number, mensagem: string,
) {
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new Error('quantas vagas?');
  const curso = await cursoAVenda(materiaId);
  if (quantidade <= curso.vagasSemOrcamento) {
    throw new Error(`até ${curso.vagasSemOrcamento} vaga(s) deste curso a compra é na hora, sem orçamento`);
  }
  return emTransacao(async (exec) => {
    const [o] = await exec<{ id: number }>(
      `INSERT INTO orcamento_empresa (portal_id, materia_id, materia_portal_id, quantidade, mensagem, solicitado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::int AS id`,
      [empresaPortalId, materiaId, curso.portalId, quantidade, mensagem.trim() || null, gestorEmail]);
    await auditar(exec, gestorEmail, 'orcamento.pedido', 'orcamento_empresa', o.id,
      { empresaPortalId, materiaId, quantidade });
    return o.id;
  });
}

export function orcamentosDaEmpresa(empresaPortalId: number) {
  return query<Orcamento>(
    `SELECT ${CAMPOS_ORCAMENTO} ${DE_ORCAMENTO} WHERE o.portal_id = $1 ORDER BY o.criado_em DESC`,
    [empresaPortalId]);
}

/** Para a retaguarda: a fila, por situação ('' = todas). */
export function listarOrcamentos(status = '') {
  return query<Orcamento>(
    `SELECT ${CAMPOS_ORCAMENTO} ${DE_ORCAMENTO}
      WHERE ($1 = '' OR o.status::text = $1)
      ORDER BY (o.status = 'novo') DESC, o.criado_em DESC`,
    [status]);
}

export function contarOrcamentosPorStatus() {
  return query<{ status: string; total: number }>(
    `SELECT status::text AS status, count(*)::int AS total FROM orcamento_empresa GROUP BY status`);
}

/** O comercial responde com o valor TOTAL (em centavos) e um texto. */
export async function responderOrcamento(ator: string, id: number, valorCentavos: number, resposta: string) {
  if (!Number.isInteger(valorCentavos) || valorCentavos < 0) throw new Error('valor inválido');
  await emTransacao(async (exec) => {
    const [o] = await exec<{ status: string }>(
      'SELECT status FROM orcamento_empresa WHERE id = $1 FOR UPDATE', [id]);
    if (!o) throw new Error('orçamento não encontrado');
    if (o.status !== 'novo' && o.status !== 'proposto') throw new Error(`este orçamento está ${o.status}`);
    await exec(
      `UPDATE orcamento_empresa SET status = 'proposto', valor_centavos = $2, resposta = $3,
              respondido_por = $4, respondido_em = now() WHERE id = $1`,
      [id, valorCentavos, resposta.trim() || null, ator]);
    await auditar(exec, ator, 'orcamento.proposto', 'orcamento_empresa', id, { valorCentavos });
  });
}

export async function recusarOrcamento(ator: string, id: number, resposta: string) {
  await emTransacao(async (exec) => {
    const r = await exec<{ id: number }>(
      `UPDATE orcamento_empresa SET status = 'recusado', resposta = coalesce(nullif($2, ''), resposta),
              respondido_por = $3, respondido_em = now()
        WHERE id = $1 AND status IN ('novo', 'proposto') RETURNING id`,
      [id, resposta.trim(), ator]);
    if (r.length === 0) throw new Error('este orçamento não pode mais ser recusado');
    await auditar(exec, ator, 'orcamento.recusado', 'orcamento_empresa', id, {});
  });
}

/** O RH aceita a proposta: nasce o pedido pelo valor proposto, a pagar no checkout. */
export async function aceitarOrcamento(
  gestor: { id: number; email: string }, empresaPortalId: number, id: number, meio: MeioPagamento,
) {
  const o = await queryOne<{ status: string; materiaId: number; quantidade: number; valorCentavos: number | null }>(
    `SELECT status, materia_id::int AS "materiaId", quantidade, valor_centavos AS "valorCentavos"
       FROM orcamento_empresa WHERE id = $1 AND portal_id = $2`, [id, empresaPortalId]);
  if (!o) throw new Error('orçamento não encontrado');
  if (o.status !== 'proposto' || o.valorCentavos === null) throw new Error('este orçamento ainda não tem proposta');
  const pedido = await abrirPedido(PORTAL_PLATAFORMA, gestor.id, gestor.email, 'MATERIA', PERIODO_DA_VAGA,
    o.materiaId, meio, { quantidade: o.quantidade, empresaPortalId, centavosTotal: o.valorCentavos });
  await emTransacao(async (exec) => {
    await exec(`UPDATE orcamento_empresa SET status = 'aceito', pedido_id = $2 WHERE id = $1`, [id, pedido.id]);
    await auditar(exec, gestor.email, 'orcamento.aceito', 'orcamento_empresa', id, { pedidoId: pedido.id });
  });
  return pedido;
}

export async function cancelarOrcamento(gestorEmail: string, empresaPortalId: number, id: number) {
  await emTransacao(async (exec) => {
    const r = await exec<{ id: number }>(
      `UPDATE orcamento_empresa SET status = 'cancelado' WHERE id = $1 AND portal_id = $2
         AND status IN ('novo', 'proposto') RETURNING id`, [id, empresaPortalId]);
    if (r.length === 0) throw new Error('este orçamento não pode mais ser cancelado');
    await auditar(exec, gestorEmail, 'orcamento.cancelado', 'orcamento_empresa', id, {});
  });
}

// ---------------------------------------------------------------------
// Os lotes e a distribuição das vagas
// ---------------------------------------------------------------------

export interface Lote {
  id: number; materiaId: number; materiaNome: string; materiaSlug: string; materiaPortalId: number;
  quantidade: number; usadas: number; inicioEm: Date; fimEm: Date; vigente: boolean;
  pedidoReferencia: string | null;
}

export function lotesDaEmpresa(empresaPortalId: number) {
  return query<Lote>(
    `SELECT l.id::int AS id, l.materia_id::int AS "materiaId", m.nome AS "materiaNome", m.slug AS "materiaSlug",
            l.materia_portal_id::int AS "materiaPortalId", l.quantidade,
            (SELECT count(*)::int FROM licenca lc WHERE lc.lote_id = l.id AND lc.status <> 'CANCELADA') AS usadas,
            l.inicio_em AS "inicioEm", l.fim_em AS "fimEm", (l.fim_em > now()) AS vigente,
            pd.referencia AS "pedidoReferencia"
       FROM licenca_lote l
       JOIN materia m ON m.id = l.materia_id
       LEFT JOIN pedido pd ON pd.id = l.pedido_id
      WHERE l.portal_id = $1
      ORDER BY (l.fim_em > now()) DESC, l.criado_em DESC`,
    [empresaPortalId]);
}

export interface VagaOcupada {
  licencaId: number; loteId: number; usuarioId: number; nome: string; email: string;
  setorNome: string | null; fimEm: Date; status: string;
}

export function vagasOcupadas(empresaPortalId: number) {
  return query<VagaOcupada>(
    `SELECT lc.id::int AS "licencaId", lc.lote_id::int AS "loteId", u.id::int AS "usuarioId",
            u.nome, u.email, s.nome AS "setorNome", lc.fim_em AS "fimEm", lc.status
       FROM licenca lc
       JOIN licenca_lote l ON l.id = lc.lote_id
       JOIN usuario u ON u.id = lc.usuario_id
       LEFT JOIN setor s ON s.id = u.setor_id
      WHERE l.portal_id = $1 AND lc.status <> 'CANCELADA'
      ORDER BY l.id, u.nome`,
    [empresaPortalId]);
}

/**
 * Uma vaga para uma pessoa: licença B2B no perfil dela, apontando para o
 * curso da plataforma, até o fim do lote. O lote é da empresa e a pessoa
 * é colaboradora dela — as duas coisas conferidas aqui, na transação.
 */
export async function distribuirVaga(ator: string, empresaPortalId: number, loteId: number, usuarioId: number) {
  return emTransacao(async (exec) => {
    const [lote] = await exec<{ materiaId: number; materiaPortalId: number; quantidade: number; usadas: number; fimEm: Date }>(
      `SELECT l.materia_id::int AS "materiaId", l.materia_portal_id::int AS "materiaPortalId", l.quantidade, l.fim_em AS "fimEm",
              (SELECT count(*)::int FROM licenca lc WHERE lc.lote_id = l.id AND lc.status <> 'CANCELADA') AS usadas
         FROM licenca_lote l WHERE l.id = $1 AND l.portal_id = $2 FOR UPDATE`, [loteId, empresaPortalId]);
    if (!lote) throw new Error('lote não encontrado');
    if (new Date(lote.fimEm) <= new Date()) throw new Error('este lote já venceu');
    if (lote.usadas >= lote.quantidade) throw new Error('todas as vagas deste lote já foram distribuídas');
    const [pessoa] = await exec<{ id: number }>(
      `SELECT id FROM usuario WHERE id = $1 AND portal_id = $2 AND papel = 'aluno' AND status_conta <> 'ENCERRADA'`,
      [usuarioId, empresaPortalId]);
    if (!pessoa) throw new Error('essa pessoa não é colaboradora ativa deste portal');
    const [lc] = await exec<{ id: number }>(
      `INSERT INTO licenca (usuario_id, portal_id, escopo, materia_id, origem, status, inicio_em, fim_em,
                            materia_portal_id, lote_id)
       VALUES ($1, $2, 'MATERIA', $3, 'B2B', 'ATIVA', now(), $4, $5, $6)
       ON CONFLICT DO NOTHING RETURNING id::int AS id`,
      [usuarioId, empresaPortalId, lote.materiaId, lote.fimEm, lote.materiaPortalId, loteId]);
    if (!lc) throw new Error('essa pessoa já tem vaga neste lote');
    await auditar(exec, ator, 'vaga.distribuida', 'licenca', lc.id, { loteId, usuarioId, empresaPortalId });
    return lc.id;
  });
}

/** Devolver a vaga: cancela a licença e libera a contagem do lote. */
export async function devolverVaga(ator: string, empresaPortalId: number, licencaId: number) {
  await emTransacao(async (exec) => {
    const r = await exec<{ id: number }>(
      `UPDATE licenca SET status = 'CANCELADA', atualizada_em = now()
        WHERE id = $1 AND portal_id = $2 AND lote_id IS NOT NULL AND status <> 'CANCELADA' RETURNING id`,
      [licencaId, empresaPortalId]);
    if (r.length === 0) throw new Error('vaga não encontrada');
    await auditar(exec, ator, 'vaga.devolvida', 'licenca', licencaId, { empresaPortalId });
  });
}
