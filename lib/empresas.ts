import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { validarEmail } from './auth.ts';
import { validarCnpj } from './portal.ts';

/**
 * Empresas & RH — a vitrine corporativa e o interesse que ela capta.
 *
 * As licenças patrocinadas (§12-B.1) são Fase 3: não há contrato_b2b,
 * painel do parceiro nem licença de origem B2B. O que a página de planos
 * faz hoje é anunciar a modalidade com preço de referência e guardar o
 * contato de quem se interessou — a venda fecha por proposta, fora do
 * site. Por isso este módulo tem duas metades: a TABELA de planos (o que
 * a vitrine mostra) e o INTERESSE (o que ela grava).
 *
 * Os preços vivem aqui, e não em `preco`, de propósito: `preco` é a
 * tabela do que se vende no checkout, com vigência e auditoria (§5.9).
 * Preço de referência de um produto sem checkout não é preço vigente;
 * quando a modalidade nascer de verdade, ela entra lá com a regra de
 * todo mundo.
 */

export const PORTES = ['ate_50', 'ate_250', 'mais_250'] as const;
export type Porte = typeof PORTES[number];
export const ROTULO_PORTE: Record<Porte, string> = {
  ate_50: 'Até 50 colaboradores',
  ate_250: 'De 51 a 250 colaboradores',
  mais_250: 'Mais de 250 colaboradores',
};

export const PLANOS = ['starter', 'pro', 'enterprise'] as const;
export type PlanoEmpresa = typeof PLANOS[number];

export const STATUS = ['novo', 'em_contato', 'encerrado'] as const;
export type StatusInteresse = typeof STATUS[number];
export const ROTULO_STATUS: Record<StatusInteresse, string> = {
  novo: 'Novo', em_contato: 'Em contato', encerrado: 'Encerrado',
};

export interface PlanoEmpresaInfo {
  id: PlanoEmpresa;
  /** Etiqueta acima do nome: o porte que o plano atende. */
  publico: string;
  nome: string;
  resumo: string;
  /** null = sob proposta, sem valor na vitrine. */
  centavosMes: number | null;
  cobranca: string;
  tituloLista: string;
  itens: string[];
  recomendado?: boolean;
}

/**
 * O que cada plano promete é o que a plataforma já faz para aluno e
 * professor, reempacotado para uma equipe: player com endereço assinado
 * e marca d'água, exercícios, progresso por pessoa. Nada de boleto, DRM
 * ou SSO — não existem (ver lib/pagamento.ts e lib/video.ts), e a
 * vitrine não promete o que a Fase 3 ainda vai decidir.
 */
export const PLANOS_EMPRESA: PlanoEmpresaInfo[] = [
  {
    id: 'starter',
    publico: 'Até 50 colaboradores',
    nome: 'Business Starter',
    resumo: 'Para empresas estruturando a integração de novos contratados e a cultura interna.',
    centavosMes: 38_000,
    cobranca: 'Faturamento mensal, por Pix ou cartão da empresa',
    tituloLista: 'O que está incluído:',
    itens: [
      'Até 50 contas ativas de colaboradores',
      'Trilhas de integração e onboarding sem limite',
      'Player com endereço de vídeo assinado e marca d’água nominal',
      'Painel de progresso da equipe para o RH',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'pro',
    publico: 'Até 250 colaboradores',
    nome: 'Corporate Pro',
    resumo: 'Para empresas com programa formal de capacitação contínua.',
    centavosMes: 89_000,
    cobranca: 'Mensal, ou anual com desconto',
    tituloLista: 'Tudo do Starter, mais:',
    itens: [
      'Até 250 colaboradores cadastrados',
      'Subdomínio exclusivo com o nome da empresa',
      'Testes de conhecimento e provas internas',
      'Certificado de conclusão com a chancela da empresa',
      'Acesso restrito ao e-mail corporativo',
      'Atendimento dedicado por WhatsApp',
    ],
    recomendado: true,
  },
  {
    id: 'enterprise',
    publico: 'Equipes com mais de 250',
    nome: 'Enterprise',
    resumo: 'Para grandes operações, com várias unidades e integração com os sistemas internos.',
    centavosMes: null,
    cobranca: 'Conforme volume de usuários e unidades',
    tituloLista: 'Conversamos sobre:',
    itens: [
      'Número de colaboradores sem limite',
      'Integração com o sistema de RH da empresa (via API)',
      'Múltiplos centros de custo e unidades regionais',
      'SLA de atendimento em contrato',
      'Apoio para digitalizar o acervo de aulas da empresa',
    ],
  },
];

export const ROTULO_PLANO = Object.fromEntries(
  PLANOS_EMPRESA.map((p) => [p.id, p.nome]),
) as Record<PlanoEmpresa, string>;

// ---------------------------------------------------------------------
// Interesse
// ---------------------------------------------------------------------

export interface DadosInteresse {
  nome: string;
  email: string;
  telefone?: string;
  empresa: string;
  cnpj: string;
  porte: string;
  plano: string;
  mensagem?: string;
}

export interface InteresseNormalizado {
  nome: string; email: string; telefone: string | null;
  empresa: string; cnpj: string; porte: Porte; plano: PlanoEmpresa;
  mensagem: string | null;
}

/**
 * Regras do formulário, em um lugar só — a tela repete o `required`, mas
 * quem decide é aqui. Devolve os dados prontos para gravar ou lança com
 * a mensagem que a pessoa vai ler.
 */
export function validarInteresse(d: DadosInteresse): InteresseNormalizado {
  const nome = d.nome.trim();
  if (nome.length < 2) throw new Error('Informe o seu nome.');

  const email = d.email.trim().toLowerCase();
  const erroEmail = validarEmail(email);
  if (erroEmail) throw new Error(erroEmail);

  const empresa = d.empresa.trim();
  if (empresa.length < 2) throw new Error('Informe o nome da empresa.');

  if (!validarCnpj(d.cnpj)) {
    throw new Error('CNPJ inválido. O contrato corporativo é com a pessoa jurídica — '
      + 'confira o número e tente de novo.');
  }
  const cnpj = d.cnpj.toUpperCase().replace(/[.\/\- ]/g, '');

  if (!PORTES.includes(d.porte as Porte)) throw new Error('Escolha o porte da equipe.');
  if (!PLANOS.includes(d.plano as PlanoEmpresa)) throw new Error('Escolha um plano.');

  const telefone = d.telefone?.trim() || null;
  const mensagem = d.mensagem?.trim().slice(0, 2000) || null;

  return {
    nome, email, telefone, empresa, cnpj,
    porte: d.porte as Porte, plano: d.plano as PlanoEmpresa, mensagem,
  };
}

/** Grava o interesse e devolve o id. Não deduplica: dois pedidos da
 *  mesma empresa são duas conversas, e é o comercial quem junta. */
export async function registrarInteresse(d: DadosInteresse): Promise<number> {
  const v = validarInteresse(d);
  const r = await queryOne<{ id: number }>(
    `INSERT INTO interesse_empresa
       (nome, email, telefone, empresa, cnpj, porte, plano, mensagem)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [v.nome, v.email, v.telefone, v.empresa, v.cnpj, v.porte, v.plano, v.mensagem],
  );
  return r!.id;
}

// ---------------------------------------------------------------------
// Retaguarda
// ---------------------------------------------------------------------

export interface Interesse extends InteresseNormalizado {
  id: number;
  status: StatusInteresse;
  atendidoPor: string | null;
  atendidoEm: Date | null;
  criadoEm: Date;
}

const CAMPOS = `
  i.id, i.nome, i.email, i.telefone, i.empresa, i.cnpj, i.porte, i.plano, i.mensagem,
  i.status, i.atendido_por AS "atendidoPor", i.atendido_em AS "atendidoEm",
  i.criado_em AS "criadoEm"
`;

export function listarInteresses(status = '', limite = 200) {
  const filtro = STATUS.includes(status as StatusInteresse) ? status : null;
  return query<Interesse>(
    `SELECT ${CAMPOS} FROM interesse_empresa i
      WHERE ($1::text IS NULL OR i.status::text = $1)
      ORDER BY (i.status = 'novo') DESC, i.criado_em DESC
      LIMIT $2`,
    [filtro, limite],
  );
}

export function contarInteressesPorStatus() {
  return query<{ status: StatusInteresse; total: number }>(
    `SELECT status, count(*)::int AS total FROM interesse_empresa GROUP BY status`,
  );
}

/**
 * Muda o status e assina quem mudou — a restrição do banco não deixa
 * "em contato" sem autor. Voltar para "novo" limpa a assinatura: a fila
 * volta a mostrar o lead como se ninguém o tivesse pego.
 */
export async function mudarStatusInteresse(
  ator: string, id: number, status: StatusInteresse,
) {
  if (!STATUS.includes(status)) throw new Error('Situação inválida.');
  await emTransacao(async (exec) => {
    const [linha] = await exec(
      status === 'novo'
        ? `UPDATE interesse_empresa
              SET status = 'novo', atendido_por = NULL, atendido_em = NULL
            WHERE id = $1 RETURNING id`
        : `UPDATE interesse_empresa
              SET status = $2::status_interesse, atendido_por = $3, atendido_em = now()
            WHERE id = $1 RETURNING id`,
      status === 'novo' ? [id] : [id, status, ator],
    );
    if (!linha) throw new Error('Interesse não encontrado.');
    await auditar(exec, ator, 'interesse_empresa.status', 'interesse_empresa', id, { status });
  });
}
