import { query, queryOne } from './db.ts';
import { emTransacao, auditar, type Exec } from './auditoria.ts';
import { gerarHashSenha, validarEmail, validarSenha, garantirConta } from './auth.ts';
import {
  PORTAL_PLATAFORMA, conferirDominio, type StatusPortal, type PortalTipo,
  type Personalizacao,
} from './portal.ts';

/**
 * Portais de professor na retaguarda — §5.10 e §5.10.1.
 *
 * `db/018_portal.sql` construiu o modelo inteiro (tenant, contrato
 * versionado, indicação, consumo, fatura) e não deixou nenhuma porta de
 * entrada: o único portal existente foi inserido à mão, sem contrato — o
 * que, pela regra do §5.6, significa um professor que não pode publicar.
 *
 * Três regras do §5.10 vivem aqui:
 *
 * 1. A MÁSCARA É O ENDEREÇO. `jackson.aprimoreosaber.com.br` é resolvido
 *    pelo `Host` antes de qualquer consulta. Uma máscara que colida com
 *    rota do sistema derruba a própria rota — por isso a lista de
 *    reservadas mora em tabela (`mascara_reservada`) e é conferida aqui.
 * 2. O CONTRATO É VERSIONADO, como o preço. Condição nova vale a partir
 *    de uma data e não altera o que já está em curso; é o que resolve a
 *    disputa do §15.12 sobre quanto se cobrou por uma venda antiga.
 * 3. O PREÇO É POR PORTAL. Cada professor tem a própria tabela de
 *    valores, com a mesma mecânica de vigência do §5.9.
 */

export interface PortalAdmin {
  id: number; mascara: string; nomeExibicao: string; status: StatusPortal;
  /** §5.11 — PROFESSOR ou EMPRESA. Muda o que a linha significa. */
  tipo: PortalTipo;
  /** Teto de contas do contrato vigente; null nos portais de professor. */
  limiteContas: number | null;
  dominioProprio: string | null;
  professorId: number | null; professorNome: string | null; professorEmail: string | null;
  planoId: number | null; planoNome: string | null;
  responsavelNome: string | null; responsavelDoc: string | null; responsavelEmail: string | null;
  personalizacao: Record<string, unknown>;
  criadoEm: Date; publicadoEm: Date | null;
  temContrato: boolean; contratoAceito: boolean;
  materias: number; alunos: number;
}

const CAMPOS = `
  p.id, p.mascara, p.nome_exibicao AS "nomeExibicao", p.status, p.tipo,
  (SELECT c.limite_contas FROM portal_contrato c
    WHERE c.portal_id = p.id AND c.vigente_ate IS NULL) AS "limiteContas",
  p.dominio_proprio AS "dominioProprio",
  p.professor_id AS "professorId", u.nome AS "professorNome", u.email AS "professorEmail",
  p.plano_id AS "planoId", pl.nome AS "planoNome",
  p.responsavel_nome AS "responsavelNome", p.responsavel_doc AS "responsavelDoc",
  p.responsavel_email AS "responsavelEmail",
  p.personalizacao, p.criado_em AS "criadoEm", p.publicado_em AS "publicadoEm",
  EXISTS (SELECT 1 FROM portal_contrato c
           WHERE c.portal_id = p.id AND c.vigente_ate IS NULL) AS "temContrato",
  EXISTS (SELECT 1 FROM portal_contrato c
           WHERE c.portal_id = p.id AND c.vigente_ate IS NULL AND c.aceito_em IS NOT NULL)
    AS "contratoAceito",
  (SELECT count(*)::int FROM materia m WHERE m.portal_id = p.id) AS materias,
  (SELECT count(*)::int FROM usuario us
    WHERE us.portal_id = p.id AND us.papel = 'aluno'
      AND us.status_conta <> 'ENCERRADA') AS alunos
`;

/**
 * A plataforma (portal 0) fica de fora da lista: ela não é cliente, não
 * tem contrato e não se suspende. Ela aparece, sim, nos seletores de
 * portal do catálogo e de preços, onde é o acervo da casa.
 */
export function listarPortais() {
  return query<PortalAdmin>(
    `SELECT ${CAMPOS} FROM portal p
       LEFT JOIN usuario u ON u.id = p.professor_id
       LEFT JOIN portal_plano pl ON pl.id = p.plano_id
      WHERE p.id <> ${PORTAL_PLATAFORMA}
      ORDER BY p.criado_em DESC`,
  );
}

export function buscarPortal(id: number) {
  return queryOne<PortalAdmin>(
    `SELECT ${CAMPOS} FROM portal p
       LEFT JOIN usuario u ON u.id = p.professor_id
       LEFT JOIN portal_plano pl ON pl.id = p.plano_id
      WHERE p.id = $1`,
    [id],
  );
}

/** Os portais que podem ser escolhidos como escopo — a plataforma inclusa. */
export function portaisParaEscolha() {
  return query<{ id: number; nome: string; mascara: string }>(
    `SELECT id, nome_exibicao AS nome, mascara FROM portal
      WHERE status <> 'ENCERRADO' ORDER BY id`,
  );
}

// ---------------------------------------------------------------------
// Planos comerciais (§5.10)
// ---------------------------------------------------------------------

export interface PlanoPortal {
  id: number; nome: string; licencaMensalCentavos: number;
  percentualBase: string; acrescimoIndicacaoPp: string;
  gbArmazenamento: number; gbBandaMes: number; centavosPorGbExcedente: number;
  /** Preço mensal do domínio próprio (Fase 2); null = o plano não oferece. */
  centavosDominioProprio: number | null;
  ativo: boolean; portais: number;
}

export function listarPlanos() {
  return query<PlanoPortal>(
    `SELECT pl.id, pl.nome, pl.licenca_mensal_centavos AS "licencaMensalCentavos",
            pl.percentual_base AS "percentualBase",
            pl.acrescimo_indicacao_pp AS "acrescimoIndicacaoPp",
            pl.gb_armazenamento AS "gbArmazenamento", pl.gb_banda_mes AS "gbBandaMes",
            pl.centavos_por_gb_excedente AS "centavosPorGbExcedente",
            pl.centavos_dominio_proprio AS "centavosDominioProprio", pl.ativo,
            (SELECT count(*)::int FROM portal p WHERE p.plano_id = pl.id) AS portais
       FROM portal_plano pl ORDER BY pl.ativo DESC, pl.nome`,
  );
}

export interface DadosPlano {
  nome: string; licencaMensalCentavos: number;
  percentualBase: number; acrescimoIndicacaoPp: number;
  gbArmazenamento: number; gbBandaMes: number; centavosPorGbExcedente: number;
  centavosDominioProprio: number | null;
  ativo: boolean;
}

function validarPlano(d: DadosPlano) {
  if (!d.nome.trim()) throw new Error('o plano precisa de um nome');
  if (d.percentualBase < 0 || d.percentualBase > 100) throw new Error('percentual fora da faixa');
  if (d.acrescimoIndicacaoPp < 0 || d.acrescimoIndicacaoPp > 100) {
    throw new Error('acréscimo por indicação fora da faixa');
  }
  // A mesma restrição existe no banco (`plano_percentual_total`): base +
  // acréscimo passando de 100% seria cobrar mais do que a venda inteira.
  if (d.percentualBase + d.acrescimoIndicacaoPp > 100) {
    throw new Error('base + acréscimo por indicação não pode passar de 100%');
  }
  if (d.licencaMensalCentavos < 0) throw new Error('a licença mensal não pode ser negativa');
  if (d.centavosDominioProprio !== null && d.centavosDominioProprio < 0) {
    throw new Error('o preço do domínio próprio não pode ser negativo');
  }
}

export async function salvarPlano(ator: string, id: number | null, d: DadosPlano) {
  validarPlano(d);
  return emTransacao(async (exec) => {
    if (id) {
      // Alterar o plano NÃO altera contrato vivo: o contrato copiou os
      // números no aceite, de propósito (§5.10). Isto aqui muda só a
      // oferta para quem contratar daqui em diante.
      const [linha] = await exec<{ id: number }>(
        `UPDATE portal_plano SET nome=$2, licenca_mensal_centavos=$3, percentual_base=$4,
                acrescimo_indicacao_pp=$5, gb_armazenamento=$6, gb_banda_mes=$7,
                centavos_por_gb_excedente=$8, ativo=$9, centavos_dominio_proprio=$10
          WHERE id = $1 RETURNING id`,
        [id, d.nome.trim(), d.licencaMensalCentavos, d.percentualBase, d.acrescimoIndicacaoPp,
         d.gbArmazenamento, d.gbBandaMes, d.centavosPorGbExcedente, d.ativo, d.centavosDominioProprio],
      );
      if (!linha) throw new Error('plano não encontrado');
      await auditar(exec, ator, 'portal_plano.editado', 'portal_plano', id, { nome: d.nome });
      return id;
    }
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO portal_plano
        (nome, licenca_mensal_centavos, percentual_base, acrescimo_indicacao_pp,
         gb_armazenamento, gb_banda_mes, centavos_por_gb_excedente, ativo, centavos_dominio_proprio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [d.nome.trim(), d.licencaMensalCentavos, d.percentualBase, d.acrescimoIndicacaoPp,
       d.gbArmazenamento, d.gbBandaMes, d.centavosPorGbExcedente, d.ativo, d.centavosDominioProprio],
    );
    await auditar(exec, ator, 'portal_plano.criado', 'portal_plano', novo.id, { nome: d.nome });
    return novo.id;
  });
}

// ---------------------------------------------------------------------
// Professores
// ---------------------------------------------------------------------

export function listarProfessores() {
  return query<{ id: number; nome: string; email: string; portais: number }>(
    `SELECT u.id, u.nome, u.email,
            (SELECT count(*)::int FROM portal p WHERE p.professor_id = u.id) AS portais
       FROM usuario u
      WHERE u.papel = 'professor' AND u.portal_id = ${PORTAL_PLATAFORMA}
      ORDER BY u.nome`,
  );
}

/**
 * Cria a conta do professor, ou promove uma que já exista.
 *
 * O professor é usuário da PLATAFORMA (portal 0), não do portal dele — é
 * assim que ele entra na nossa retaguarda para operar o próprio site. A
 * base de alunos do portal continua separada, como manda o §5.10.
 */
export async function criarProfessor(ator: string, nome: string, email: string, senha: string) {
  const erroEmail = validarEmail(email);
  if (erroEmail) throw new Error(erroEmail);
  const erroSenha = validarSenha(senha);
  if (erroSenha) throw new Error(erroSenha);
  if (!nome.trim()) throw new Error('o nome do professor é obrigatório');

  const hash = await gerarHashSenha(senha);
  return emTransacao(async (exec) => {
    // Conta global (db/045): a senha informada só vale para conta nova;
    // quem já tem conta continua com a dela e ganha (ou muda para) o
    // papel de professor na plataforma.
    const conta = await garantirConta(exec, { nome, email, senhaHash: hash });
    const [u] = await exec<{ id: number; papel: string }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
       VALUES (${PORTAL_PLATAFORMA}, $1, $2, lower($3), 'professor')
       ON CONFLICT (conta_id, portal_id) DO UPDATE
         SET papel = 'professor', nome = EXCLUDED.nome
       RETURNING id, papel`,
      [conta.id, nome.trim(), email.trim()],
    );
    await auditar(exec, ator, 'usuario.promovido_professor', 'usuario', u.id,
      { email: email.trim().toLowerCase() });
    return u.id;
  });
}

// ---------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------

export interface DadosPortal {
  mascara: string; nomeExibicao: string;
  professorId: number; planoId: number;
  responsavelNome?: string | null;
  responsavelDoc?: string | null;
  responsavelEmail?: string | null;
}

/** O formato aceito pela restrição `portal_mascara_formato` da 018. */
const FORMATO_MASCARA = /^[a-z0-9]([a-z0-9-]{1,30})?[a-z0-9]$/;

/** Exportada porque o autosserviço (`portal-assinatura.ts`) valida igual. */
export async function conferirMascara(exec: Exec, mascara: string, ignorarId?: number) {
  const limpa = mascara.trim().toLowerCase();
  if (!FORMATO_MASCARA.test(limpa)) {
    throw new Error(
      'a máscara aceita minúsculas, números e hífen no meio, com 3 a 32 caracteres',
    );
  }
  const [reservada] = await exec<{ motivo: string }>(
    'SELECT motivo FROM mascara_reservada WHERE nome = $1', [limpa],
  );
  if (reservada) {
    const porque = { ROTA: 'é uma rota do sistema', INFRA: 'é usada pela infraestrutura',
      MARCA: 'é da nossa marca' }[reservada.motivo] ?? 'está reservada';
    throw new Error(`"${limpa}" não pode ser usada: ${porque}`);
  }
  const [ocupada] = await exec<{ id: number }>(
    'SELECT id FROM portal WHERE lower(mascara) = $1 AND ($2::bigint IS NULL OR id <> $2)',
    [limpa, ignorarId ?? null],
  );
  if (ocupada) throw new Error(`"${limpa}" já é o endereço de outro portal`);
  return limpa;
}

/**
 * Tabela de preços inicial do portal, copiada da plataforma.
 *
 * §5.10 dá a cada portal a própria tabela. O que faltava era o começo
 * dela: portal recém-criado nascia sem nenhuma linha em `preco`, e o
 * efeito aparecia nos dois lugares em que mais dói — a seção "Como
 * assinar" da página do professor mostrava <strong>R$ NaN</strong>, e o
 * checkout recusava a compra com "não há preço vigente para este
 * produto". Nascer com a nossa tabela dá um portal vendável desde o
 * primeiro minuto; o admin (e a vigência do §5.9) continuam podendo
 * trocar cada valor depois.
 *
 * Idempotente: só insere produto/período que ainda não tem preço vigente
 * no portal, então rodar de novo não duplica nada.
 */
export async function semearPrecosDaPlataforma(exec: Exec, portalId: number, ator: string) {
  // §5.11 — portal de empresa não vende: preço ali seria linha morta que
  // um dia apareceria numa tela por engano.
  const [alvo] = await exec<{ tipo: string }>('SELECT tipo FROM portal WHERE id = $1', [portalId]);
  if (alvo?.tipo === 'EMPRESA') return 0;

  const linhas = await exec<{ produto: string }>(
    `INSERT INTO preco (portal_id, produto, periodo, centavos, vigente_de, criado_por)
     SELECT $1, p.produto, p.periodo, p.centavos, current_date, $2
       FROM preco p
      WHERE p.portal_id = ${PORTAL_PLATAFORMA}
        AND p.vigente_ate IS NULL AND p.vigente_de <= current_date
        AND NOT EXISTS (
          SELECT 1 FROM preco q
           WHERE q.portal_id = $1 AND q.produto = p.produto AND q.periodo = p.periodo
             AND q.vigente_ate IS NULL)
     RETURNING produto`,
    [portalId, ator],
  );
  return linhas.length;
}

export async function criarPortal(ator: string, d: DadosPortal) {
  if (!d.nomeExibicao.trim()) throw new Error('o portal precisa de um nome de exibição');
  if (!Number.isInteger(d.professorId)) throw new Error('escolha o professor');
  if (!Number.isInteger(d.planoId)) throw new Error('escolha o plano');

  return emTransacao(async (exec) => {
    const mascara = await conferirMascara(exec, d.mascara);
    // Nasce em RASCUNHO: sem contrato aceito o professor não publica
    // (§5.6), e publicar um portal vazio no nosso domínio seria pior do
    // que não ter portal nenhum.
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO portal
         (mascara, nome_exibicao, professor_id, plano_id, status,
          responsavel_nome, responsavel_doc, responsavel_email)
       VALUES ($1,$2,$3,$4,'RASCUNHO',$5,$6,$7) RETURNING id`,
      [mascara, d.nomeExibicao.trim(), d.professorId, d.planoId,
       d.responsavelNome?.trim() || null, d.responsavelDoc?.trim() || null,
       d.responsavelEmail?.trim() || null],
    );
    const precos = await semearPrecosDaPlataforma(exec, novo.id, ator);
    await auditar(exec, ator, 'portal.criado', 'portal', novo.id,
      { mascara, nome: d.nomeExibicao.trim(), professorId: d.professorId,
        planoId: d.planoId, precosCopiados: precos });
    return novo.id;
  });
}

/**
 * A personalização é UMA só: quem a define é `lib/portal.ts`, que também
 * a serve às páginas públicas. Havia uma cópia desta interface aqui, e
 * cópia de tipo envelhece — o campo novo entrava num lado e o outro
 * continuava recusando. Reexportamos para não quebrar quem já importa
 * daqui.
 */
export type { Personalizacao };

/**
 * As seções fixas do §5.10 — abertura, propósito, prova e contato.
 *
 * `personalizacao` é JSONB porque o professor preenche campos de um
 * layout fixo: não é estrutura livre, e por isso não merece tabela por
 * seção. Ele controla texto, imagem e cor; não controla HTML, CSS nem
 * ordem das seções — é o que mantém o provisionamento automático viável.
 */
export async function editarPortal(
  ator: string, id: number,
  d: Partial<DadosPortal> & { personalizacao?: Personalizacao; dominioProprio?: string | null },
) {
  return emTransacao(async (exec) => {
    const [atual] = await exec<{ mascara: string }>(
      'SELECT mascara FROM portal WHERE id = $1', [id],
    );
    if (!atual) throw new Error('portal não encontrado');
    if (id === PORTAL_PLATAFORMA) throw new Error('a plataforma não é um portal editável');

    const mascara = d.mascara && d.mascara.trim().toLowerCase() !== atual.mascara
      ? await conferirMascara(exec, d.mascara, id)
      : atual.mascara;

    // Só sobrescreve o que o chamador MANDOU. Antes, salvar a
    // personalização (que não traz responsável nem domínio) apagava CNPJ,
    // nome e e-mail do responsável — e o rodapé legal do portal ficava
    // sem identificação, o que o §5.10 e o CDC não permitem.
    const temResponsavel = 'responsavelNome' in d || 'responsavelDoc' in d || 'responsavelEmail' in d;
    const temDominio = 'dominioProprio' in d;
    const dominio = d.dominioProprio?.trim().toLowerCase() || null;
    if (temDominio && dominio) {
      const erro = conferirDominio(dominio);
      if (erro) throw new Error(erro);
    }
    await exec(
      `UPDATE portal SET
         mascara = $2,
         nome_exibicao = coalesce($3, nome_exibicao),
         professor_id = coalesce($4, professor_id),
         plano_id = coalesce($5, plano_id),
         responsavel_nome  = CASE WHEN $11::boolean THEN $6 ELSE responsavel_nome  END,
         responsavel_doc   = CASE WHEN $11::boolean THEN $7 ELSE responsavel_doc   END,
         responsavel_email = CASE WHEN $11::boolean THEN $8 ELSE responsavel_email END,
         dominio_proprio   = CASE WHEN $12::boolean THEN $9 ELSE dominio_proprio   END,
         dominio_verificado_em = CASE
           WHEN NOT $12::boolean OR $9 IS NOT DISTINCT FROM dominio_proprio THEN dominio_verificado_em
           WHEN $9 IS NULL THEN NULL ELSE now() END,
         personalizacao = coalesce($10::jsonb, personalizacao)
       WHERE id = $1`,
      [id, mascara, d.nomeExibicao?.trim() || null, d.professorId ?? null, d.planoId ?? null,
       d.responsavelNome?.trim() || null, d.responsavelDoc?.trim() || null,
       d.responsavelEmail?.trim() || null, dominio,
       d.personalizacao ? JSON.stringify(d.personalizacao) : null,
       temResponsavel, temDominio],
    );
    await auditar(exec, ator, 'portal.editado', 'portal', id, {
      ...(mascara !== atual.mascara ? { endereco: `${atual.mascara} → ${mascara}` } : {}),
      nome: d.nomeExibicao,
    });
    return id;
  });
}

/**
 * Publicar, suspender, encerrar.
 *
 * Publicar exige contrato aceito (§5.6). Suspender é a inadimplência do
 * §5.10: o portal sai do ar para visitantes, mas o aluno com licença
 * vigente continua assistindo até o fim da vigência — e é por isso que a
 * suspensão mexe no portal, e nunca na licença.
 */
export async function mudarStatusPortal(ator: string, id: number, status: StatusPortal) {
  if (id === PORTAL_PLATAFORMA) throw new Error('a plataforma não muda de situação');
  return emTransacao(async (exec) => {
    const [p] = await exec<{ status: StatusPortal; aceito: boolean }>(
      `SELECT p.status,
              EXISTS (SELECT 1 FROM portal_contrato c
                       WHERE c.portal_id = p.id AND c.vigente_ate IS NULL
                         AND c.aceito_em IS NOT NULL) AS aceito
         FROM portal p WHERE p.id = $1`,
      [id],
    );
    if (!p) throw new Error('portal não encontrado');
    if (status === 'ATIVO' && !p.aceito) {
      throw new Error('sem contrato aceito o portal não vai ao ar (§5.6)');
    }
    await exec(
      // $3 repete o status como texto: usar $2 nos dois papéis (coluna
      // enum e comparação) faz o Postgres recusar a consulta inteira com
      // "inconsistent types deduced for parameter".
      `UPDATE portal SET status = $2,
              publicado_em = CASE WHEN $3 = 'ATIVO' THEN coalesce(publicado_em, now())
                                  ELSE publicado_em END,
              suspenso_em  = CASE WHEN $3 = 'SUSPENSO' THEN now() ELSE suspenso_em END,
              encerrado_em = CASE WHEN $3 = 'ENCERRADO' THEN now() ELSE encerrado_em END
        WHERE id = $1`,
      [id, status, status],
    );
    await auditar(exec, ator, 'portal.status', 'portal', id, { de: p.status, para: status });
  });
}

// ---------------------------------------------------------------------
// Contrato (§5.10, §5.10.1)
// ---------------------------------------------------------------------

export interface ContratoPortal {
  id: number; portalId: number; planoId: number; planoNome: string;
  licencaMensalCentavos: number; percentualBase: string; acrescimoIndicacaoPp: string;
  validadeCliqueDias: number; diasRetencao: number; percentualReserva: string;
  vigenteDe: Date; vigenteAte: Date | null;
  aceitoEm: Date | null; aceitoIp: string | null; registradoPor: string | null;
  criadoEm: Date;
}

export function historicoDeContratos(portalId: number) {
  return query<ContratoPortal>(
    `SELECT c.id, c.portal_id AS "portalId", c.plano_id AS "planoId", pl.nome AS "planoNome",
            c.licenca_mensal_centavos AS "licencaMensalCentavos",
            c.percentual_base AS "percentualBase",
            c.acrescimo_indicacao_pp AS "acrescimoIndicacaoPp",
            c.validade_clique_dias AS "validadeCliqueDias",
            c.dias_retencao AS "diasRetencao", c.percentual_reserva AS "percentualReserva",
            c.vigente_de AS "vigenteDe", c.vigente_ate AS "vigenteAte",
            c.aceito_em AS "aceitoEm", c.aceito_ip AS "aceitoIp",
            c.registrado_por AS "registradoPor", c.criado_em AS "criadoEm"
       FROM portal_contrato c JOIN portal_plano pl ON pl.id = c.plano_id
      WHERE c.portal_id = $1
      ORDER BY c.vigente_de DESC, c.id DESC`,
    [portalId],
  );
}

export interface DadosContrato {
  planoId: number;
  licencaMensalCentavos: number;
  percentualBase: number;
  acrescimoIndicacaoPp: number;
  validadeCliqueDias: number;
  diasRetencao: number;
  percentualReserva: number;
  vigenteDe: string;
}

/**
 * Novo contrato: encerra o vigente e abre o próximo — nunca sobrescreve.
 *
 * Mesma mecânica do preço (§5.9), e aqui ela não é conforto: é o que
 * permite responder "quanto se cobrou por aquela venda de dois anos
 * atrás" sem reconstituir a história dos contratos.
 */
export async function registrarContrato(ator: string, portalId: number, d: DadosContrato) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.vigenteDe)) throw new Error('data de vigência inválida');
  if (d.percentualBase < 0 || d.percentualBase > 100) throw new Error('percentual fora da faixa');
  if (d.percentualBase + d.acrescimoIndicacaoPp > 100) {
    throw new Error('base + acréscimo por indicação não pode passar de 100%');
  }
  if (d.validadeCliqueDias < 1) throw new Error('a validade do clique precisa de ao menos 1 dia');
  if (d.diasRetencao < 0) throw new Error('retenção inválida');

  return emTransacao(async (exec) => {
    const [vigente] = await exec<{ id: number; vigenteDe: string }>(
      `SELECT id, to_char(vigente_de, 'YYYY-MM-DD') AS "vigenteDe"
         FROM portal_contrato WHERE portal_id = $1 AND vigente_ate IS NULL`,
      [portalId],
    );
    if (vigente && d.vigenteDe <= vigente.vigenteDe) {
      throw new Error(
        `o contrato vigente começou em ${vigente.vigenteDe}; o novo precisa começar depois`,
      );
    }
    if (vigente) {
      await exec('UPDATE portal_contrato SET vigente_ate = $2 WHERE id = $1',
        [vigente.id, d.vigenteDe]);
    }
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO portal_contrato
        (portal_id, plano_id, licenca_mensal_centavos, percentual_base,
         acrescimo_indicacao_pp, validade_clique_dias, dias_retencao, percentual_reserva,
         vigente_de, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [portalId, d.planoId, d.licencaMensalCentavos, d.percentualBase, d.acrescimoIndicacaoPp,
       d.validadeCliqueDias, d.diasRetencao, d.percentualReserva, d.vigenteDe, ator],
    );
    await auditar(exec, ator, 'portal_contrato.registrado', 'portal_contrato', novo.id, {
      portalId, planoId: d.planoId, percentualBase: d.percentualBase,
      acrescimoIndicacaoPp: d.acrescimoIndicacaoPp, vigenteDe: d.vigenteDe,
    });
    return novo.id;
  });
}

/**
 * Registrar o aceite do professor.
 *
 * O aceite é o que destrava a publicação (§5.6). Guarda data e IP porque
 * é ele que sustenta a declaração de titularidade do conteúdo — a
 * mitigação do risco de hospedar obra de terceiro no nosso domínio.
 */
export async function registrarAceite(ator: string, contratoId: number, ip: string) {
  return emTransacao(async (exec) => {
    const [c] = await exec<{ id: number; portalId: number; aceitoEm: Date | null }>(
      `SELECT id, portal_id AS "portalId", aceito_em AS "aceitoEm"
         FROM portal_contrato WHERE id = $1`, [contratoId],
    );
    if (!c) throw new Error('contrato não encontrado');
    if (c.aceitoEm) throw new Error('este contrato já foi aceito');
    await exec(
      'UPDATE portal_contrato SET aceito_em = now(), aceito_ip = $2 WHERE id = $1',
      [contratoId, ip || null],
    );
    await auditar(exec, ator, 'portal_contrato.aceito', 'portal_contrato', contratoId,
      { portalId: c.portalId, ip });
  });
}
