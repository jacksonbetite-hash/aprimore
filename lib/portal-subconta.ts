import { queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { provedorAtual, type EventoPagamento, type DadosSubconta } from './pagamento.ts';

/**
 * Subconta do professor no gateway — etapa 2 do §5.10.2.
 *
 * A sequência que este módulo cobre:
 *
 *   portal ATIVO ──► abrirSubconta ──► EM_ANALISE
 *                                        │ webhook do gateway
 *                    APROVADA ◄──────────┤
 *                       │                └──► RECUSADA (suporte)
 *                       └─► Conta Escrow habilitada com o
 *                           dias_retencao do contrato
 *
 * Só então o portal VENDE (a trava mora em lib/checkout.ts). Antes disso,
 * uma venda mandaria a parte do professor para o nosso caixa — e nós
 * viraríamos devedores dele no dia seguinte.
 */

/** Erro padrão da trava de venda; a tela do portal mostra este texto. */
export const MOTIVO_SEM_SUBCONTA =
  'Este portal ainda não está habilitado a vender: a conta de recebimento '
  + 'do professor está em análise no meio de pagamento.';

/**
 * Abre a subconta do portal no gateway. Idempotente: se já foi pedida
 * (situação diferente de PENDENTE), devolve o que existe e não cria de
 * novo — o webhook de reativação chama isto sem medo.
 */
export async function abrirSubconta(portalId: number) {
  const portal = await queryOne<{
    id: number; tipo: string; situacao: string; nome: string | null;
    email: string | null; cnpj: string | null;
    telefone: string | null; renda: number | null;
    endereco: DadosSubconta['endereco'];
  }>(
    `SELECT id, tipo, subconta_situacao AS situacao, responsavel_nome AS nome,
            responsavel_email AS email, responsavel_doc AS cnpj,
            responsavel_telefone AS telefone, responsavel_renda_centavos AS renda,
            responsavel_endereco AS endereco
       FROM portal WHERE id = $1 AND id <> 0`,
    [portalId],
  );
  if (!portal) throw new Error('portal não encontrado');
  // §5.11 — a empresa PAGA, não recebe: não há split, não há escrow e
  // não há subconta. A recusa mora aqui, na fonte, e não só em quem
  // chama: o webhook abre a subconta de todo portal que ativa, e uma
  // subconta aberta em nome de um cliente que nunca vai vender é KYC
  // pedido à toa e uma vaga a menos no teto regulatório do §8.2.
  if (portal.tipo === 'EMPRESA') return { situacao: portal.situacao, criada: false };
  if (portal.situacao !== 'PENDENTE') return { situacao: portal.situacao, criada: false };
  if (!portal.cnpj || !portal.email) {
    throw new Error('o portal não tem CNPJ e e-mail do responsável — sem eles não há subconta');
  }

  const provedor = provedorAtual();
  const sub = await provedor.criarSubconta({
    nome: portal.nome ?? '', email: portal.email, cnpj: portal.cnpj,
    telefone: portal.telefone, rendaMensalCentavos: portal.renda, endereco: portal.endereco,
  });

  await emTransacao(async (exec) => {
    await exec(
      `UPDATE portal
          SET gateway_subconta_id = $2, gateway_wallet_id = $3,
              subconta_situacao = 'EM_ANALISE'
        WHERE id = $1 AND subconta_situacao = 'PENDENTE'`,
      [portalId, sub.idExterno, sub.walletId],
    );
    await auditar(exec, `gateway:${provedor.nome}`, 'subconta.criada', 'portal', portalId,
      { subcontaId: sub.idExterno });
  });
  return { situacao: 'EM_ANALISE' as const, criada: true, subcontaId: sub.idExterno };
}

export type ResultadoSubconta =
  | { ok: true; portalId: number; situacao: 'APROVADA' | 'RECUSADA'; jaProcessado: boolean }
  | { ok: false; motivo: string };

/**
 * Webhook de aprovação/recusa — mesmo desenho idempotente do §8.3.
 * `evento.referencia` carrega o id da subconta no gateway.
 *
 * Na aprovação, a Conta Escrow é habilitada NA MESMA passada, com o
 * `dias_retencao` do contrato vigente: subconta aprovada sem escrow é
 * exatamente a janela em que o professor saca antes do prazo do CDC.
 */
export async function processarEventoSubconta(
  evento: EventoPagamento, provedorNome: string, corpo: unknown,
): Promise<ResultadoSubconta> {
  const aprovada = evento.tipo === 'subconta.aprovada';

  return emTransacao(async (exec) => {
    const [registrado] = await exec<{ id: number }>(
      `INSERT INTO evento_gateway (provedor, evento_id, tipo, corpo)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provedor, evento_id) DO NOTHING
       RETURNING id`,
      [provedorNome, evento.eventoId, evento.tipo, JSON.stringify(corpo)],
    );
    if (!registrado) {
      const [p] = await exec<{ id: number; situacao: 'APROVADA' | 'RECUSADA' }>(
        `SELECT id, subconta_situacao AS situacao FROM portal
          WHERE gateway_subconta_id = $1`, [evento.referencia],
      );
      return p
        ? { ok: true as const, portalId: p.id, situacao: p.situacao, jaProcessado: true }
        : { ok: false as const, motivo: 'subconta desconhecida' };
    }

    const [portal] = await exec<{ id: number; diasRetencao: number | null }>(
      `SELECT p.id, c.dias_retencao AS "diasRetencao"
         FROM portal p
         LEFT JOIN portal_contrato c
                ON c.portal_id = p.id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL
        WHERE p.gateway_subconta_id = $1 AND p.subconta_situacao = 'EM_ANALISE'
        FOR UPDATE OF p`,
      [evento.referencia],
    );
    if (!portal) {
      await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = $2
                   WHERE id = $1`, [registrado.id, 'subconta desconhecida ou já resolvida']);
      return { ok: false as const, motivo: 'subconta desconhecida ou já resolvida' };
    }

    if (!aprovada) {
      await exec(`UPDATE portal SET subconta_situacao = 'RECUSADA' WHERE id = $1`, [portal.id]);
      await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = 'subconta recusada'
                   WHERE id = $1`, [registrado.id]);
      await auditar(exec, `gateway:${provedorNome}`, 'subconta.recusada', 'portal', portal.id,
        { subcontaId: evento.referencia });
      return { ok: true as const, portalId: portal.id, situacao: 'RECUSADA', jaProcessado: false };
    }

    // O prazo sai do contrato; sem contrato vigente aceito não há o que
    // habilitar — e é melhor falhar aqui do que reter com prazo inventado.
    const dias = portal.diasRetencao;
    if (dias === null) throw new Error(`portal ${portal.id} aprovado sem contrato vigente`);
    await provedorAtual().habilitarEscrow(evento.referencia, dias);

    await exec(
      `UPDATE portal
          SET subconta_situacao = 'APROVADA', escrow_dias = $2, escrow_habilitada_em = now()
        WHERE id = $1`,
      [portal.id, dias],
    );
    await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = $2 WHERE id = $1`,
      [registrado.id, `subconta aprovada, escrow ${dias} dias`]);
    await auditar(exec, `gateway:${provedorNome}`, 'subconta.aprovada', 'portal', portal.id,
      { subcontaId: evento.referencia, escrowDias: dias });

    return { ok: true as const, portalId: portal.id, situacao: 'APROVADA', jaProcessado: false };
  });
}
