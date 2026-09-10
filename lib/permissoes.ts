/**
 * O que cada papel de operação pode fazer na retaguarda — parte pura,
 * sem banco e sem React (docs/plano-perfis-e-acessos.md, §2.3).
 *
 * Até aqui a guarda era uma só: "é admin?". Com Financeiro e Suporte a
 * pergunta certa passa a ser "tem ESTA permissão?", e a resposta mora numa
 * tabela — não espalhada em `papel === 'admin' || papel === 'suporte'`
 * por trinta arquivos, que é como uma exceção esquecida vira brecha.
 *
 * Duas leituras do pedido viraram premissa e estão gravadas aqui:
 *
 *  - FINANCEIRO SÓ ENXERGA. Nenhuma ação que mexa em dinheiro aceita o
 *    papel — preço, contrato, apuração, repasse, fatura, cortesia.
 *  - SUPORTE NÃO TOCA EM DINHEIRO. Opera cadastro e licença de apoio
 *    (estender, suspender, reativar), mas não concede cortesia: dar
 *    acesso de graça é decisão comercial, e fica com o admin (decisão
 *    pendente 1 do plano — muda-se numa linha desta tabela).
 *
 * A guarda de tela e a guarda de ação leem a MESMA tabela. Esconder um
 * botão nunca foi controle de acesso; a ação confere de novo no servidor.
 */

export type Papel =
  | 'aluno' | 'professor' | 'revisor' | 'gestor'
  | 'admin' | 'financeiro' | 'suporte';

export type Permissao =
  /** Entrar em /admin — qualquer papel de operação. */
  | 'retaguarda.entrar'
  /** Cursos, blog, mural de vagas, acervo dos portais. */
  | 'conteudo.agir'
  /** Ver usuários, alunos dos portais, dados cadastrais (inclusive CPF). */
  | 'cadastros.ver'
  /** Criar e editar usuário, senha provisória, estado da conta, vínculos, portais. */
  | 'cadastros.agir'
  /** Estender, suspender e reativar licença. */
  | 'licencas.suporte'
  /** Conceder cortesia e promocional. */
  | 'licencas.conceder'
  /** Pedidos, pagamentos, reembolsos, faturas, apurações, repasses, consolidado. */
  | 'financeiro.ver'
  /** Preço, contrato, plano, fechar fatura, aprovar apuração, registrar repasse. */
  | 'financeiro.agir'
  /** Criar e editar admin, financeiro e suporte. */
  | 'equipe.agir'
  /** O log de auditoria. */
  | 'auditoria.ver';

/** Os papéis que entram na retaguarda. A ordem é a de exibição. */
export const PAPEIS_DA_EQUIPE = ['admin', 'financeiro', 'suporte'] as const;
export type PapelDaEquipe = typeof PAPEIS_DA_EQUIPE[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: 'Administrador da plataforma',
  financeiro: 'Financeiro da plataforma',
  suporte: 'Suporte da plataforma',
  professor: 'Professor',
  revisor: 'Revisor de conteúdo',
  gestor: 'Gestor do portal da empresa',
  aluno: 'Aluno',
};

export const TODAS_AS_PERMISSOES: readonly Permissao[] = [
  'retaguarda.entrar', 'conteudo.agir', 'cadastros.ver', 'cadastros.agir',
  'licencas.suporte', 'licencas.conceder', 'financeiro.ver', 'financeiro.agir',
  'equipe.agir', 'auditoria.ver',
];

/**
 * A tabela. Admin tem tudo — listado por extenso, e não por `true`
 * genérico, para que uma permissão nova precise ser DECIDIDA para cada
 * papel, inclusive para ele (o teste confere que nenhuma ficou de fora).
 */
const TABELA: Record<PapelDaEquipe, ReadonlySet<Permissao>> = {
  admin: new Set(TODAS_AS_PERMISSOES),
  financeiro: new Set<Permissao>([
    'retaguarda.entrar', 'cadastros.ver', 'financeiro.ver', 'auditoria.ver',
  ]),
  suporte: new Set<Permissao>([
    'retaguarda.entrar', 'cadastros.ver', 'cadastros.agir', 'licencas.suporte',
    'auditoria.ver',
  ]),
};

export function daEquipe(papel: string): papel is PapelDaEquipe {
  return (PAPEIS_DA_EQUIPE as readonly string[]).includes(papel);
}

/** A única pergunta que a retaguarda faz. Papel desconhecido: não pode nada. */
export function pode(papel: string, permissao: Permissao): boolean {
  if (!daEquipe(papel)) return false;
  return TABELA[papel].has(permissao);
}

/** As permissões de um papel, para a tela dizer o que está fora do alcance. */
export function permissoesDe(papel: string): Permissao[] {
  if (!daEquipe(papel)) return [];
  return TODAS_AS_PERMISSOES.filter((p) => TABELA[papel].has(p));
}
