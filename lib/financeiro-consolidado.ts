import { query } from './db.ts';

/**
 * A visão consolidada do dinheiro — §5.9, "Financeiro: visão consolidada:
 * receita por fonte, custos, repasses" — em consultas SÓ DE LEITURA.
 *
 * Nasceu com o perfil Financeiro (docs/plano-perfis-e-acessos.md): ele
 * precisa responder "quanto entrou este mês, de onde, e o que está em
 * aberto" sem abrir portal por portal. Nada aqui grava; o que age mora em
 * lib/portal-financeiro.ts, lib/apuracao.ts e lib/admin.ts, atrás de
 * `financeiro.agir`.
 *
 * As quatro fontes, e o que é NOSSO em cada uma:
 *
 *  - venda na plataforma (pedido.portal_id = 0): inteira nossa — quando o
 *    curso é de um parceiro, a comissão dele sai depois, pela apuração;
 *  - venda no portal do professor: só o percentual retido no split
 *    (`percentual_aplicado`, gravado na venda);
 *  - mensalidade de portal (portal_fatura paga): inteira nossa;
 *  - reembolso: sai do que entrou, no mês em que foi devolvido.
 */

export interface ReceitaDoMes {
  /** 'YYYY-MM' */
  mes: string;
  vendasPlataforma: number;
  vendasPortais: number;
  /** A nossa parte das vendas de portal. */
  retidoPortais: number;
  mensalidades: number;
  reembolsos: number;
  /** vendasPlataforma + retidoPortais + mensalidades − reembolsos */
  liquido: number;
}

export async function receitaPorMes(meses = 6): Promise<ReceitaDoMes[]> {
  const desde = `date_trunc('month', now()) - interval '${Math.max(0, meses - 1)} months'`;
  const [vendas, faturas, reembolsos] = await Promise.all([
    query<{ mes: string; plataforma: number; portais: number; retido: number }>(
      `SELECT to_char(date_trunc('month', pago_em), 'YYYY-MM') AS mes,
              coalesce(sum(centavos) FILTER (WHERE portal_id = 0), 0)::int AS plataforma,
              coalesce(sum(centavos) FILTER (WHERE portal_id <> 0), 0)::int AS portais,
              coalesce(sum(round(centavos * coalesce(percentual_aplicado, 0) / 100))
                       FILTER (WHERE portal_id <> 0), 0)::int AS retido
         FROM pedido
        WHERE status IN ('PAGO', 'REEMBOLSADO') AND pago_em >= ${desde}
        GROUP BY 1`),
    query<{ mes: string; total: number }>(
      `SELECT to_char(date_trunc('month', paga_em), 'YYYY-MM') AS mes,
              coalesce(sum(centavos_total), 0)::int AS total
         FROM portal_fatura
        WHERE status = 'PAGA' AND paga_em >= ${desde}
        GROUP BY 1`),
    query<{ mes: string; total: number }>(
      `SELECT to_char(date_trunc('month', criado_em), 'YYYY-MM') AS mes,
              coalesce(sum(centavos), 0)::int AS total
         FROM reembolso
        WHERE criado_em >= ${desde}
        GROUP BY 1`),
  ]);

  // Todos os meses da janela, inclusive os sem movimento: um mês que some
  // da tabela parece erro de consulta, não mês parado.
  const linhas: ReceitaDoMes[] = [];
  const agora = new Date();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const v = vendas.find((x) => x.mes === mes);
    const f = faturas.find((x) => x.mes === mes);
    const r = reembolsos.find((x) => x.mes === mes);
    const linha = {
      mes,
      vendasPlataforma: v?.plataforma ?? 0,
      vendasPortais: v?.portais ?? 0,
      retidoPortais: v?.retido ?? 0,
      mensalidades: f?.total ?? 0,
      reembolsos: r?.total ?? 0,
    };
    linhas.push({
      ...linha,
      liquido: linha.vendasPlataforma + linha.retidoPortais + linha.mensalidades - linha.reembolsos,
    });
  }
  return linhas;
}

export interface FaturaEmAberto {
  id: number; portalId: number; portalNome: string; mascara: string; tipo: string;
  competencia: Date; centavosTotal: number; status: string; vencimento: Date | null;
}

/** Mensalidades de portal que ainda não foram pagas — vencidas primeiro. */
export function faturasEmAberto() {
  return query<FaturaEmAberto>(
    `SELECT f.id::int AS id, f.portal_id::int AS "portalId",
            p.nome_exibicao AS "portalNome", p.mascara, p.tipo,
            f.competencia, f.centavos_total AS "centavosTotal", f.status, f.vencimento
       FROM portal_fatura f JOIN portal p ON p.id = f.portal_id
      WHERE f.status IN ('FECHADA', 'EM_ATRASO')
      ORDER BY (f.status = 'EM_ATRASO') DESC, f.vencimento NULLS LAST, f.competencia`,
  );
}

export interface PedidoRecente {
  id: number; referencia: string; pagoEm: Date | null; criadoEm: Date; status: string;
  centavos: number; escopo: string; materiaNome: string | null;
  alunoId: number; alunoNome: string; alunoEmail: string;
  portalId: number; portalNome: string | null;
  /** O que é nosso nesta venda: tudo na plataforma, o retido no portal. */
  nossaParte: number;
}

/** As últimas vendas, de todo portal, com o que ficou conosco em cada uma. */
export function pedidosRecentes(limite = 40) {
  return query<PedidoRecente>(
    `SELECT p.id::int AS id, p.referencia, p.pago_em AS "pagoEm", p.criado_em AS "criadoEm",
            p.status, p.centavos, p.escopo, m.nome AS "materiaNome",
            u.id::int AS "alunoId", u.nome AS "alunoNome", u.email AS "alunoEmail",
            p.portal_id::int AS "portalId", pt.nome_exibicao AS "portalNome",
            CASE WHEN p.portal_id = 0 THEN p.centavos
                 ELSE round(p.centavos * coalesce(p.percentual_aplicado, 0) / 100)::int END AS "nossaParte"
       FROM pedido p
       JOIN usuario u ON u.id = p.usuario_id
       LEFT JOIN materia m ON m.id = p.materia_id
       LEFT JOIN portal pt ON pt.id = p.portal_id AND pt.id <> 0
      ORDER BY coalesce(p.pago_em, p.criado_em) DESC, p.id DESC
      LIMIT $1`,
    [limite],
  );
}

export interface ReembolsoRecente {
  id: number; protocolo: string; centavos: number; motivo: string; criadoEm: Date;
  solicitadoPor: string; referencia: string; alunoNome: string; portalId: number;
}

export function reembolsosRecentes(limite = 20) {
  return query<ReembolsoRecente>(
    `SELECT r.id::int AS id, r.protocolo, r.centavos, r.motivo, r.criado_em AS "criadoEm",
            r.solicitado_por AS "solicitadoPor", p.referencia, u.nome AS "alunoNome",
            p.portal_id::int AS "portalId"
       FROM reembolso r
       JOIN pedido p ON p.id = r.pedido_id
       JOIN usuario u ON u.id = p.usuario_id
      ORDER BY r.criado_em DESC LIMIT $1`,
    [limite],
  );
}

export interface TotaisFinanceiros {
  pedidosAbertos: number;
  centavosAbertos: number;
  faturasEmAtraso: number;
  centavosFaturasAbertas: number;
  apuracoesAguardando: number;
  centavosApuracoesAprovadas: number;
}

/** Os números do topo da tela: o que está esperando alguém. */
export async function totaisFinanceiros(): Promise<TotaisFinanceiros> {
  const [t] = await query<TotaisFinanceiros>(
    `SELECT
       (SELECT count(*)::int FROM pedido WHERE status = 'ABERTO' AND expira_em > now()) AS "pedidosAbertos",
       (SELECT coalesce(sum(centavos), 0)::int FROM pedido WHERE status = 'ABERTO' AND expira_em > now()) AS "centavosAbertos",
       (SELECT count(*)::int FROM portal_fatura WHERE status = 'EM_ATRASO') AS "faturasEmAtraso",
       (SELECT coalesce(sum(centavos_total), 0)::int FROM portal_fatura WHERE status IN ('FECHADA', 'EM_ATRASO')) AS "centavosFaturasAbertas",
       (SELECT count(*)::int FROM apuracao WHERE status IN ('EM_CONFERENCIA', 'CONTESTADA', 'APROVADA')) AS "apuracoesAguardando",
       (SELECT coalesce(sum(centavos_comissao), 0)::int FROM apuracao WHERE status = 'APROVADA') AS "centavosApuracoesAprovadas"`,
  );
  return t;
}
