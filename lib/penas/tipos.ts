/**
 * Calculadora Penal (§5.12) — os tipos que atravessam o motor inteiro.
 *
 * Nada aqui toca banco nem React. O que o motor precisa saber de um crime
 * cabe num objeto: os limites da pena, a espécie de ação penal, se há
 * violência, se é hediondo. O TEXTO da lei não mora aqui — mora no acervo
 * do vade-mécum, e cada regra aponta para ele por (norma, rótulo).
 *
 * Toda pena é contada em DIAS inteiros. É a única representação em que
 * "um sexto de 6 anos" dá 1 ano exato e "um terço de 1 ano e 2 meses"
 * não vira 0,4666 de alguma coisa: o art. 11 do CP manda desprezar as
 * frações de dia, e é isso que a conta faz ao fim de cada operação.
 */

export type Especie = 'RECLUSAO' | 'DETENCAO' | 'PRISAO_SIMPLES';
export type AcaoPenal = 'PUBLICA_INCONDICIONADA' | 'PUBLICA_CONDICIONADA' | 'PRIVADA';
export type Elemento = 'DOLOSO' | 'CULPOSO' | 'PRETERDOLOSO';
export type Hediondez = 'NAO' | 'HEDIONDO' | 'EQUIPARADO';
export type RegimeMulta = 'NAO' | 'CUMULATIVA' | 'ALTERNATIVA';

/** Uma fração da pena: 1/6, 2/3, 1/2. Nunca um número decimal. */
export interface Fracao { num: number; den: number }

/** Onde a regra está escrita, no acervo do vade-mécum. */
export interface Ref { norma: string; rotulo: string }

export interface TipoPenal {
  /** 'cp-157', 'cp-157-2', 'drogas-33-4'. Estável: vai para a URL do cálculo. */
  id: string;
  norma: string;
  rotulo: string;          // 'Art. 157' — como está no acervo
  forma?: string;          // '§ 2º', 'caput', '§ 3º, II' — só para a tela
  nome: string;            // 'Roubo majorado'
  especie: Especie;
  penaMinDias: number;
  penaMaxDias: number;
  multa: RegimeMulta;
  /** Quando a própria lei fixa os dias-multa (Lei de Drogas). Sem isso, art. 49: 10 a 360. */
  diasMultaMin?: number;
  diasMultaMax?: number;
  acaoPenal: AcaoPenal;
  elemento: Elemento;
  violenciaOuGraveAmeaca: boolean;
  hediondo: Hediondez;
  /** Hediondo com resultado morte: muda progressão e livramento (LEP, art. 112). */
  resultadoMorte?: boolean;
  imprescritivel: boolean;
  /** O tipo já É violência doméstica contra a mulher (129 § 9º, 129 § 13, 147-B, 24-A). */
  violenciaDomestica?: boolean;
  /** Crime contra a dignidade sexual: art. 111, V, e a exceção do art. 115. */
  dignidadeSexual?: boolean;
  /** Crime contra a administração pública: art. 33, § 4º, e a ressalva da LEP. */
  contraAdministracao?: boolean;
  /** Feminicídio (art. 121-A): LEP, art. 112, VI, d. */
  feminicidio?: boolean;
  /** A idade da vítima é elementar ou qualificadora: a agravante do art. 61, II, h, não se soma. */
  idadeElementar?: boolean;
  /** Tráfico e equiparados: art. 83, V, e art. 44 da Lei de Drogas. */
  trafico?: boolean;
  /** Redação vigente a partir de (ISO). Fato anterior cai na versão anterior, se houver. */
  vigenciaDe: string;
  vigenciaAte?: string;
  /** Ids de `Causa` específicas deste tipo (majorantes e minorantes do próprio artigo). */
  causasEspecificas: string[];
  observacoes?: string;
}

/**
 * Causa de aumento ou de diminuição (3ª fase). Fração fixa quando min e
 * max coincidem; variável quando não — e aí quem escolhe é o juiz, dentro
 * do intervalo.
 */
export interface Causa {
  id: string;
  nome: string;
  sinal: '+' | '-';
  fracaoMin: Fracao;
  fracaoMax: Fracao;
  /** Frações que a jurisprudência usa dentro do intervalo, para o seletor. */
  opcoes?: Fracao[];
  base: Ref;
  escopo: 'GERAL' | 'ESPECIFICA';
  /** 'DOBRO' e 'TRIPLO' são multiplicadores, não frações: pena × 2. */
  multiplicador?: number;
  /** Só faz sentido para crimes dolosos (tentativa) ou sem violência (art. 16). */
  condicao?: 'SEM_VIOLENCIA' | 'DOLOSO';
  vigenciaDe?: string;
  vigenciaAte?: string;
  descricao?: string;
}

/** Agravante ou atenuante (2ª fase). A fração é critério, não lei: vem do caso. */
export interface Circunstancia {
  id: string;
  nome: string;
  sinal: '+' | '-';
  base: Ref;
  /** Art. 67: motivos, personalidade e reincidência preponderam. Menoridade também (STJ). */
  preponderante?: boolean;
  /** Papel especial no motor: a reincidência vem do caso, a menoridade da data de nascimento. */
  chave?: 'REINCIDENCIA' | 'CONFISSAO' | 'MENORIDADE' | 'SENILIDADE' | 'VIOLENCIA_MULHER' | 'VITIMA_VULNERAVEL';
}

/** As oito do art. 59. */
export type Circunstancia59 =
  | 'culpabilidade' | 'antecedentes' | 'conduta_social' | 'personalidade'
  | 'motivos' | 'circunstancias' | 'consequencias' | 'comportamento_vitima';

export interface CrimeDoCaso {
  tipoId: string;
  /** As circunstâncias do art. 59 valoradas NEGATIVAMENTE. */
  circunstancias59: Circunstancia59[];
  agravantes: string[];
  atenuantes: string[];
  causas: { id: string; fracao: Fracao }[];
}

export type Concurso = 'UNICO' | 'MATERIAL' | 'FORMAL' | 'FORMAL_IMPROPRIO' | 'CONTINUADO';

export interface DatasDoCaso {
  fato: string;
  /** Crime permanente: o dia em que cessou a permanência (art. 111, III). */
  cessacao?: string;
  conhecimentoAutoria?: string;
  representacao?: string;
  recebimentoDenuncia?: string;
  pronuncia?: string;
  confirmacaoPronuncia?: string;
  sentenca?: string;
  transitoAcusacao?: string;
  transitoAmbos?: string;
  inicioCumprimento?: string;
  ultimoAtoQuerelante?: string;
  morteQuerelante?: string;
  /** Dias de prisão provisória, para a detração (art. 42). */
  prisaoProvisoriaDias?: number;
  /** "Hoje" do cálculo; ausente = data corrente. Fixo nos testes. */
  hoje?: string;
}

export interface Agente {
  nascimento?: string;
  reincidente: boolean;
  /** A condenação anterior foi por crime doloso (arts. 44, II, e 77, I)? */
  reincidenteDoloso?: boolean;
  /** Pelo mesmo crime / crime da mesma natureza (arts. 44, § 3º, e 83, V)? */
  reincidenteEspecifico?: boolean;
  transitoAnterior?: string;
  /** Data em que a pena anterior foi cumprida ou extinta (art. 64, I). */
  extincaoAnterior?: string;
  bonsAntecedentes?: boolean;
  confessou?: boolean;
}

export interface Vitima {
  nascimento?: string;
  mulher?: boolean;
  /** Contexto de violência doméstica e familiar (Lei 11.340/06, art. 5º). */
  violenciaDomestica?: boolean;
}

export interface Criterios {
  /** 1ª fase: 1/8 do intervalo (STJ) ou 1/6 da pena mínima. */
  fase1: 'OITAVO_INTERVALO' | 'SEXTO_MINIMO';
  /** 2ª fase: fração por agravante/atenuante, sobre a pena-base. */
  fase2: Fracao;
  /** 3ª fase: cada causa sobre o resultado da anterior (cascata) ou todas sobre a pena da 2ª fase. */
  fase3: 'CASCATA' | 'SOMA';
  /** Art. 68, p. ún.: com mais de uma causa específica do mesmo sinal, aplicar só a maior. */
  art68Unico: boolean;
  /** Termo inicial da executória: trânsito para ambos (Tema 788 STF) ou para a acusação (art. 112, I). */
  termoInicialExecutoria: 'TEMA_788' | 'ART_112_LITERAL';
  /** Em reais; muda todo ano e a tela pede para conferir. */
  salarioMinimo: number;
  /** Fração do salário mínimo por dia-multa (art. 49, § 1º: 1/30 a 5). */
  valorDiaMulta: Fracao;
}

export interface Caso {
  crimes: CrimeDoCaso[];
  concurso: Concurso;
  datas: DatasDoCaso;
  agente: Agente;
  vitima: Vitima;
  criterios: Criterios;
}

/* ------------------------------------------------------------------ */
/*  Saída                                                              */
/* ------------------------------------------------------------------ */

export interface Passo {
  fase: 0 | 1 | 2 | 3 | 4;   // 0 = pena cominada; 4 = concurso/unificação
  titulo: string;
  detalhe: string;
  base: Ref;
  deDias: number;
  paraDias: number;
  /** Texto da fração aplicada ("1/6", "×2"), quando houver. */
  fracao?: string;
}

export interface PenaDoCrime {
  tipoId: string;
  nome: string;
  rotuloCompleto: string;   // 'CP, art. 157, § 2º'
  especie: Especie;
  penaBaseDias: number;
  penaIntermediariaDias: number;
  penaDefinitivaDias: number;
  /** Pena máxima em abstrato, já com majorantes e minorantes (para a prescrição). */
  maximaAbstrataDias: number;
  minimaAbstrataDias: number;
  diasMulta: number | null;
  memoria: Passo[];
  avisos: string[];
}

export interface Unificacao {
  regra: Concurso;
  totalDias: number;
  especiePrevalente: Especie;
  /** Limite de cumprimento do art. 75 (30 ou 40 anos, pela data do fato). */
  limiteCumprimentoDias: number;
  passos: Passo[];
  diasMultaTotal: number | null;
  multaReais: number | null;
}

export type Regime = 'FECHADO' | 'SEMIABERTO' | 'ABERTO';

export interface Consequencias {
  regime: { inicial: Regime; fundamento: string; base: Ref; penaConsideradaDias: number; avisos: string[] };
  substituicao: { cabivel: boolean | 'DEPENDE'; motivo: string; base: Ref };
  sursis: { cabivel: boolean | 'DEPENDE'; modalidade?: 'SIMPLES' | 'ETARIO_HUMANITARIO'; motivo: string; base: Ref };
  despenalizadores: { nome: string; cabivel: boolean | 'DEPENDE'; motivo: string; base: Ref }[];
  execucao: {
    versao: string;
    progressao: { fracaoTexto: string; diasNecessarios: number; fundamento: string; base: Ref; data?: string };
    livramento: { cabivel: boolean; fracaoTexto?: string; diasNecessarios?: number; fundamento: string; base: Ref; data?: string };
  };
}

export type Modalidade = 'PUNITIVA_ABSTRATA' | 'RETROATIVA' | 'INTERCORRENTE' | 'EXECUTORIA' | 'MULTA';

export interface PrazoPrescricional {
  modalidade: Modalidade;
  penaReferenciaDias: number;
  prazoMeses: number;
  /** Como o prazo foi construído: tabela do 109, metade do 115, +1/3 do 110. */
  composicao: string[];
  base: Ref[];
}

export interface Trecho {
  fase: 'INQUERITO' | 'INSTRUCAO' | 'JURI' | 'RECURSO' | 'EXECUCAO';
  titulo: string;
  inicio: string;
  fim: string | null;            // null = ainda corre
  marcoInicial: string;
  marcoFinal: string;
  modalidade: Modalidade | 'NENHUMA';
  prazoMeses: number | null;
  vencimento: string | null;
  situacao: 'PRESCRITO' | 'CORRENDO' | 'INTERROMPIDO' | 'FALTA_DADO' | 'IMPRESCRITIVEL' | 'NAO_CORRE';
  explicacao: string;
  diasCorridos: number | null;
  diasRestantes: number | null;
}

export interface PrescricaoDoCrime {
  tipoId: string;
  nome: string;
  imprescritivel: boolean;
  prazos: PrazoPrescricional[];
  trechos: Trecho[];
  faseAtual: Trecho['fase'] | 'FATO';
  avisos: string[];
}

export interface Decadencia {
  aplicavel: boolean;
  motivo: string;
  prazoMeses?: number;
  termoInicial?: string;
  ultimoDia?: string;
  consumadaEm?: string;
  situacao?: 'DECAIU' | 'NO_PRAZO' | 'EXERCIDA' | 'FALTA_DADO';
  base: Ref[];
}

export interface Perempcao {
  aplicavel: boolean;
  motivo: string;
  hipoteses: { inciso: string; descricao: string; prazoDias?: number; termoInicial?: string; ultimoDia?: string; situacao?: 'PEREMPTA' | 'NO_PRAZO' | 'FALTA_DADO' }[];
  base: Ref[];
}

export interface Derivado {
  rotulo: string;
  valor: string;
  efeito?: string;
  base?: Ref;
}

export interface Resultado {
  crimes: PenaDoCrime[];
  unificacao: Unificacao;
  consequencias: Consequencias;
  prescricao: PrescricaoDoCrime[];
  decadencia: Decadencia;
  perempcao: Perempcao;
  ficha: Derivado[];
  avisos: string[];
  /** Data usada como "hoje" — para a tela dizer quando o cálculo vale. */
  hoje: string;
}
