import { queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { gerarHashSenha, validarEmail, validarSenha, garantirConta } from './auth.ts';
import { PORTAL_PLATAFORMA, validarCnpj,
  validarTelefone, conferirEndereco, normalizarEndereco, somenteDigitos,
  type Endereco, type PortalTipo,
} from './portal.ts';
import { conferirMascara, semearPrecosDaPlataforma } from './admin-portais.ts';
import {
  provedorAtual, novaReferencia,
  type MeioPagamento, type EventoPagamento,
} from './pagamento.ts';

/**
 * Autosserviço do Portal do Professor — etapa 1 do §5.10.2.
 *
 * O professor se cadastra, escolhe a máscara, aceita o contrato e paga a
 * primeira mensalidade; o portal nasce quando o pagamento confirma. Duas
 * regras estruturam o arquivo:
 *
 * 1. TUDO OU NADA. Conta, portal, contrato, aceite e fatura nascem na
 *    MESMA transação. O fluxo em etapas (conta agora, portal depois)
 *    deixaria meio-cadastro para o suporte limpar — e meio-cadastro com
 *    cobrança no meio é reclamação, não lead.
 *
 * 2. O PAGAMENTO É QUEM ATIVA. O portal nasce RASCUNHO e só vira ATIVO
 *    no webhook, pelo mesmo caminho idempotente do checkout de aluno
 *    (§8.3): o mesmo evento pode chegar duas vezes e nunca ativa nada
 *    duas vezes, nem reativa portal encerrado.
 *
 * O que fica deliberadamente para a etapa 2: a subconta no gateway e a
 * trava "sem subconta não vende". Aqui o professor CONTRATA; vender é o
 * passo seguinte.
 */

/**
 * Teto do período de avaliação regulatória do gateway (§8.2): até a
 * homologação, no máximo 10 subcontas. O autosserviço PARA de aceitar ao
 * chegar no limite — com aviso, não com erro de banco. Sobe por variável
 * de ambiente quando a homologação sair.
 */
const limitePortais = () => Number(process.env.LIMITE_PORTAIS ?? 10);

/**
 * Tira só a pontuação do CNPJ, e não tudo que não é dígito: desde 2026 o
 * CNPJ pode ter letras, e `somenteDigitos` apagaria metade dele.
 */
const semPontuacao = (cnpj: string) => cnpj.toUpperCase().replace(/[-./ ]/g, '');

export interface DadosAssinatura {
  nome: string;
  email: string;
  senha: string;
  /** CNPJ do responsável — sem ele não há subconta (§5.10.2). */
  cnpj: string;
  /**
   * §5.11 — o mesmo caminho serve aos dois produtos. O que muda é
   * pequeno e está marcado ponto a ponto abaixo: a empresa não abre
   * subconta (não vende), então não coleta KYC; escolhe entre dois
   * planos, então informa qual; e o dono nasce 'gestor', não 'professor'.
   * Um fluxo só, porque o caro aqui é a transação única e a idempotência
   * do webhook — e duplicá-los seria duplicar o que pode divergir.
   */
  tipo?: PortalTipo;
  /** Só EMPRESA: qual dos planos de empresa. O professor tem um só. */
  planoId?: number;
  /** KYC do responsável — o gateway não abre a subconta sem (§8.2). Só PROFESSOR. */
  telefone: string;
  rendaMensalCentavos: number;
  endereco: Endereco;
  mascara: string;
  nomeExibicao: string;
  meio: MeioPagamento;
  /** O checkbox do contrato. Sem aceite explícito, nada é criado. */
  aceitouContrato: boolean;
  ip: string;
}

export interface AssinaturaCriada {
  portalId: number;
  professorId: number;
  referencia: string;
  centavos: number;
  meio: MeioPagamento;
  copiaECola?: string;
  instrucao: string;
  expiraEm: Date;
}

export interface PlanoAtivo {
  id: number; nome: string;
  licencaMensalCentavos: number; percentualBase: string;
  acrescimoIndicacaoPp: string;
  /** Quanto o professor recebe quando NÓS vendemos o curso dele (§5.6.1). */
  comissaoVitrinePp: string;
  /** §5.11 — teto de contas do plano de empresa; null nos de professor. */
  limiteContas: number | null;
  gbArmazenamento: number; gbBandaMes: number;
  centavosPorGbExcedente: number;
}

/** As condições que o contrato copia no aceite — um SELECT para os dois tipos. */
const CAMPOS_PLANO = `
  id, nome, licenca_mensal_centavos AS "licencaMensalCentavos",
  percentual_base AS "percentualBase",
  acrescimo_indicacao_pp AS "acrescimoIndicacaoPp",
  comissao_vitrine_pp AS "comissaoVitrinePp",
  limite_contas AS "limiteContas",
  gb_armazenamento AS "gbArmazenamento",
  gb_banda_mes AS "gbBandaMes",
  centavos_por_gb_excedente AS "centavosPorGbExcedente"
`;

/**
 * O plano vendido em /para-professores: o mais barato ENTRE OS DE
 * PROFESSOR. A página lê DAQUI, nunca de número no código — mudar o
 * preço no admin muda o site (§5.10.3). O filtro por tipo é o que
 * impede que semear um plano de empresa mude, em silêncio, o que a
 * página do professor vende (§5.11).
 */
export function planoDeLancamento() {
  return queryOne<PlanoAtivo>(
    `SELECT ${CAMPOS_PLANO} FROM portal_plano WHERE ativo AND tipo = 'PROFESSOR'
      ORDER BY licenca_mensal_centavos LIMIT 1`,
  );
}

/**
 * §5.11 — o plano de empresa que ela escolheu. Diferente do professor,
 * que tem um só, aqui a pessoa decide entre Starter e Pro: sem `planoId`
 * não há contratação, porque adivinhar qual plano alguém quis comprar é
 * o tipo de palpite que vira estorno.
 */
export function planoDeEmpresaAtivo(planoId: number | undefined) {
  if (!Number.isInteger(planoId)) throw new Error('Escolha um plano.');
  return queryOne<PlanoAtivo>(
    `SELECT ${CAMPOS_PLANO} FROM portal_plano
      WHERE id = $1 AND ativo AND tipo = 'EMPRESA'`,
    [planoId],
  );
}

export interface FaturaDoProfessor {
  id: number; status: string; centavosTotal: number;
  referencia: string; vencimento: Date | null; pagaEm: Date | null;
  cobrancaExternaId: string | null;
  detalhe: { meio?: string; copiaECola?: string | null; linkPagamento?: string | null } | null;
  portalId: number; mascara: string; nomeExibicao: string;
  portalStatus: string; subcontaSituacao: string;
}

/**
 * A fatura na tela de pagamento do professor — só a dele: a referência
 * sozinha não basta, senão qualquer um com o link veria CNPJ e cobrança
 * alheios.
 */
export function faturaDoProfessor(referencia: string, professorId: number) {
  return queryOne<FaturaDoProfessor>(
    `SELECT f.id, f.status, f.centavos_total AS "centavosTotal", f.referencia,
            f.vencimento, f.paga_em AS "pagaEm",
            f.cobranca_externa_id AS "cobrancaExternaId", f.detalhe,
            p.id AS "portalId", p.mascara, p.nome_exibicao AS "nomeExibicao",
            p.status AS "portalStatus", p.subconta_situacao AS "subcontaSituacao"
       FROM portal_fatura f
       JOIN portal p ON p.id = f.portal_id
      WHERE f.referencia = $1 AND p.professor_id = $2`,
    [referencia, professorId],
  );
}

export async function assinarPortal(d: DadosAssinatura): Promise<AssinaturaCriada> {
  // ---- validações que não precisam de banco, primeiro e mais baratas ----
  if (!d.aceitouContrato) throw new Error('É preciso ler e aceitar o contrato para contratar.');
  if (!d.nome.trim()) throw new Error('Diga como podemos te chamar.');
  if (!d.nomeExibicao.trim()) throw new Error('Dê um nome ao seu portal.');
  const erroEmail = validarEmail(d.email);
  if (erroEmail) throw new Error(erroEmail);
  const erroSenha = validarSenha(d.senha);
  if (erroSenha) throw new Error(erroSenha);
  if (!validarCnpj(d.cnpj)) {
    throw new Error('CNPJ inválido. O portal exige pessoa jurídica — é regra do Banco '
      + 'Central para a conta de recebimento, não escolha nossa.');
  }
  const tipo: PortalTipo = d.tipo ?? 'PROFESSOR';
  const empresa = tipo === 'EMPRESA';

  // O KYC existe para abrir a subconta no gateway. A empresa não tem
  // subconta — ela paga, não recebe —, então pedir renda e endereço
  // seria coletar dado pessoal sem finalidade (§12.1).
  if (tipo === 'PROFESSOR') {
    if (!validarTelefone(d.telefone)) throw new Error('Telefone inválido — DDD e número.');
    if (!Number.isInteger(d.rendaMensalCentavos) || d.rendaMensalCentavos <= 0) {
      throw new Error('Informe sua renda mensal — o meio de pagamento exige para abrir '
        + 'a conta de recebimento.');
    }
    const erroEndereco = conferirEndereco(d.endereco);
    if (erroEndereco) throw new Error(erroEndereco);
  }
  if (d.meio !== 'PIX' && d.meio !== 'CARTAO') throw new Error('Meio de pagamento inválido.');

  // ---- teto regulatório (§5.10.2): fila de espera, não erro ----
  // O teto é do GATEWAY: 10 subcontas até a homologação. Portal de
  // empresa não abre subconta nenhuma, e por isso não ocupa vaga.
  if (tipo === 'PROFESSOR') {
    const ocupacao = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM portal
        WHERE id <> ${PORTAL_PLATAFORMA} AND tipo = 'PROFESSOR' AND status <> 'ENCERRADO'`,
    );
    if ((ocupacao?.total ?? 0) >= limitePortais()) {
      throw new Error('Estamos no limite de novos portais deste período. Deixe seu e-mail '
        + 'na lista de espera que avisamos assim que abrir a próxima turma.');
    }
  }

  const plano = tipo === 'EMPRESA'
    ? await planoDeEmpresaAtivo(d.planoId)
    : await planoDeLancamento();
  if (!plano) throw new Error('Nenhum plano disponível no momento.');

  // A cobrança nasce no gateway ANTES da transação, como no checkout de
  // aluno: se o gateway falhar, nada foi gravado; se a transação falhar,
  // sobra uma cobrança órfã que expira sozinha — o mal menor.
  const referencia = novaReferencia('PF');
  const provedor = provedorAtual();
  const cobranca = await provedor.criarCobranca({
    referencia,
    centavos: plano.licencaMensalCentavos,
    meio: d.meio,
    emailPagador: d.email.trim().toLowerCase(),
    documentoPagador: d.cnpj, nomePagador: d.nome.trim(),
    descricao: tipo === 'EMPRESA'
      ? `Portal da Empresa — 1ª mensalidade (${d.nomeExibicao.trim()})`
      : `Portal do Professor — 1ª mensalidade (${d.nomeExibicao.trim()})`,
  });

  return emTransacao(async (exec) => {
    // Conta do professor na PLATAFORMA (portal 0) — é por ela que ele
    // opera o próprio site. E-mail já usado NÃO é promovido em silêncio:
    // promover conta alheia por um formulário público seria presente
    // para engraçadinho com o e-mail dos outros.
    // Com a credencial global (db/045) a recusa vale para conta em
    // QUALQUER portal: contratar com o e-mail de uma conta que já tem
    // senha exigiria entrar nela primeiro — e esse fluxo não existe aqui.
    const credencial = await garantirConta(exec, {
      nome: d.nome, email: d.email, senhaHash: await gerarHashSenha(d.senha),
      documento: semPontuacao(d.cnpj),
    });
    if (credencial.existia) {
      throw new Error('Já existe uma conta com esse e-mail. Entre nela para contratar '
        + 'o portal, ou fale com o suporte.');
    }
    const [conta] = await exec<{ id: number }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
       VALUES (${PORTAL_PLATAFORMA}, $1, $2, lower($3), $4::papel_usuario)
       RETURNING id::int AS id`,
      [credencial.id, d.nome.trim().slice(0, 120), d.email.trim(),
       tipo === 'EMPRESA' ? 'gestor' : 'professor'],
    );

    const mascara = await conferirMascara(exec, d.mascara);

    // `professor_id` continua sendo a conta que CONTRATOU — na empresa, o
    // responsável. É por ela que a cobrança encontra o dono; quem pode
    // ENTRAR no painel é o vínculo em `portal_gestor`, logo abaixo.
    const [portal] = await exec<{ id: number }>(
      `INSERT INTO portal
         (mascara, nome_exibicao, professor_id, plano_id, status, tipo,
          responsavel_nome, responsavel_doc, responsavel_email,
          responsavel_telefone, responsavel_renda_centavos, responsavel_endereco)
       VALUES ($1, $2, $3, $4, 'RASCUNHO', $11::portal_tipo, $5, $6, lower($7), $8, $9, $10::jsonb)
       RETURNING id::int AS id`,
      [mascara, d.nomeExibicao.trim(), conta.id, plano.id,
       d.nome.trim(), semPontuacao(d.cnpj), d.email.trim(),
       empresa ? null : somenteDigitos(d.telefone),
       empresa ? null : d.rendaMensalCentavos,
       empresa ? null : JSON.stringify(normalizarEndereco(d.endereco)),
       tipo],
    );

    // §5.11 — quem contratou é o RESPONSAVEL, o único gestor que não pode
    // ser removido. Os demais ele convida depois, no painel.
    if (empresa) {
      await exec(
        `INSERT INTO portal_gestor (portal_id, usuario_id, papel_no_portal, criado_por)
         VALUES ($1, $2, 'RESPONSAVEL', $3)`,
        [portal.id, conta.id, d.email.trim().toLowerCase()],
      );
    }

    // Contrato copiado do plano NO ATO (§5.10): o plano pode mudar de
    // preço amanhã; o que este cliente aceitou hoje, não.
    //
    // `comissao_vitrine_pp` passa a ser COPIADA, e não deixada no DEFAULT
    // da tabela: os dois valiam 50 por coincidência, e mudar a comissão
    // no plano não chegava a contrato nenhum. `limite_contas` entra pela
    // mesma razão — é o teto que esta empresa comprou (§5.11).
    const [contrato] = await exec<{ id: number }>(
      `INSERT INTO portal_contrato
         (portal_id, plano_id, licenca_mensal_centavos, percentual_base,
          acrescimo_indicacao_pp, comissao_vitrine_pp, limite_contas,
          vigente_de, aceito_em, aceito_ip, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, current_date, now(), $8, $9) RETURNING id`,
      [portal.id, plano.id, plano.licencaMensalCentavos, plano.percentualBase,
       plano.acrescimoIndicacaoPp, plano.comissaoVitrinePp, plano.limiteContas,
       d.ip || null, d.email.trim().toLowerCase()],
    );

    // 1ª mensalidade: nasce FECHADA (pronta para pagar), não ABERTA — a
    // fatura ABERTA é a que acumula consumo ao longo do mês (etapa 4).
    await exec(
      `INSERT INTO portal_fatura
         (portal_id, contrato_id, competencia, centavos_licenca, centavos_total,
          status, vencimento, referencia, cobranca_externa_id, detalhe, fechada_em)
       VALUES ($1, $2, date_trunc('month', current_date)::date, $3, $3,
               'FECHADA', current_date + 2, $4, $5, $6, now())`,
      [portal.id, contrato.id, plano.licencaMensalCentavos, referencia,
       cobranca.idExterno,
       JSON.stringify({ meio: d.meio, provedor: provedor.nome, primeiraMensalidade: true,
                        copiaECola: cobranca.copiaECola ?? null,
                        linkPagamento: cobranca.linkPagamento ?? null })],
    );

    // Sem tabela de preço o portal nasce sem poder vender: a página
    // mostraria "R$ NaN" e o checkout recusaria a compra. Começa com a
    // nossa tabela; o valor de cada produto é editável depois (§5.9).
    await semearPrecosDaPlataforma(exec, portal.id, d.email.trim().toLowerCase());

    await auditar(exec, d.email.trim().toLowerCase(), 'portal.autosservico', 'portal',
      portal.id, { mascara, planoId: plano.id, referencia, meio: d.meio });

    return {
      portalId: portal.id, professorId: conta.id, referencia,
      centavos: plano.licencaMensalCentavos, meio: d.meio,
      copiaECola: cobranca.copiaECola, instrucao: cobranca.instrucao,
      expiraEm: cobranca.expiraEm,
    };
  });
}

export type ResultadoFatura =
  | { ok: true; faturaId: number; portalId: number; portalTipo: PortalTipo;
      portalAtivado: boolean; jaProcessado: boolean }
  | { ok: false; motivo: string };

/**
 * Webhook da fatura de portal — mesmo desenho idempotente do checkout de
 * aluno (§8.3): `evento_gateway` barra o evento repetido, e o UPDATE só
 * acontece com a fatura travada por FOR UPDATE.
 */
export async function confirmarPagamentoFatura(
  evento: EventoPagamento, provedorNome: string, corpo: unknown,
): Promise<ResultadoFatura> {
  return emTransacao(async (exec) => {
    const [registrado] = await exec<{ id: number }>(
      `INSERT INTO evento_gateway (provedor, evento_id, tipo, corpo)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provedor, evento_id) DO NOTHING
       RETURNING id`,
      [provedorNome, evento.eventoId, evento.tipo, JSON.stringify(corpo)],
    );
    if (!registrado) {
      const [f] = await exec<{ id: number; portalId: number; portalTipo: PortalTipo }>(
        `SELECT f.id, f.portal_id AS "portalId", p.tipo AS "portalTipo"
           FROM portal_fatura f JOIN portal p ON p.id = f.portal_id
          WHERE f.referencia = $1`, [evento.referencia],
      );
      return {
        ok: true as const, faturaId: f?.id ?? 0, portalId: f?.portalId ?? 0,
        portalTipo: f?.portalTipo ?? 'PROFESSOR',
        portalAtivado: false, jaProcessado: true as const,
      };
    }

    const [fatura] = await exec<{ id: number; portalId: number; portalTipo: PortalTipo }>(
      `SELECT f.id, f.portal_id AS "portalId",
              (SELECT tipo FROM portal WHERE id = f.portal_id) AS "portalTipo"
         FROM portal_fatura f
        WHERE f.referencia = $1 AND f.status IN ('FECHADA', 'EM_ATRASO')
        FOR UPDATE OF f`,
      [evento.referencia],
    );
    if (!fatura) {
      await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = $2
                   WHERE id = $1`, [registrado.id, 'fatura inexistente ou já finalizada']);
      return { ok: false as const, motivo: 'fatura inexistente ou já finalizada' };
    }

    if (evento.tipo !== 'pagamento.confirmado') {
      // Falha não cancela a fatura: ela continua cobrável (o professor
      // tenta de novo, ou a régua de inadimplência do §5.10 assume).
      await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = 'pagamento falhou'
                   WHERE id = $1`, [registrado.id]);
      return { ok: false as const, motivo: 'pagamento não aprovado' };
    }

    await exec(`UPDATE portal_fatura SET status = 'PAGA', paga_em = now() WHERE id = $1`,
      [fatura.id]);

    // A ativação: RASCUNHO pago vira ATIVO; SUSPENSO pago volta ao ar
    // (§5.10, inadimplência). ENCERRADO não ressuscita por pagamento.
    const [portal] = await exec<{ id: number }>(
      `UPDATE portal
          SET status = 'ATIVO',
              publicado_em = coalesce(publicado_em, now()),
              suspenso_em = NULL
        WHERE id = $1 AND status IN ('RASCUNHO', 'SUSPENSO')
        RETURNING id`,
      [fatura.portalId],
    );

    await exec(`UPDATE evento_gateway SET processado_em = now(), resultado = $2 WHERE id = $1`,
      [registrado.id, `fatura ${fatura.id} paga${portal ? ', portal ativado' : ''}`]);
    await auditar(exec, `gateway:${provedorNome}`, 'portal_fatura.paga', 'portal_fatura',
      fatura.id, { referencia: evento.referencia, portalId: fatura.portalId,
                   portalAtivado: Boolean(portal) });

    return {
      ok: true as const, faturaId: fatura.id, portalId: fatura.portalId,
      portalTipo: fatura.portalTipo,
      portalAtivado: Boolean(portal), jaProcessado: false as const,
    };
  });
}
