import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { provedorAtual } from './pagamento.ts';

/**
 * Apuração e repasse da comissão de vitrine — §5.6.1.
 *
 * O mês fecha assim:
 *
 *   apurar   → consolida as vendas nossas de cursos do portal (no mês do
 *              pagamento) menos os reembolsos (no mês em que ocorreram),
 *              mais o saldo acumulado de meses abaixo do mínimo.
 *   conferir → o professor tem 5 dias para contestar o extrato.
 *   aprovar  → prazo passou sem contestação (ou o admin respondeu).
 *   nota     → o professor informa a NF no valor apurado.
 *   pagar    → o repasse sai pelo gateway (transferência para a subconta)
 *              ou o admin registra o comprovante de um Pix manual. PAGA.
 *
 * Duas regras do §5.6.1 que a rotina respeita à risca: reembolso deduz no
 * mês em que acontece (não no da venda), e comissão abaixo de R$ 100 não
 * gera repasse — acumula para o mês seguinte.
 */

export const MINIMO_SAQUE_CENTAVOS = 10_000;
export const DIAS_CONTESTACAO = 5;
/** §5.6.1: "pagamento até o dia 15" — do mês seguinte ao da competência. */
export const DIA_PAGAMENTO = 15;

export function prazoDePagamento(competencia: Date | string): Date {
  // 'AAAA-MM-DD' pelo construtor nasce em UTC e vira o dia anterior no
  // horário local — o mês errado. Lê os campos e monta a data local.
  const d = typeof competencia === 'string'
    ? new Date(Number(competencia.slice(0, 4)), Number(competencia.slice(5, 7)) - 1, 1)
    : competencia;
  return new Date(d.getFullYear(), d.getMonth() + 1, DIA_PAGAMENTO);
}

/** 'AAAA-MM' da competência, pelo calendário local (a coluna é DATE). */
function mesDe(competencia: Date): string {
  return `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, '0')}`;
}

export type StatusApuracao =
  | 'EM_CONFERENCIA' | 'CONTESTADA' | 'APROVADA' | 'PAGA'
  | 'ACUMULADA' | 'INCORPORADA' | 'SEM_VALOR';

export interface Apuracao {
  id: number; portalId: number | null; professorId: number | null; competencia: Date; status: StatusApuracao;
  centavosVendas: number; centavosReembolsos: number;
  centavosSaldoAnterior: number; centavosComissao: number;
  apuradaEm: Date; prazoContestacao: Date;
  contestacao: string | null; contestadaEm: Date | null; resposta: string | null;
  aprovadaEm: Date | null; nfNumero: string | null; nfEm: Date | null;
  comprovante: string | null; pagaEm: Date | null;
}

export interface ItemApuracao {
  id: number; tipo: 'VENDA' | 'REEMBOLSO' | 'SALDO_ANTERIOR';
  referencia: string | null; descricao: string;
  centavosBase: number; comissaoPp: string | null; centavosComissao: number;
}

const CAMPOS = `
  a.id, a.portal_id::int AS "portalId", a.professor_id::int AS "professorId", a.competencia, a.status,
  a.centavos_vendas AS "centavosVendas", a.centavos_reembolsos AS "centavosReembolsos",
  a.centavos_saldo_anterior AS "centavosSaldoAnterior", a.centavos_comissao AS "centavosComissao",
  a.apurada_em AS "apuradaEm", a.prazo_contestacao AS "prazoContestacao",
  a.contestacao, a.contestada_em AS "contestadaEm", a.resposta,
  a.aprovada_em AS "aprovadaEm", a.nf_numero AS "nfNumero", a.nf_em AS "nfEm",
  a.comprovante, a.paga_em AS "pagaEm"`;

/**
 * O DONO de uma apuração (db/046): um portal (comissão de vitrine, §5.10.2
 * etapa 5) ou um professor do catálogo sem portal (etapa 5 do plano de
 * perfis). Um número continua valendo como portal, para quem já chamava.
 */
export type DonoApuracao = { portalId: number } | { professorId: number };
function dono(d: number | DonoApuracao): DonoApuracao {
  return typeof d === 'number' ? { portalId: d } : d;
}
function chaveDoDono(d: DonoApuracao) {
  return 'portalId' in d
    ? { coluna: 'portal_id' as const, valor: d.portalId, rotulo: `portal:${d.portalId}` }
    : { coluna: 'professor_id' as const, valor: d.professorId, rotulo: `professor:${d.professorId}` };
}
/** As vendas NOSSAS (portal 0) que rendem comissão ao dono. */
const vendasDoDono = (d: DonoApuracao) =>
  'portalId' in d ? 'p.portal_id = 0 AND p.materia_portal_id = $1' : 'p.portal_id = 0 AND p.professor_id = $1';

export function listarApuracoes(alvo: number | DonoApuracao) {
  const k = chaveDoDono(dono(alvo));
  return query<Apuracao>(
    `SELECT ${CAMPOS} FROM apuracao a WHERE a.${k.coluna} = $1 ORDER BY a.competencia DESC`,
    [k.valor],
  );
}

export function buscarApuracao(id: number, portalId?: number) {
  return queryOne<Apuracao>(
    `SELECT ${CAMPOS} FROM apuracao a
      WHERE a.id = $1 AND ($2::bigint IS NULL OR a.portal_id = $2)`,
    [id, portalId ?? null],
  );
}

export function itensDaApuracao(apuracaoId: number) {
  return query<ItemApuracao>(
    `SELECT i.id, i.tipo, p.referencia, i.descricao,
            i.centavos_base AS "centavosBase", i.comissao_pp AS "comissaoPp",
            i.centavos_comissao AS "centavosComissao"
       FROM apuracao_item i
       LEFT JOIN pedido p ON p.id = i.pedido_id
      WHERE i.apuracao_id = $1
      ORDER BY i.tipo, i.id`,
    [apuracaoId],
  );
}

/** Fila do admin: o que espera ação de alguém. */
export function apuracoesEmAberto() {
  return query<Apuracao & { mascara: string; nomeExibicao: string }>(
    `SELECT ${CAMPOS}, coalesce(pt.mascara, 'catalogo') AS mascara,
            coalesce(pt.nome_exibicao, pr.nome) AS "nomeExibicao"
       FROM apuracao a
       LEFT JOIN portal pt ON pt.id = a.portal_id
       LEFT JOIN usuario pr ON pr.id = a.professor_id
      WHERE a.status IN ('EM_CONFERENCIA', 'CONTESTADA', 'APROVADA')
      ORDER BY a.status, a.competencia`,
  );
}

/**
 * Fecha a competência do portal. Cada venda e cada reembolso entram uma
 * vez — o UNIQUE de `apuracao_item` recusa a segunda — e o saldo de
 * apurações ACUMULADAS anteriores entra como item e as marca
 * INCORPORADAS. Mês sem nada vira SEM_VALOR: registra que se olhou.
 */
export async function apurarComissao(ator: string, alvo: number | DonoApuracao, competencia: string) {
  if (!/^\d{4}-\d{2}-01$/.test(competencia)) throw new Error('competência inválida (use o dia 1 do mês)');
  const d = dono(alvo);
  const k = chaveDoDono(d);

  return emTransacao(async (exec) => {
    const [existente] = await exec<{ id: number }>(
      `SELECT id FROM apuracao WHERE ${k.coluna} = $1 AND competencia = $2`, [k.valor, competencia]);
    if (existente) throw new Error(`a competência ${competencia.slice(0, 7)} já foi apurada`);

    // Vendas NOSSAS de cursos deste portal pagas no mês, ainda não apuradas.
    const vendas = await exec<{ id: number; referencia: string; centavos: number; pp: string; materia: string | null }>(
      `SELECT p.id, p.referencia, p.centavos, p.comissao_professor_pp AS pp, m.nome AS materia
         FROM pedido p LEFT JOIN materia m ON m.id = p.materia_id
        WHERE ${vendasDoDono(d)}
          AND p.status IN ('PAGO', 'REEMBOLSADO')
          AND p.pago_em >= $2::date AND p.pago_em < ($2::date + interval '1 month')
          AND p.comissao_professor_pp IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM apuracao_item i WHERE i.pedido_id = p.id AND i.tipo = 'VENDA')
        ORDER BY p.pago_em`,
      [k.valor, competencia],
    );
    // Reembolsos ocorridos no mês (§5.6.1: deduzem no mês em que acontecem).
    const reembolsos = await exec<{ id: number; referencia: string; centavos: number; pp: string; materia: string | null }>(
      `SELECT p.id, p.referencia, r.centavos, p.comissao_professor_pp AS pp, m.nome AS materia
         FROM reembolso r
         JOIN pedido p ON p.id = r.pedido_id
         LEFT JOIN materia m ON m.id = p.materia_id
        WHERE ${vendasDoDono(d)}
          AND r.criado_em >= $2::date AND r.criado_em < ($2::date + interval '1 month')
          AND p.comissao_professor_pp IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM apuracao_item i WHERE i.pedido_id = p.id AND i.tipo = 'REEMBOLSO')
        ORDER BY r.criado_em`,
      [k.valor, competencia],
    );
    const acumuladas = await exec<{ id: number; competencia: Date; centavos: number }>(
      `SELECT id, competencia, centavos_comissao AS centavos FROM apuracao
        WHERE ${k.coluna} = $1 AND status = 'ACUMULADA' AND competencia < $2::date
        ORDER BY competencia`,
      [k.valor, competencia],
    );

    const comissaoDe = (centavos: number, pp: string) => Math.round(centavos * Number(pp) / 100);
    const totalVendas = vendas.reduce((t, v) => t + v.centavos, 0);
    const totalReembolsos = reembolsos.reduce((t, r) => t + r.centavos, 0);
    const saldoAnterior = acumuladas.reduce((t, a) => t + a.centavos, 0);
    const comissao = vendas.reduce((t, v) => t + comissaoDe(v.centavos, v.pp), 0)
                   - reembolsos.reduce((t, r) => t + comissaoDe(r.centavos, r.pp), 0)
                   + saldoAnterior;

    const vazia = vendas.length === 0 && reembolsos.length === 0 && acumuladas.length === 0;
    const status: StatusApuracao = vazia ? 'SEM_VALOR'
      : comissao >= MINIMO_SAQUE_CENTAVOS ? 'EM_CONFERENCIA'
      : 'ACUMULADA';   // abaixo do mínimo (ou negativo): carrega para o mês seguinte

    const [ap] = await exec<{ id: number }>(
      `INSERT INTO apuracao
         (${k.coluna}, competencia, status, centavos_vendas, centavos_reembolsos,
          centavos_saldo_anterior, centavos_comissao, apurada_por,
          prazo_contestacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, current_date + $9::int)
       RETURNING id`,
      [k.valor, competencia, status, totalVendas, totalReembolsos, saldoAnterior, comissao,
       ator, DIAS_CONTESTACAO],
    );

    for (const v of vendas) {
      await exec(
        `INSERT INTO apuracao_item (apuracao_id, tipo, pedido_id, descricao, centavos_base, comissao_pp, centavos_comissao)
         VALUES ($1, 'VENDA', $2, $3, $4, $5, $6)`,
        [ap.id, v.id, v.materia ?? 'curso', v.centavos, v.pp, comissaoDe(v.centavos, v.pp)]);
    }
    for (const r of reembolsos) {
      await exec(
        `INSERT INTO apuracao_item (apuracao_id, tipo, pedido_id, descricao, centavos_base, comissao_pp, centavos_comissao)
         VALUES ($1, 'REEMBOLSO', $2, $3, $4, $5, $6)`,
        [ap.id, r.id, `reembolso — ${r.materia ?? 'curso'}`, r.centavos, r.pp, -comissaoDe(r.centavos, r.pp)]);
    }
    for (const a of acumuladas) {
      await exec(
        `INSERT INTO apuracao_item (apuracao_id, tipo, apuracao_origem_id, descricao, centavos_base, centavos_comissao)
         VALUES ($1, 'SALDO_ANTERIOR', $2, $3, $4, $4)`,
        [ap.id, a.id, `saldo de ${String(a.competencia).slice(0, 7)} (abaixo do mínimo de saque)`, a.centavos]);
      await exec(`UPDATE apuracao SET status = 'INCORPORADA', incorporada_em = $2 WHERE id = $1`, [a.id, ap.id]);
    }

    await auditar(exec, ator, 'apuracao.fechada', 'apuracao', ap.id,
      { dono: k.rotulo, competencia, status, comissao, vendas: vendas.length, reembolsos: reembolsos.length });
    return { id: ap.id, status, centavosComissao: comissao, vendas: vendas.length, reembolsos: reembolsos.length };
  });
}

/** Todos os portais com contrato, para o script do dia 1. */
export async function apurarTodos(ator: string, competencia: string) {
  const portais = await query<{ id: number; mascara: string }>(
    `SELECT p.id::int AS id, p.mascara FROM portal p
      WHERE p.id <> 0 AND p.status <> 'ENCERRADO'
        AND EXISTS (SELECT 1 FROM portal_contrato c WHERE c.portal_id = p.id AND c.aceito_em IS NOT NULL)
      ORDER BY p.id`);
  const resultados: { mascara: string; resultado: string }[] = [];
  for (const p of portais) {
    try {
      const r = await apurarComissao(ator, p.id, competencia);
      resultados.push({ mascara: p.mascara, resultado: `${r.status} · R$ ${(r.centavosComissao / 100).toFixed(2)}` });
    } catch (err) {
      resultados.push({ mascara: p.mascara, resultado: (err as Error).message });
    }
  }
  // Os professores do catálogo (db/046): mesmo ciclo, outro dono.
  const professores = await query<{ id: number; email: string }>(
    `SELECT u.id::int AS id, u.email FROM usuario u
      WHERE EXISTS (SELECT 1 FROM contrato_professor c
                     WHERE c.usuario_id = u.id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL)
      ORDER BY u.id`);
  for (const pr of professores) {
    try {
      const r = await apurarComissao(ator, { professorId: pr.id }, competencia);
      resultados.push({ mascara: `professor:${pr.email}`, resultado: `${r.status} · R$ ${(r.centavosComissao / 100).toFixed(2)}` });
    } catch (err) {
      resultados.push({ mascara: `professor:${pr.email}`, resultado: (err as Error).message });
    }
  }
  return resultados;
}

/** O professor contesta o extrato — só dentro do prazo. */
export async function contestarApuracao(alvo: number | DonoApuracao, apuracaoId: number, texto: string, hoje = new Date()) {
  if (!texto.trim()) throw new Error('diga o que está errado — a contestação precisa de texto');
  const k = chaveDoDono(dono(alvo));
  return emTransacao(async (exec) => {
    const [a] = await exec<{ status: string; prazo: Date }>(
      `SELECT status, prazo_contestacao AS prazo FROM apuracao WHERE id = $1 AND ${k.coluna} = $2 FOR UPDATE`,
      [apuracaoId, k.valor]);
    if (!a) throw new Error('apuração não encontrada');
    if (a.status !== 'EM_CONFERENCIA') throw new Error('esta apuração não está em conferência');
    if (hoje.toISOString().slice(0, 10) > new Date(a.prazo).toISOString().slice(0, 10)) {
      throw new Error('o prazo de contestação (5 dias) já passou');
    }
    await exec(`UPDATE apuracao SET status = 'CONTESTADA', contestacao = $2, contestada_em = now() WHERE id = $1`,
      [apuracaoId, texto.trim()]);
    await auditar(exec, k.rotulo, 'apuracao.contestada', 'apuracao', apuracaoId, { texto: texto.trim() });
  });
}

/** Aprovação pelo admin (responde a contestação, se houver). */
export async function aprovarApuracao(ator: string, apuracaoId: number, resposta?: string) {
  return emTransacao(async (exec) => {
    const [a] = await exec<{ status: string }>(
      `SELECT status FROM apuracao WHERE id = $1 FOR UPDATE`, [apuracaoId]);
    if (!a) throw new Error('apuração não encontrada');
    if (a.status !== 'EM_CONFERENCIA' && a.status !== 'CONTESTADA') throw new Error('esta apuração não pode ser aprovada');
    if (a.status === 'CONTESTADA' && !resposta?.trim()) throw new Error('responda a contestação antes de aprovar');
    await exec(`UPDATE apuracao SET status = 'APROVADA', aprovada_em = now(), resposta = coalesce($2, resposta) WHERE id = $1`,
      [apuracaoId, resposta?.trim() || null]);
    await auditar(exec, ator, 'apuracao.aprovada', 'apuracao', apuracaoId, { resposta: resposta?.trim() ?? null });
  });
}

/** Prazo de contestação vencido sem contestação: aprova sozinho (script). */
export async function aprovarVencidas(ator: string, hoje = new Date()) {
  return emTransacao(async (exec) => {
    const aprovadas = await exec<{ id: number }>(
      `UPDATE apuracao SET status = 'APROVADA', aprovada_em = now()
        WHERE status = 'EM_CONFERENCIA' AND prazo_contestacao < $1::date
        RETURNING id`,
      [hoje.toISOString().slice(0, 10)]);
    for (const a of aprovadas) await auditar(exec, ator, 'apuracao.aprovada_por_prazo', 'apuracao', a.id, {});
    return aprovadas.length;
  });
}

/** O professor informa a NF do valor aprovado. */
export async function informarNota(alvo: number | DonoApuracao, apuracaoId: number, numero: string) {
  if (!numero.trim()) throw new Error('informe o número da nota');
  const k = chaveDoDono(dono(alvo));
  return emTransacao(async (exec) => {
    const [a] = await exec<{ status: string }>(
      `SELECT status FROM apuracao WHERE id = $1 AND ${k.coluna} = $2 FOR UPDATE`, [apuracaoId, k.valor]);
    if (!a) throw new Error('apuração não encontrada');
    if (a.status !== 'APROVADA') throw new Error('a nota só entra depois da aprovação do extrato');
    await exec(`UPDATE apuracao SET nf_numero = $2, nf_em = now() WHERE id = $1`, [apuracaoId, numero.trim()]);
    await auditar(exec, k.rotulo, 'apuracao.nota', 'apuracao', apuracaoId, { numero: numero.trim() });
  });
}

/** O admin registra o pagamento — só com nota. */
export async function registrarRepasse(ator: string, apuracaoId: number, comprovante: string) {
  if (!comprovante.trim()) throw new Error('registre o comprovante (referência do Pix/TED)');
  return emTransacao(async (exec) => {
    const [a] = await exec<{ status: string; nf: string | null }>(
      `SELECT status, nf_numero AS nf FROM apuracao WHERE id = $1 FOR UPDATE`, [apuracaoId]);
    if (!a) throw new Error('apuração não encontrada');
    if (a.status !== 'APROVADA') throw new Error('só se paga apuração aprovada');
    if (!a.nf) throw new Error('sem nota fiscal não há pagamento (§5.6.1)');
    await exec(`UPDATE apuracao SET status = 'PAGA', comprovante = $2, paga_em = now() WHERE id = $1`,
      [apuracaoId, comprovante.trim()]);
    await auditar(exec, ator, 'apuracao.paga', 'apuracao', apuracaoId, { comprovante: comprovante.trim() });
  });
}

/**
 * O repasse pelo gateway: transfere da nossa conta para a subconta do
 * professor e registra a apuração como PAGA com o id da transferência
 * como comprovante. As mesmas travas do registro manual (aprovada, com
 * nota) valem aqui — e mais uma: a subconta precisa estar aprovada,
 * senão não há para onde mandar.
 *
 * Se a transferência sair e o registro falhar, o erro carrega o id: o
 * admin registra à mão com ele. Dinheiro não se manda duas vezes.
 */
export async function pagarRepasse(ator: string, apuracaoId: number) {
  const a = await queryOne<{
    status: string; nf: string | null; centavos: number; competencia: Date;
    walletId: string | null; subconta: string; portal: string;
  }>(
    `SELECT a.status, a.nf_numero AS nf, a.centavos_comissao AS centavos, a.competencia,
            p.gateway_wallet_id AS "walletId", p.subconta_situacao AS subconta,
            p.nome_exibicao AS portal
       FROM apuracao a LEFT JOIN portal p ON p.id = a.portal_id WHERE a.id = $1`,
    [apuracaoId],
  );
  if (!a) throw new Error('apuração não encontrada');
  if (a.status !== 'APROVADA') throw new Error('só se paga apuração aprovada');
  if (!a.nf) throw new Error('sem nota fiscal não há pagamento (§5.6.1)');
  if (a.subconta !== 'APROVADA' || !a.walletId) {
    // Também é o caso do professor do catálogo (db/046): sem portal, sem
    // subconta — o repasse vai por Pix, na chave do contrato dele.
    throw new Error('a conta de recebimento do professor não está aprovada — pague por fora e registre o comprovante');
  }

  const provedor = provedorAtual();
  const mes = mesDe(new Date(a.competencia));
  const { idExterno } = await provedor.transferir({
    walletId: a.walletId, centavos: a.centavos, referencia: `APU-${apuracaoId}`,
    descricao: `Comissão de vitrine ${mes} — ${a.portal} — NF ${a.nf}`,
  });
  const comprovante = `${provedor.nome}:${idExterno}`;
  try {
    await registrarRepasse(ator, apuracaoId, comprovante);
  } catch (err) {
    throw new Error(`a transferência SAIU (${comprovante}) mas o registro falhou: ${(err as Error).message}. Registre o comprovante à mão.`);
  }
  return { comprovante, centavos: a.centavos };
}
