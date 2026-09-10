import { pool, query, queryOne } from './db.ts';
import { validarCpf, somenteDigitos } from './portal.ts';
import {
  provedorAtual, novaReferencia, novoProtocolo, MESES_DO_PERIODO,
  type MeioPagamento, type EventoPagamento,
} from './pagamento.ts';
import type { Periodo, Produto } from './precos.ts';
import { MOTIVO_SEM_SUBCONTA } from './portal-subconta.ts';
import { indicacaoViva, consumirIndicacao } from './portal-indicacao.ts';

/**
 * Checkout — §8 do discovery.
 *
 * Tudo o que cria licença passa por transação: ou o pedido vira pago,
 * a assinatura nasce e a licença é emitida juntos, ou nada acontece.
 * Pedido pago pela metade é o pior estado possível num sistema de
 * assinatura — o aluno paga e não estuda.
 */

async function emTransacao<T>(fn: (exec: typeof query) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  const exec = (async (sql: string, params: unknown[] = []) =>
    (await cliente.query(sql, params)).rows) as typeof query;
  try {
    await cliente.query('BEGIN');
    const r = await fn(exec);
    await cliente.query('COMMIT');
    return r;
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

function auditar(exec: typeof query, ator: string, acao: string, entidade: string,
                 id: number | null, detalhe: unknown) {
  return exec(
    `INSERT INTO log_auditoria (ator, acao, entidade, entidade_id, detalhe)
     VALUES ($1, $2, $3, $4, $5)`,
    [ator, acao, entidade, id, JSON.stringify(detalhe)],
  );
}

export interface PedidoCriado {
  id: number; referencia: string; centavos: number;
  copiaECola?: string; instrucao: string; expiraEm: Date; meio: MeioPagamento;
}

/**
 * Abre um pedido e cria a cobrança no gateway.
 *
 * `portalId` (§5.10) decide de quem é a venda: preço, matéria e aluno têm
 * de ser todos do mesmo portal. As chaves compostas de `db/018_portal.sql`
 * recusariam a combinação errada de qualquer forma, mas errar aqui daria
 * um erro de banco no meio do checkout — e o aluno já teria visto o Pix.
 */
/**
 * db/047 — a compra de VAGAS por uma empresa: `quantidade` multiplica o
 * preço (ou `centavosTotal` o substitui, quando veio de um orçamento), e
 * `empresaPortalId` diz para quem o lote nasce no pagamento. O pedido
 * continua sendo venda da plataforma (portal 0) feita pelo gestor.
 */
export interface OpcoesDeEmpresa {
  quantidade: number;
  empresaPortalId: number;
  centavosTotal?: number;
}

export async function abrirPedido(
  portalId: number, usuarioId: number, email: string, produto: Produto, periodo: Periodo,
  materiaId: number | null, meio: MeioPagamento, empresa?: OpcoesDeEmpresa,
): Promise<PedidoCriado> {
  if (produto === 'MATERIA' && materiaId === null) throw new Error('escolha a matéria');
  if (produto === 'CATALOGO') materiaId = null;
  // BIGINT chega como string de quem leu o id do banco; a comparação
  // "de quem é o curso" abaixo precisa de número dos dois lados.
  portalId = Number(portalId);
  if (empresa) {
    if (portalId !== 0) throw new Error('a compra de vagas é feita na plataforma');
    if (!Number.isInteger(empresa.quantidade) || empresa.quantidade < 1) throw new Error('quantidade de vagas inválida');
    if (produto !== 'MATERIA') throw new Error('a empresa compra vagas de um curso');
  }

  const precoUnitario = await queryOne<{ centavos: number }>(
    `SELECT centavos FROM preco
      WHERE portal_id = $1 AND produto = $2 AND periodo = $3
        AND vigente_ate IS NULL AND vigente_de <= current_date`,
    [portalId, produto, periodo],
  );
  if (!precoUnitario) throw new Error('não há preço vigente para este produto');
  const preco = {
    centavos: empresa
      ? (empresa.centavosTotal ?? precoUnitario.centavos * empresa.quantidade)
      : precoUnitario.centavos,
  };

  // §5.10.2, etapa 5 — a matéria é do portal do aluno, OU é de um
  // parceiro que a pôs na nossa vitrine e o comprador é da plataforma.
  // Portal de professor nunca vende curso de outro (o CHECK do banco
  // recusaria de qualquer forma; aqui a mensagem é humana).
  const materia = materiaId
    ? await queryOne<{
        nome: string; portalId: number; portalStatus: string; comissao: string | null;
        professorId: number | null; comissaoProfessor: string | null;
      }>(
        `SELECT m.nome, m.portal_id::int AS "portalId", p.status AS "portalStatus",
                c.comissao_vitrine_pp AS comissao,
                m.professor_id::int AS "professorId", cp.comissao_pp AS "comissaoProfessor"
           FROM materia m
           JOIN portal p ON p.id = m.portal_id
           LEFT JOIN portal_contrato c
                  ON c.portal_id = m.portal_id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL
           LEFT JOIN contrato_professor cp
                  ON cp.usuario_id = m.professor_id AND cp.vigente_ate IS NULL AND cp.aceito_em IS NOT NULL
          WHERE m.id = $1
            AND (m.portal_id = $2
                 OR ($2 = 0 AND m.na_vitrine_plataforma AND m.status = 'publicado'))`,
        [materiaId, portalId],
      )
    : null;
  if (materiaId && !materia) throw new Error('matéria não encontrada');
  const nomeMateria = materia?.nome ?? null;
  const materiaPortalId = materia?.portalId ?? portalId;

  // Venda NOSSA de curso de parceiro: o professor recebe comissão pela
  // regra do §5.6.1 — gravada no ato, como o percentual do split.
  let comissaoProfessorPp: number | null = null;
  if (materia && materiaPortalId !== portalId) {
    if (materia.portalStatus !== 'ATIVO') throw new Error('este curso não está à venda no momento');
    if (materia.comissao === null) throw new Error('o portal deste curso está sem contrato vigente');
    comissaoProfessorPp = Number(materia.comissao);
  }
  // Curso do catálogo assinado por um professor SEM portal (db/046): a
  // venda é nossa e ele recebe a comissão do contrato dele, gravada aqui.
  let professorId: number | null = null;
  if (materia?.professorId && portalId === 0 && materiaPortalId === 0) {
    if (materia.comissaoProfessor === null) throw new Error('este curso está sem contrato de professor vigente');
    comissaoProfessorPp = Number(materia.comissaoProfessor);
    professorId = materia.professorId;
  }

  // §5.10.2, etapa 2 — a trava: venda de portal só com a subconta do
  // professor APROVADA e a Conta Escrow ligada. Sem isso, a parte dele
  // cairia no nosso caixa e viraríamos devedores no dia seguinte. O
  // percentual retido sai do CONTRATO vigente e fica GRAVADO no pedido —
  // auditar uma venda antiga não pode depender do contrato de hoje.
  let split: { walletId: string; percentualRetido: number } | undefined;
  let percentualAplicado: number | null = null;
  let indicacaoId: number | null = null;
  if (portalId !== 0) {
    const venda = await queryOne<{
      status: string; situacao: string; escrowEm: Date | null; walletId: string | null;
      percentualBase: string | null; acrescimoPp: string | null;
    }>(
      `SELECT p.status, p.subconta_situacao AS situacao, p.escrow_habilitada_em AS "escrowEm",
              p.gateway_wallet_id AS "walletId", c.percentual_base AS "percentualBase",
              c.acrescimo_indicacao_pp AS "acrescimoPp"
         FROM portal p
         LEFT JOIN portal_contrato c
                ON c.portal_id = p.id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL
        WHERE p.id = $1`,
      [portalId],
    );
    if (!venda || venda.situacao !== 'APROVADA' || !venda.escrowEm || !venda.walletId) {
      throw new Error(MOTIVO_SEM_SUBCONTA);
    }
    // §5.10, inadimplência: portal suspenso não abre venda nova. Quem já
    // pagou continua assistindo; quem quer comprar espera o portal voltar.
    if (venda.status !== 'ATIVO') {
      throw new Error('Este portal está temporariamente sem vendas. Tente mais tarde.');
    }
    if (venda.percentualBase === null) {
      throw new Error('este portal está sem contrato vigente — fale com o suporte');
    }
    percentualAplicado = Number(venda.percentualBase);
    // §5.10.1: aluno que chegou pelo nosso anúncio paga base + acréscimo —
    // só na primeira compra. A indicação é RESERVADA aqui (o pedido aponta
    // para ela) e CONSUMIDA no pagamento: Pix abandonado não a gasta.
    indicacaoId = await indicacaoViva(query, usuarioId, portalId);
    if (indicacaoId) percentualAplicado += Number(venda.acrescimoPp ?? 0);
    split = { walletId: venda.walletId, percentualRetido: percentualAplicado };
  }

  // O gateway real exige o documento do pagador (§12.1: CPF pedido na
  // compra). Vai o que a conta tem; sem documento, o adaptador real recusa
  // com mensagem para o aluno — o simulado dispensa.
  const pagador = await queryOne<{ cpf: string | null; nome: string }>(
    `SELECT c.documento AS cpf, u.nome FROM usuario u JOIN conta c ON c.id = u.conta_id
      WHERE u.id = $1`, [usuarioId]);

  const referencia = novaReferencia();
  const provedor = provedorAtual();
  const cobranca = await provedor.criarCobranca({
    referencia, centavos: preco.centavos, meio, emailPagador: email,
    documentoPagador: pagador?.cpf ?? null, nomePagador: pagador?.nome ?? null,
    descricao: empresa
      ? `${empresa.quantidade} vaga(s) — ${nomeMateria}`
      : nomeMateria ? `Licença — ${nomeMateria}` : 'Passe completo',
    split,
  });

  return emTransacao(async (exec) => {
    const [p] = await exec<{ id: number }>(
      `INSERT INTO pedido (referencia, usuario_id, portal_id, escopo, materia_id, periodo,
                           centavos, meio, expira_em, percentual_aplicado, indicacao_id,
                           materia_portal_id, comissao_professor_pp, professor_id,
                           quantidade, empresa_portal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
      [referencia, usuarioId, portalId, produto, materiaId, periodo, preco.centavos, meio,
       cobranca.expiraEm, percentualAplicado, indicacaoId, materiaPortalId, comissaoProfessorPp,
       professorId, empresa?.quantidade ?? 1, empresa?.empresaPortalId ?? null],
    );
    await exec(
      `INSERT INTO pagamento (pedido_id, meio, centavos, detalhe)
       VALUES ($1, $2, $3, $4)`,
      [p.id, meio, preco.centavos,
       JSON.stringify({ idExterno: cobranca.idExterno, provedor: provedor.nome,
                        copiaECola: cobranca.copiaECola ?? null,
                        linkPagamento: cobranca.linkPagamento ?? null,
                        ...(split ? { split } : {}) })],
    );
    await auditar(exec, email, 'pedido.aberto', 'pedido', p.id,
      { referencia, produto, periodo, materiaId, meio, centavos: preco.centavos });
    return {
      id: p.id, referencia, centavos: preco.centavos, meio,
      copiaECola: cobranca.copiaECola, instrucao: cobranca.instrucao, expiraEm: cobranca.expiraEm,
    };
  });
}

export type ResultadoConfirmacao =
  | { ok: true; licencaId: number; jaProcessado: false }
  /** db/047 — compra de vagas por empresa: nasce um lote, não uma licença. */
  | { ok: true; licencaId: null; jaProcessado: false; loteId: number }
  | { ok: true; licencaId: number | null; jaProcessado: true }
  | { ok: false; motivo: string };

/**
 * Confirma o pagamento e emite a licença.
 *
 * IDEMPOTENTE (§8.3): "o mesmo evento pode chegar duas vezes — nunca
 * liberar duas licenças". A guarda é dupla: o índice único em
 * evento_gateway barra o evento repetido, e o UPDATE do pedido só
 * avança se ele ainda estiver ABERTO.
 */
export async function confirmarPagamento(
  evento: EventoPagamento, provedorNome: string, corpo: unknown,
): Promise<ResultadoConfirmacao> {
  return emTransacao(async (exec) => {
    const [registrado] = await exec<{ id: number }>(
      `INSERT INTO evento_gateway (provedor, evento_id, tipo, corpo)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provedor, evento_id) DO NOTHING
       RETURNING id`,
      [provedorNome, evento.eventoId, evento.tipo, JSON.stringify(corpo)],
    );
    if (!registrado) {
      // já vimos este evento: devolve sucesso sem emitir nada de novo
      const anterior = await exec<{ licencaId: number | null }>(
        `SELECT l.id AS "licencaId" FROM pedido p
           LEFT JOIN licenca l ON l.pedido_id = p.id
          WHERE p.referencia = $1`,
        [evento.referencia],
      );
      return { ok: true as const, licencaId: anterior[0]?.licencaId ?? null, jaProcessado: true as const };
    }

    // O portal sai do PEDIDO, não da requisição: quem chama aqui é o
    // webhook do gateway, que não tem Host nem sessão (§5.10).
    const [pedido] = await exec<{
      id: number; usuarioId: number; portalId: number; escopo: 'CATALOGO' | 'MATERIA';
      materiaId: number | null; periodo: Periodo; centavos: number; meio: MeioPagamento;
      indicacaoId: number | null; materiaPortalId: number;
      quantidade: number; empresaPortalId: number | null;
    }>(
      `SELECT id, usuario_id AS "usuarioId", portal_id AS "portalId", escopo,
              materia_id AS "materiaId", periodo, centavos, meio,
              indicacao_id AS "indicacaoId", materia_portal_id AS "materiaPortalId",
              quantidade, empresa_portal_id::int AS "empresaPortalId"
         FROM pedido WHERE referencia = $1 AND status = 'ABERTO'
         FOR UPDATE`,
      [evento.referencia],
    );
    if (!pedido) {
      await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = $2
                   WHERE id = $1`, [registrado.id, 'pedido inexistente ou já finalizado']);
      return { ok: false as const, motivo: 'pedido inexistente ou já finalizado' };
    }

    if (evento.tipo === 'pagamento.falhou') {
      await exec(`UPDATE pedido SET status = 'CANCELADO' WHERE id = $1`, [pedido.id]);
      await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = 'pagamento falhou'
                   WHERE id = $1`, [registrado.id]);
      return { ok: false as const, motivo: 'pagamento não aprovado' };
    }

    // db/047 — compra de VAGAS por uma empresa: em vez de licença para o
    // comprador (o gestor não estuda), nasce o LOTE, e o RH distribui as
    // vagas aos colaboradores. Sem assinatura: renova-se comprando outro
    // lote. A comissão do professor (se houver) já está carimbada no
    // pedido e entra na apuração do jeito de sempre.
    if (pedido.empresaPortalId !== null) {
      const [lote] = await exec<{ id: number }>(
        `INSERT INTO licenca_lote (portal_id, materia_id, materia_portal_id, quantidade, pedido_id,
                                   inicio_em, fim_em, orcamento_id)
         VALUES ($1, $2, $3, $4, $5, now(), now() + ($6 || ' months')::interval,
                 (SELECT id FROM orcamento_empresa WHERE pedido_id = $5))
         RETURNING id`,
        [pedido.empresaPortalId, pedido.materiaId, pedido.materiaPortalId, pedido.quantidade,
         pedido.id, String(MESES_DO_PERIODO[pedido.periodo])],
      );
      await exec(`UPDATE pedido SET status = 'PAGO', pago_em = now() WHERE id = $1`, [pedido.id]);
      await exec(`UPDATE pagamento SET confirmado_em = now() WHERE pedido_id = $1`, [pedido.id]);
      await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = $2 WHERE id = $1`,
        [registrado.id, `lote ${lote.id} com ${pedido.quantidade} vaga(s)`]);
      await auditar(exec, `webhook:${provedorNome}`, 'lote.criado', 'licenca_lote', lote.id,
        { pedidoId: pedido.id, empresaPortalId: pedido.empresaPortalId, quantidade: pedido.quantidade });
      return { ok: true as const, licencaId: null, jaProcessado: false as const, loteId: lote.id };
    }

    // Assinatura: cartão e Pix Automático renovam sozinhos; Pix avulso não (§6.4)
    let assinaturaId: number | null = null;
    if (pedido.meio !== 'PIX') {
      const [a] = await exec<{ id: number }>(
        `INSERT INTO assinatura (usuario_id, portal_id, escopo, materia_id, periodo, meio,
                                 proxima_cobranca, materia_portal_id)
         VALUES ($1, $2, $3, $4, $5, $6, (current_date + ($7 || ' months')::interval)::date, $8)
         RETURNING id`,
        [pedido.usuarioId, pedido.portalId, pedido.escopo, pedido.materiaId, pedido.periodo,
         pedido.meio, String(MESES_DO_PERIODO[pedido.periodo]), pedido.materiaPortalId],
      );
      assinaturaId = a.id;
    }

    const [licenca] = await exec<{ id: number }>(
      `INSERT INTO licenca (usuario_id, portal_id, escopo, materia_id, origem, status,
                            inicio_em, fim_em, assinatura_id, pedido_id, materia_portal_id)
       VALUES ($1, $2, $3, $4, 'COMPRA', 'ATIVA', now(),
               now() + ($5 || ' months')::interval, $6, $7, $8)
       RETURNING id`,
      [pedido.usuarioId, pedido.portalId, pedido.escopo, pedido.materiaId,
       String(MESES_DO_PERIODO[pedido.periodo]), assinaturaId, pedido.id, pedido.materiaPortalId],
    );

    await exec(
      `UPDATE pedido SET status = 'PAGO', pago_em = now(), assinatura_id = $2
        WHERE id = $1`,
      [pedido.id, assinaturaId],
    );
    await exec(`UPDATE pagamento SET confirmado_em = now() WHERE pedido_id = $1`, [pedido.id]);
    // §5.10.1: a indicação se gasta AQUI, no pagamento — uma vez só.
    if (pedido.indicacaoId) await consumirIndicacao(exec, pedido.indicacaoId, pedido.id);
    await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = $2 WHERE id = $1`,
      [registrado.id, `licença ${licenca.id} emitida`]);
    await auditar(exec, `gateway:${provedorNome}`, 'pagamento.confirmado', 'pedido', pedido.id,
      { referencia: evento.referencia, licencaId: licenca.id, assinaturaId });

    return { ok: true as const, licencaId: licenca.id, jaProcessado: false as const };
  });
}

/** Teste gratuito de 7 dias, ativado pelo próprio aluno (§6.1). */
export async function ativarTrial(usuarioId: number, email: string, materiaId: number) {
  return emTransacao(async (exec) => {
    // Um teste por conta, não renovável e não acumulável. O índice único
    // já garante; conferir antes deixa a mensagem melhor que um erro 500.
    const [existente] = await exec<{ id: number }>(
      `SELECT id FROM licenca WHERE usuario_id = $1 AND origem = 'TRIAL'`, [usuarioId],
    );
    if (existente) throw new Error('Você já usou seu teste gratuito. Ele é um por conta.');

    // O portal vem do aluno — não há requisição a consultar quando isto
    // roda de um script, e derivar da linha elimina a chance de divergir.
    const [dono] = await exec<{ portalId: number }>(
      `SELECT portal_id AS "portalId" FROM usuario WHERE id = $1`, [usuarioId],
    );
    if (!dono) throw new Error('Conta não encontrada.');

    const [m] = await exec<{ id: number }>(
      `SELECT id FROM materia
        WHERE id = $1 AND portal_id = $2 AND status = 'publicado'`,
      [materiaId, dono.portalId],
    );
    if (!m) throw new Error('Escolha uma matéria publicada.');

    const [l] = await exec<{ id: number }>(
      `INSERT INTO licenca (usuario_id, portal_id, escopo, materia_id, origem, status,
                            inicio_em, fim_em, cota, materia_portal_id)
       VALUES ($1, $2, 'MATERIA', $3, 'TRIAL', 'ATIVA', now(), now() + interval '7 days', $4, $2)
       RETURNING id`,
      [usuarioId, dono.portalId, materiaId, JSON.stringify({ aulas: 4, exercicios: 30 })],
    );
    await auditar(exec, email, 'trial.ativado', 'licenca', l.id, { materiaId });
    return l.id;
  });
}

/** Cancelamento em 2 cliques, com protocolo (§6.6). */
export async function cancelarAssinatura(usuarioId: number, email: string, assinaturaId: number) {
  return emTransacao(async (exec) => {
    const protocolo = novoProtocolo('CANC');
    const [a] = await exec<{ id: number }>(
      `UPDATE assinatura
          SET status = 'CANCELADA', cancelada_em = now(), protocolo_cancelamento = $3
        WHERE id = $1 AND usuario_id = $2 AND status <> 'CANCELADA'
        RETURNING id`,
      [assinaturaId, usuarioId, protocolo],
    );
    if (!a) throw new Error('assinatura não encontrada ou já cancelada');
    // O acesso continua até o fim do período já pago (§6.4) — a licença
    // não é tocada, só deixa de renovar.
    await auditar(exec, email, 'assinatura.cancelada', 'assinatura', assinaturaId, { protocolo });
    return protocolo;
  });
}

/** Arrependimento em 7 dias: devolução integral, sem justificativa (§6.6). */
export async function pedirReembolso(usuarioId: number, email: string, pedidoId: number) {
  return emTransacao(async (exec) => {
    const [p] = await exec<{ id: number; centavos: number; licencaId: number | null; dias: number; idExterno: string | null }>(
      `SELECT p.id, p.centavos, l.id AS "licencaId",
              EXTRACT(day FROM now() - p.pago_em)::int AS dias,
              (SELECT pg.detalhe->>'idExterno' FROM pagamento pg WHERE pg.pedido_id = p.id LIMIT 1) AS "idExterno"
         FROM pedido p LEFT JOIN licenca l ON l.pedido_id = p.id
        WHERE p.id = $1 AND p.usuario_id = $2 AND p.status = 'PAGO'`,
      [pedidoId, usuarioId],
    );
    if (!p) throw new Error('pedido não encontrado');
    if (p.dias > 7) {
      throw new Error('O prazo de arrependimento é de 7 dias corridos a partir da compra (CDC, art. 49).');
    }

    // O dinheiro volta pelo gateway ANTES de o banco registrar: se o
    // estorno falhar lá, a transação desfaz e o aluno vê o erro — nunca
    // um "reembolsado" no painel sem dinheiro na conta.
    if (p.idExterno) await provedorAtual().reembolsar(p.idExterno, p.centavos);

    const protocolo = novoProtocolo('REEMB');
    await exec(
      `INSERT INTO reembolso (pedido_id, centavos, motivo, protocolo, solicitado_por)
       VALUES ($1, $2, 'arrependimento em 7 dias (CDC, art. 49)', $3, $4)`,
      [p.id, p.centavos, protocolo, email],
    );
    await exec(`UPDATE pedido SET status = 'REEMBOLSADO' WHERE id = $1`, [p.id]);
    if (p.licencaId) {
      await exec(`UPDATE licenca SET status = 'CANCELADA', atualizada_em = now() WHERE id = $1`,
        [p.licencaId]);
    }
    await exec(`UPDATE assinatura SET status = 'ENCERRADA'
                 WHERE id = (SELECT assinatura_id FROM pedido WHERE id = $1)`, [p.id]);
    await auditar(exec, email, 'reembolso.solicitado', 'pedido', p.id, { protocolo, centavos: p.centavos });
    return protocolo;
  });
}

export function pedidosDo(usuarioId: number) {
  return query<{
    id: number; referencia: string; centavos: number; status: string; meio: string;
    periodo: string; materiaNome: string | null; escopo: string;
    criadoEm: Date; pagoEm: Date | null; podeReembolsar: boolean;
  }>(
    `SELECT p.id, p.referencia, p.centavos, p.status, p.meio, p.periodo, p.escopo,
            m.nome AS "materiaNome", p.criado_em AS "criadoEm", p.pago_em AS "pagoEm",
            (p.status = 'PAGO' AND p.pago_em > now() - interval '7 days') AS "podeReembolsar"
       FROM pedido p LEFT JOIN materia m ON m.id = p.materia_id
      WHERE p.usuario_id = $1 ORDER BY p.criado_em DESC`,
    [usuarioId],
  );
}

export function assinaturasDo(usuarioId: number) {
  return query<{
    id: number; escopo: string; materiaNome: string | null; periodo: string;
    meio: string; status: string; proximaCobranca: Date | null; protocolo: string | null;
  }>(
    `SELECT a.id, a.escopo, m.nome AS "materiaNome", a.periodo, a.meio, a.status,
            a.proxima_cobranca AS "proximaCobranca", a.protocolo_cancelamento AS protocolo
       FROM assinatura a LEFT JOIN materia m ON m.id = a.materia_id
      WHERE a.usuario_id = $1 ORDER BY a.criada_em DESC`,
    [usuarioId],
  );
}

export function buscarPedidoPorReferencia(referencia: string, usuarioId: number) {
  return queryOne<{
    id: number; referencia: string; centavos: number; status: string; meio: MeioPagamento;
    materiaNome: string | null; escopo: string; periodo: string; expiraEm: Date; detalhe: unknown;
    quantidade: number; empresaPortalId: number | null;
  }>(
    `SELECT p.id, p.referencia, p.centavos, p.status, p.meio, p.escopo, p.periodo,
            p.quantidade, p.empresa_portal_id::int AS "empresaPortalId",
            p.expira_em AS "expiraEm", m.nome AS "materiaNome", pg.detalhe
       FROM pedido p
       LEFT JOIN materia m ON m.id = p.materia_id
       LEFT JOIN pagamento pg ON pg.pedido_id = p.id
      WHERE p.referencia = $1 AND p.usuario_id = $2`,
    [referencia, usuarioId],
  );
}

/**
 * O CPF do aluno é pedido só na compra (§12.1) — e o gateway real não
 * emite a cobrança sem ele. Guarda o que veio do formulário; sem nenhum,
 * só o provedor simulado segue em frente.
 */
export async function garantirCpf(usuarioId: number, informado: string): Promise<void> {
  if (informado.trim()) {
    if (!validarCpf(informado)) throw new Error('CPF inválido — confira os 11 dígitos.');
    // O documento é da CONTA (db/045): informado numa compra, vale em
    // todos os portais em que a pessoa entra.
    await query(
      `UPDATE conta SET documento = $2, tipo_documento = 'CPF'
        WHERE id = (SELECT conta_id FROM usuario WHERE id = $1)`,
      [usuarioId, somenteDigitos(informado)]);
    return;
  }
  if (!(await temCpf(usuarioId)) && provedorAtual().cobraDeVerdade) {
    throw new Error('Informe seu CPF — o meio de pagamento exige para emitir a cobrança.');
  }
}

export async function temCpf(usuarioId: number): Promise<boolean> {
  const u = await queryOne<{ cpf: string | null }>(
    `SELECT c.documento AS cpf FROM usuario u JOIN conta c ON c.id = u.conta_id WHERE u.id = $1`,
    [usuarioId]);
  return Boolean(u?.cpf);
}
