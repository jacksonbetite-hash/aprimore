/**
 * As ferramentas de estudo — catálogo e escolha (§5.10).
 *
 * O submenu "Ferramentas" era do site principal e mostrava tudo o que a
 * casa tem. Passou a ser do PORTAL DO PROFESSOR: o site principal não o
 * exibe mais, e cada professor escolhe, em "Minha página", quais
 * ferramentas quer vincular ao portal dele. É coerente com o resto do
 * §5.10 — a página do professor é dele, e o que aparece no topo dela é
 * decisão dele, não nossa.
 *
 * O módulo é puro de propósito: o cabeçalho (servidor), o menu (cliente)
 * e as ações de salvar leem a mesma lista, e uma chave inventada no
 * formulário morre aqui, antes de virar item de menu.
 */

export interface Ferramenta {
  chave: string;
  href: string;
  nome: string;
  descricao: string;
  icone: string;
  /** A ferramenta também tem item de primeiro nível na barra do topo. */
  naBarra?: boolean;
  /**
   * Conteúdo da casa, que não se vincula a portal de professor: o mural
   * de vagas é nosso, e oferecê-lo dentro do portal dele seria pôr
   * anúncio de terceiro na página de quem paga para não ter.
   */
  soPlataforma?: boolean;
}

export const FERRAMENTAS: Ferramenta[] = [
  {
    chave: 'vademecum',
    href: '/vademecum',
    nome: 'Vade-mécum Digital',
    descricao: 'Consulta a leis e códigos, com busca por artigo ou trecho',
    icone: 'gavel',
  },
  {
    chave: 'calculadora-penal',
    href: '/calculadora-penal',
    nome: 'Calculadora Penal',
    descricao: 'Dosimetria, regime, prescrição, decadência e perempção',
    icone: 'calculate',
  },
  {
    chave: 'caderno-de-erros',
    href: '/painel#caderno',
    nome: 'Caderno de erros',
    descricao: 'As questões que você errou, reunidas para revisar',
    icone: 'edit_note',
    naBarra: true,
  },
  {
    chave: 'vagas',
    href: '/vagas',
    nome: 'Mural de Vagas',
    descricao: 'Estágios e vagas de emprego no mercado jurídico',
    icone: 'work',
    soPlataforma: true,
  },
];

/** O que o professor pode marcar em "Minha página". */
export const FERRAMENTAS_DO_PORTAL = FERRAMENTAS.filter((f) => !f.soPlataforma);

/**
 * As chaves que vieram do formulário, filtradas pelo catálogo e sem
 * repetição. Chave inventada não vira menu — e a ordem é a do catálogo,
 * não a da submissão, para o menu não depender de quem marcou primeiro.
 */
export function lerFerramentas(bruto: readonly string[]): string[] {
  const pedidas = new Set(bruto.map((c) => c.trim()));
  return FERRAMENTAS_DO_PORTAL.filter((f) => pedidas.has(f.chave)).map((f) => f.chave);
}

/** As ferramentas escolhidas por um portal, na ordem do catálogo. */
export function ferramentasEscolhidas(chaves: readonly string[] | undefined): Ferramenta[] {
  if (!chaves || chaves.length === 0) return [];
  const escolhidas = new Set(chaves);
  return FERRAMENTAS_DO_PORTAL.filter((f) => escolhidas.has(f.chave));
}
