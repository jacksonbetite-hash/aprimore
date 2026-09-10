import { stat } from 'node:fs/promises';
import path from 'node:path';
import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { provedorAtual, novaReferencia, type MeioPagamento } from './pagamento.ts';
import { PORTAL_PLATAFORMA, calcularExcedente, competenciaDe } from './portal.ts';

/**
 * Financeiro do portal — etapa 4 do §5.10.2.
 *
 * Quatro assuntos, um arquivo, porque todos desembocam na mesma fatura:
 *
 *   consumo   → o que o portal usou de vídeo no mês (armazenado, trafegado)
 *   extrato   → cada venda, com o percentual que ficou conosco
 *   fatura    → licença + excedente + ajustes, cobrada pelo mesmo webhook
 *               da 1ª mensalidade (referência PF-)
 *   régua     → fatura vencida vira EM_ATRASO; passada a carência, o
 *               portal SUSPENDE (§5.10: visitante não vê, aluno com
 *               licença vigente continua)
 *
 * O número usado fica gravado (§5.10): a fatura guarda o consumo e o
 * cálculo do excedente em `detalhe`, para ninguém precisar recalcular
 * uma fatura de dois anos atrás com a cota de hoje.
 */

// ---------------------------------------------------------------------
// Consumo
// ---------------------------------------------------------------------

/** Soma bytes entregues ao portal na competência corrente. */
export async function registrarTrafego(portalId: number, bytes: number, quando = new Date()) {
  if (portalId === PORTAL_PLATAFORMA || bytes <= 0) return;
  await query(
    `INSERT INTO portal_consumo (portal_id, competencia, bytes_trafegados)
     VALUES ($1, $2, $3)
     ON CONFLICT (portal_id, competencia) DO UPDATE
        SET bytes_trafegados = portal_consumo.bytes_trafegados + EXCLUDED.bytes_trafegados,
            medido_em = now()`,
    [portalId, competenciaDe(quando), Math.round(bytes)],
  );
}

/**
 * Chamada pela rota de vídeo a cada faixa servida. Nunca lança: contar
 * banda é faturamento, mas derrubar a aula do aluno por causa disso seria
 * cobrar caro por um número. Falha vira banda não contada — a nosso favor
 * do professor, nunca contra ele.
 */
export async function contabilizarTrafego(videoId: string, bytes: number) {
  try {
    const aula = await queryOne<{ portalId: number }>(
      `SELECT portal_id AS "portalId" FROM aula
        WHERE video_provedor = 'LOCAL' AND video_id = $1 LIMIT 1`,
      [videoId],
    );
    if (aula) await registrarTrafego(aula.portalId, bytes);
  } catch (err) {
    console.error('trafego não contabilizado', videoId, err);
  }
}

/**
 * Mede o que o portal ocupa em disco: vídeos locais (tamanho real do
 * arquivo), materiais de apoio e o acervo da Biblioteca da empresa
 * (db/042). Grava o total da competência corrente — armazenamento é
 * foto, não soma: mede-se o que está lá agora.
 */
export async function medirArmazenamento(
  portalId: number, raiz = process.env.VIDEO_RAIZ ?? './midia/video', quando = new Date(),
) {
  const videos = await query<{ id: string }>(
    `SELECT video_id AS id FROM aula
      WHERE portal_id = $1 AND video_provedor = 'LOCAL' AND video_id IS NOT NULL`,
    [portalId],
  );
  let bytes = 0;
  for (const v of videos) {
    try {
      const info = await stat(path.resolve(raiz, v.id));
      if (info.isFile()) bytes += info.size;
    } catch { /* arquivo ausente não ocupa nada */ }
  }
  const materiais = await queryOne<{ total: string }>(
    `SELECT coalesce(sum(ma.bytes), 0)::text AS total
       FROM material_apoio ma JOIN aula a ON a.id = ma.aula_id
      WHERE a.portal_id = $1`,
    [portalId],
  );
  bytes += Number(materiais?.total ?? 0);

  /* O PDF da Biblioteca vive no mesmo volume que o vídeo e pesa como
     ele. Sem esta soma, uma empresa poderia encher o disco com acervo
     sem que um byte aparecesse na fatura — e a cota de GB do plano
     (§5.11) deixaria de significar o que promete. O tamanho vem da
     coluna, e não de um `stat` por arquivo: ele é gravado no envio, e
     percorrer o diretório a cada medição custaria uma ida ao disco por
     item para chegar ao mesmo número. */
  const acervo = await queryOne<{ total: string }>(
    `SELECT coalesce(sum(bytes), 0)::text AS total FROM acervo WHERE portal_id = $1`,
    [portalId],
  );
  bytes += Number(acervo?.total ?? 0);

  await query(
    `INSERT INTO portal_consumo (portal_id, competencia, bytes_armazenados)
     VALUES ($1, $2, $3)
     ON CONFLICT (portal_id, competencia) DO UPDATE
        SET bytes_armazenados = EXCLUDED.bytes_armazenados, medido_em = now()`,
    [portalId, competenciaDe(quando), bytes],
  );
  return bytes;
}

export interface Consumo { bytesArmazenados: number; bytesTrafegados: number; medidoEm: Date | null }

export async function consumoDaCompetencia(portalId: number, competencia: string): Promise<Consumo> {
  const c = await queryOne<{ arm: string; traf: string; em: Date }>(
    `SELECT bytes_armazenados::text AS arm, bytes_trafegados::text AS traf, medido_em AS em
       FROM portal_consumo WHERE portal_id = $1 AND competencia = $2`,
    [portalId, competencia],
  );
  return {
    bytesArmazenados: Number(c?.arm ?? 0),
    bytesTrafegados: Number(c?.traf ?? 0),
    medidoEm: c?.em ?? null,
  };
}

// ---------------------------------------------------------------------
// Extrato
// ---------------------------------------------------------------------

export interface LinhaExtrato {
  referencia: string; pagoEm: Date | null; status: string;
  alunoNome: string; alunoEmail: string; escopo: string; materiaNome: string | null;
  centavos: number; percentual: string | null; retido: number; indicado: boolean;
}

/**
 * Venda a venda, com o percentual que ficou conosco em cada uma. É o
 * extrato que o §5.10 promete ao professor: transparência é o que
 * sustenta a cobrança do acréscimo por indicação (§5.10.1).
 */
export function extratoDoPortal(portalId: number, limite = 200) {
  return query<LinhaExtrato>(
    `SELECT p.referencia, p.pago_em AS "pagoEm", p.status,
            u.nome AS "alunoNome", u.email AS "alunoEmail",
            p.escopo, m.nome AS "materiaNome", p.centavos,
            p.percentual_aplicado AS percentual,
            round(p.centavos * coalesce(p.percentual_aplicado, 0) / 100)::int AS retido,
            (p.indicacao_id IS NOT NULL) AS indicado
       FROM pedido p
       JOIN usuario u ON u.id = p.usuario_id
       LEFT JOIN materia m ON m.id = p.materia_id
      WHERE p.portal_id = $1 AND p.status IN ('PAGO', 'REEMBOLSADO')
      ORDER BY p.pago_em DESC NULLS LAST, p.id DESC
      LIMIT $2`,
    [portalId, limite],
  );
}

export async function totaisDoExtrato(portalId: number) {
  const t = await queryOne<{ vendido: number; retido: number; reembolsado: number; vendas: number }>(
    `SELECT coalesce(sum(centavos) FILTER (WHERE status = 'PAGO'), 0)::int AS vendido,
            coalesce(sum(round(centavos * coalesce(percentual_aplicado, 0) / 100))
                     FILTER (WHERE status = 'PAGO'), 0)::int AS retido,
            coalesce(sum(centavos) FILTER (WHERE status = 'REEMBOLSADO'), 0)::int AS reembolsado,
            count(*) FILTER (WHERE status = 'PAGO')::int AS vendas
       FROM pedido WHERE portal_id = $1`,
    [portalId],
  );
  return t ?? { vendido: 0, retido: 0, reembolsado: 0, vendas: 0 };
}

export interface VendaNaVitrine {
  referencia: string; pagoEm: Date | null; status: string;
  materiaNome: string | null; centavos: number; comissao: string | null; aReceber: number;
}

/**
 * Vendas NOSSAS de cursos deste portal (§5.10.2, etapa 5): a comissão do
 * professor, venda a venda, pela regra do §5.6.1. Entra na apuração
 * mensal dele — aqui é o extrato que sustenta o número.
 */
export function vendasNaVitrine(portalId: number, limite = 200) {
  return query<VendaNaVitrine>(
    `SELECT p.referencia, p.pago_em AS "pagoEm", p.status, m.nome AS "materiaNome",
            p.centavos, p.comissao_professor_pp AS comissao,
            round(p.centavos * coalesce(p.comissao_professor_pp, 0) / 100)::int AS "aReceber"
       FROM pedido p
       LEFT JOIN materia m ON m.id = p.materia_id
      WHERE p.materia_portal_id = $1 AND p.portal_id = 0
        AND p.status IN ('PAGO', 'REEMBOLSADO')
      ORDER BY p.pago_em DESC NULLS LAST, p.id DESC
      LIMIT $2`,
    [portalId, limite],
  );
}

// ---------------------------------------------------------------------
// Fatura mensal
// ---------------------------------------------------------------------

export interface Ajuste { centavos: number; motivo: string }

export interface FaturaPortal {
  id: number; competencia: Date; status: string; referencia: string | null;
  centavosLicenca: number; centavosExcedente: number; centavosAjustes: number; centavosTotal: number;
  vencimento: Date | null; pagaEm: Date | null; fechadaEm: Date | null;
  detalhe: Record<string, unknown> | null;
}

export function listarFaturas(portalId: number) {
  return query<FaturaPortal>(
    `SELECT id, competencia, status, referencia,
            centavos_licenca AS "centavosLicenca", centavos_excedente AS "centavosExcedente",
            centavos_ajustes AS "centavosAjustes", centavos_total AS "centavosTotal",
            vencimento, paga_em AS "pagaEm", fechada_em AS "fechadaEm", detalhe
       FROM portal_fatura WHERE portal_id = $1
      ORDER BY competencia DESC`,
    [portalId],
  );
}

/**
 * Fecha a competência: licença do contrato + excedente do consumo medido
 * + ajustes manuais (reembolso que a escrow não cobriu, chargeback,
 * desconto negociado). Nasce FECHADA, com cobrança no gateway, e é paga
 * pelo mesmo webhook da 1ª mensalidade.
 *
 * Total zero ou negativo não gera cobrança: nasce PAGA, com o detalhe
 * explicando — cobrar R$ 0 é ruído para o professor e para o gateway.
 */
export async function fecharFatura(
  ator: string, portalId: number, competencia: string,
  ajustes: Ajuste[] = [], meio: MeioPagamento = 'PIX',
) {
  if (!/^\d{4}-\d{2}-01$/.test(competencia)) throw new Error('competência inválida (use o dia 1 do mês)');
  if (competencia > competenciaDe(new Date())) throw new Error('não se fecha mês que ainda não começou');
  for (const a of ajustes) {
    if (!Number.isInteger(a.centavos)) throw new Error('ajuste com valor inválido');
    if (!a.motivo.trim()) throw new Error('todo ajuste precisa de motivo — é o que o professor vai ler');
  }

  const base = await queryOne<{
    licenca: number; gbArmazenamento: number; gbBandaMes: number; centavosPorGbExcedente: number;
    contratoId: number; email: string | null; nome: string; status: string;
    documento: string | null; nomeResponsavel: string | null;
    dominio: string | null; dominioVerificadoEm: Date | null; centavosDominio: number | null;
  }>(
    `SELECT c.id AS "contratoId", c.licenca_mensal_centavos AS licenca,
            pl.gb_armazenamento AS "gbArmazenamento", pl.gb_banda_mes AS "gbBandaMes",
            pl.centavos_por_gb_excedente AS "centavosPorGbExcedente",
            p.responsavel_email AS email, p.nome_exibicao AS nome, p.status,
            p.responsavel_doc AS documento, p.responsavel_nome AS "nomeResponsavel",
            p.dominio_proprio AS dominio, p.dominio_verificado_em AS "dominioVerificadoEm",
            pl.centavos_dominio_proprio AS "centavosDominio"
       FROM portal p
       JOIN portal_contrato c ON c.portal_id = p.id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL
       JOIN portal_plano pl ON pl.id = c.plano_id
      WHERE p.id = $1`,
    [portalId],
  );
  if (!base) throw new Error('portal sem contrato vigente aceito — nada a faturar');
  if (base.status === 'ENCERRADO') throw new Error('portal encerrado não recebe fatura nova');

  const existente = await queryOne<{ id: number }>(
    `SELECT id FROM portal_fatura WHERE portal_id = $1 AND competencia = $2`, [portalId, competencia]);
  if (existente) throw new Error(`a competência ${competencia.slice(0, 7)} já está fechada`);

  // Domínio próprio (Fase 2): linha da fatura só depois de VERIFICADO —
  // cobrar por um domínio que ainda não responde seria cobrar por nada.
  if (base.dominio && base.dominioVerificadoEm && base.centavosDominio) {
    ajustes = [...ajustes, { centavos: base.centavosDominio, motivo: `Domínio próprio (${base.dominio})` }];
  }

  const consumo = await consumoDaCompetencia(portalId, competencia);
  const excedente = calcularExcedente(consumo.bytesArmazenados, consumo.bytesTrafegados, base);
  const centavosAjustes = ajustes.reduce((t, a) => t + a.centavos, 0);
  const total = base.licenca + excedente.centavos + centavosAjustes;

  const detalhe = {
    meio, ajustes, consumo,
    gbExcedentes: excedente.gbExcedentes,
    cotas: { gbArmazenamento: base.gbArmazenamento, gbBandaMes: base.gbBandaMes },
  };

  if (total <= 0) {
    return emTransacao(async (exec) => {
      const [f] = await exec<{ id: number }>(
        `INSERT INTO portal_fatura
           (portal_id, contrato_id, competencia, centavos_licenca, centavos_excedente,
            centavos_ajustes, centavos_total, status, detalhe, fechada_em, paga_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PAGA', $8, now(), now()) RETURNING id`,
        [portalId, base.contratoId, competencia, base.licenca, excedente.centavos,
         centavosAjustes, total, JSON.stringify({ ...detalhe, semCobranca: 'total não positivo' })],
      );
      await auditar(exec, ator, 'portal_fatura.fechada', 'portal_fatura', f.id,
        { portalId, competencia, total, semCobranca: true });
      return { faturaId: f.id, referencia: null as string | null, centavosTotal: total };
    });
  }

  const referencia = novaReferencia('PF');
  const provedor = provedorAtual();
  const cobranca = await provedor.criarCobranca({
    referencia, centavos: total, meio,
    emailPagador: base.email ?? '',
    documentoPagador: base.documento, nomePagador: base.nomeResponsavel ?? base.nome,
    descricao: `Portal do Professor — ${competencia.slice(0, 7)} (${base.nome})`,
  });

  return emTransacao(async (exec) => {
    const [f] = await exec<{ id: number }>(
      `INSERT INTO portal_fatura
         (portal_id, contrato_id, competencia, centavos_licenca, centavos_excedente,
          centavos_ajustes, centavos_total, status, vencimento, referencia,
          cobranca_externa_id, detalhe, fechada_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'FECHADA', current_date + 7, $8, $9, $10, now())
       RETURNING id`,
      [portalId, base.contratoId, competencia, base.licenca, excedente.centavos,
       centavosAjustes, total, referencia, cobranca.idExterno,
       JSON.stringify({ ...detalhe, provedor: provedor.nome,
                        copiaECola: cobranca.copiaECola ?? null,
                        linkPagamento: cobranca.linkPagamento ?? null })],
    );
    await auditar(exec, ator, 'portal_fatura.fechada', 'portal_fatura', f.id,
      { portalId, competencia, licenca: base.licenca, excedente: excedente.centavos,
        ajustes: centavosAjustes, total, referencia });
    return { faturaId: f.id, referencia: referencia as string | null, centavosTotal: total };
  });
}

// ---------------------------------------------------------------------
// Régua de inadimplência (§5.10)
// ---------------------------------------------------------------------

/**
 * Vencida → EM_ATRASO. Vencida há mais que a carência → o portal SUSPENDE.
 * A exceção do aluno (licença vigente continua) não mora aqui — mora em
 * `buscarPortalPorMascara`, que segue resolvendo SUSPENSO, e nas páginas
 * públicas, que escondem o catálogo do visitante.
 */
export async function suspenderInadimplentes(ator: string, hoje = new Date(), carenciaDias = 10) {
  const dia = hoje.toISOString().slice(0, 10);
  return emTransacao(async (exec) => {
    await exec(
      `UPDATE portal_fatura SET status = 'EM_ATRASO'
        WHERE status = 'FECHADA' AND vencimento < $1::date`,
      [dia],
    );
    const suspensos = await exec<{ portalId: number; mascara: string; faturaId: number }>(
      `UPDATE portal p
          SET status = 'SUSPENSO', suspenso_em = now()
         FROM portal_fatura f
        WHERE f.portal_id = p.id AND p.status = 'ATIVO'
          AND f.status = 'EM_ATRASO'
          AND f.vencimento < ($1::date - ($2 || ' days')::interval)
        RETURNING p.id::int AS "portalId", p.mascara, f.id::int AS "faturaId"`,
      [dia, String(carenciaDias)],
    );
    for (const s of suspensos) {
      await auditar(exec, ator, 'portal.suspenso_inadimplencia', 'portal', s.portalId,
        { faturaId: s.faturaId, carenciaDias });
    }
    return suspensos;
  });
}

// ---------------------------------------------------------------------
// Alunos do portal
// ---------------------------------------------------------------------

export interface AlunoDoPortal {
  id: number; nome: string; email: string; statusConta: string;
  criadoEm: Date; ultimoLoginEm: Date | null;
  licencasAtivas: number; gastoCentavos: number;
}

/**
 * A base do portal é do PROFESSOR (§5.10, LGPD: ele é o controlador). O
 * admin da plataforma lê para dar suporte — e a tela diz isso.
 */
export function alunosDoPortal(portalId: number, busca = '', limite = 100) {
  return query<AlunoDoPortal>(
    `SELECT u.id, u.nome, u.email, u.status_conta AS "statusConta",
            u.criado_em AS "criadoEm", u.ultimo_login_em AS "ultimoLoginEm",
            (SELECT count(*)::int FROM licenca l
              WHERE l.usuario_id = u.id AND l.status = 'ATIVA'
                AND now() BETWEEN l.inicio_em AND l.fim_em) AS "licencasAtivas",
            (SELECT coalesce(sum(p.centavos), 0)::int FROM pedido p
              WHERE p.usuario_id = u.id AND p.status = 'PAGO') AS "gastoCentavos"
       FROM usuario u
      WHERE u.portal_id = $1 AND u.papel = 'aluno'
        AND ($2 = '' OR u.nome ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')
      ORDER BY u.criado_em DESC
      LIMIT $3`,
    [portalId, busca.trim(), limite],
  );
}

export interface LicencaDoPortal {
  id: number; alunoNome: string; alunoEmail: string; escopo: string;
  materiaNome: string | null; origem: string; status: string;
  inicioEm: Date; fimEm: Date; vigente: boolean;
}

export function licencasDoPortal(portalId: number, limite = 200) {
  return query<LicencaDoPortal>(
    `SELECT l.id, u.nome AS "alunoNome", u.email AS "alunoEmail", l.escopo,
            m.nome AS "materiaNome", l.origem, l.status,
            l.inicio_em AS "inicioEm", l.fim_em AS "fimEm",
            (l.status = 'ATIVA' AND now() BETWEEN l.inicio_em AND l.fim_em) AS vigente
       FROM licenca l
       JOIN usuario u ON u.id = l.usuario_id
       LEFT JOIN materia m ON m.id = l.materia_id
      WHERE l.portal_id = $1
      ORDER BY l.criada_em DESC LIMIT $2`,
    [portalId, limite],
  );
}
