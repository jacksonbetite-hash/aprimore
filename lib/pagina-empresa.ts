import type { PaginaEmpresa, Personalizacao, SecaoPagina } from './portal.ts';

/**
 * A página pública da universidade corporativa — a parte pura
 * (`docs/plano-pagina-da-universidade.md`, §3.1, 3.2, 3.6).
 *
 * Três camadas, nesta ordem de precedência:
 *
 *   1. o que a EMPRESA preencheu (`portal.personalizacao.pagina`);
 *   2. o padrão que o ADMINISTRADOR editou em /admin
 *      (`configuracao['pagina-universidade']`);
 *   3. o padrão do código, aqui embaixo (`PADRAO`).
 *
 * Campo vazio numa camada cai para a seguinte: a página nunca fica com
 * buraco porque o RH apagou um texto. Chaves de seção (`secoes`) e os
 * dois booleanos seguem a mesma regra, com `true` como padrão.
 *
 * Este módulo não toca o banco nem o React, para os testes o carregarem.
 */

export const SECOES: readonly SecaoPagina[] = [
  'compromisso', 'experiencia', 'biblioteca', 'multiplataforma', 'gestao', 'contato', 'pedidoAcesso',
];

export const ROTULO_SECAO: Record<SecaoPagina, string> = {
  compromisso: 'Nosso compromisso (quatro pilares)',
  experiencia: 'O ambiente do colaborador (quatro etapas)',
  biblioteca: 'Biblioteca corporativa',
  multiplataforma: 'Acesso em qualquer dispositivo',
  gestao: 'Para o RH: métricas e governança',
  contato: 'Formulário de demonstração da plataforma',
  pedidoAcesso: 'Fale com o RH (pedido de acesso)',
};

/**
 * Os ícones que um pilar pode usar. Lista fechada: `Icone` (app/ui.tsx)
 * só desenha o que existe, e nome fora da lista renderiza NADA, sem erro
 * — um `<select>` com estes nomes é o que impede o pilar de ficar sem
 * ícone porque alguém digitou "coração".
 */
export const ICONES_PILAR: { nome: string; rotulo: string }[] = [
  { nome: 'favorite', rotulo: 'Coração' },
  { nome: 'trending_up', rotulo: 'Crescimento' },
  { nome: 'military_tech', rotulo: 'Medalha' },
  { nome: 'psychology', rotulo: 'Mente' },
  { nome: 'school', rotulo: 'Formatura' },
  { nome: 'groups', rotulo: 'Equipe' },
  { nome: 'verified', rotulo: 'Selo' },
  { nome: 'lightbulb', rotulo: 'Ideia' },
  { nome: 'handshake', rotulo: 'Aperto de mão' },
  { nome: 'security', rotulo: 'Escudo' },
  { nome: 'auto_stories', rotulo: 'Livro' },
  { nome: 'workspace_premium', rotulo: 'Prêmio' },
];

export interface PaginaResolvida {
  titulo: string;
  subtitulo: string;
  provas: string[];
  citacao: string;
  pilares: { icone: string; titulo: string; texto: string }[];
  contatoTitulo: string;
  contatoTexto: string;
  contatoEmail: string;
  rodapeDescricao: string;
  /** null = a foto padrão da plataforma (leva o selo "ilustrativa"). */
  fotoAbertura: string | null;
  fotoCelular: string | null;
  secoes: Record<SecaoPagina, boolean>;
  mostrarNumeros: boolean;
  assinatura: boolean;
  links: { termos: string | null; privacidade: string | null };
}

/** O texto de fábrica — o que o protótipo de 10/09/2026 trazia. */
export const PADRAO: Omit<PaginaResolvida, 'fotoAbertura' | 'fotoCelular' | 'secoes' | 'mostrarNumeros' | 'assinatura' | 'links'> = {
  titulo: 'Potencialize o talento do seu time com uma cultura viva de *aprendizado e evolução*',
  subtitulo: 'Mais do que capacitar: valorizamos as pessoas da sua organização com um ambiente '
    + 'moderno onde cada colaborador aprende no seu ritmo, comprova seu domínio com testes '
    + 'práticos, conquista certificações e constrói sua trajetória profissional.',
  provas: ['Sem fidelidade obrigatória', 'Ambiente 100% privativo e seguro', 'Acesso via Web, Tablet e Celular'],
  citacao: 'Uma equipe capacitada e valorizada transforma conhecimento em inovação e alta retenção de talentos.',
  pilares: [
    { icone: 'favorite', titulo: 'Valor com os Colaboradores',
      texto: 'Ofereça um benefício real e transformador. Colaboradores que sentem que a empresa se preocupa com seu desenvolvimento profissional são mais engajados e leais.' },
    { icone: 'trending_up', titulo: 'Evolução de Carreira',
      texto: 'Estruture planos de desenvolvimento individuais (PDI) com trilhas de aprendizagem claras para novas lideranças, técnicos e times operacionais prontos para crescer.' },
    { icone: 'military_tech', titulo: 'Reconhecimento e Mérito',
      texto: 'A cada módulo e ciclo concluído, o colaborador recebe certificados verificáveis para enriquecer seu currículo e comprovar sua qualificação técnica.' },
    { icone: 'psychology', titulo: 'Microlearning Humanizado',
      texto: 'Conteúdo focado de 8 a 15 minutos que respeita a rotina corrida de trabalho. O colaborador aprende sem sobrecarga e aplica o conhecimento imediatamente no dia a dia.' },
  ],
  contatoTitulo: 'Construa a Universidade Corporativa da sua empresa',
  contatoTexto: 'Nossos consultores pedagógicos e técnicos ajudam você a desenhar a melhor estrutura '
    + 'de capacitação para o tamanho da sua equipe.',
  contatoEmail: 'corporativo@aprimoree.com.br',
  rodapeDescricao: 'Plataforma de educação corporativa contínua: conhecimento aplicado, valorização '
    + 'das pessoas e crescimento da organização.',
};

/** Limites por campo — os mesmos do formulário e da validação. */
export const LIMITES = {
  titulo: 160, subtitulo: 400, prova: 60, citacao: 200,
  pilarTitulo: 60, pilarTexto: 300, contatoTitulo: 120, contatoTexto: 400,
  contatoEmail: 120, rodapeDescricao: 300, url: 300,
} as const;

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const cheio = (...c: string[]) => c.find((x) => x !== '') ?? '';

/**
 * Junta as três camadas. `empresa` e `admin` são o que veio do banco
 * (podem ser parciais, vazios ou ausentes); o resultado é sempre inteiro.
 */
export function resolverPagina(
  empresa: Personalizacao | null | undefined,
  admin: PaginaEmpresa | null | undefined,
): PaginaResolvida {
  const e = empresa?.pagina ?? {};
  const a = admin ?? {};

  const provas = [0, 1, 2].map((i) =>
    cheio(texto(e.provas?.[i]), texto(a.provas?.[i]), PADRAO.provas[i]));

  const pilares = [0, 1, 2, 3].map((i) => {
    const pe = e.pilares?.[i]; const pa = a.pilares?.[i]; const pp = PADRAO.pilares[i];
    // Um pilar da empresa vale inteiro: título dela com texto do padrão
    // seria uma frase de duas vozes. Só o ícone cai para o padrão.
    if (pe && texto(pe.titulo) && texto(pe.texto)) {
      return { icone: iconeValido(pe.icone) ?? pp.icone, titulo: texto(pe.titulo), texto: texto(pe.texto) };
    }
    if (pa && texto(pa.titulo) && texto(pa.texto)) {
      return { icone: iconeValido(pa.icone) ?? pp.icone, titulo: texto(pa.titulo), texto: texto(pa.texto) };
    }
    return pp;
  });

  const secoes = Object.fromEntries(
    SECOES.map((s) => [s, e.secoes?.[s] ?? a.secoes?.[s] ?? true]),
  ) as Record<SecaoPagina, boolean>;

  return {
    titulo: cheio(texto(e.titulo), texto(a.titulo), PADRAO.titulo),
    subtitulo: cheio(texto(e.subtitulo), texto(a.subtitulo), PADRAO.subtitulo),
    provas,
    citacao: cheio(texto(e.citacao), texto(a.citacao), PADRAO.citacao),
    pilares,
    contatoTitulo: cheio(texto(e.contatoTitulo), texto(a.contatoTitulo), PADRAO.contatoTitulo),
    contatoTexto: cheio(texto(e.contatoTexto), texto(a.contatoTexto), PADRAO.contatoTexto),
    contatoEmail: cheio(texto(e.contatoEmail), texto(a.contatoEmail), PADRAO.contatoEmail),
    rodapeDescricao: cheio(texto(e.rodapeDescricao), texto(a.rodapeDescricao), PADRAO.rodapeDescricao),
    fotoAbertura: texto(e.fotoAbertura) || null,
    fotoCelular: texto(e.fotoCelular) || null,
    secoes,
    mostrarNumeros: e.mostrarNumeros ?? a.mostrarNumeros ?? true,
    assinatura: e.assinatura ?? a.assinatura ?? true,
    links: {
      termos: urlValida(e.links?.termos) ?? null,
      privacidade: urlValida(e.links?.privacidade) ?? null,
    },
  };
}

export function iconeValido(nome: unknown): string | null {
  return typeof nome === 'string' && ICONES_PILAR.some((i) => i.nome === nome) ? nome : null;
}

/** Só http(s) absoluto ou caminho local — nada de `javascript:` num href. */
export function urlValida(v: unknown): string | null {
  const s = texto(v);
  if (!s) return null;
  return /^(https?:\/\/[^\s]+|\/[^\s]*)$/i.test(s) && s.length <= LIMITES.url ? s : null;
}

/** Só a imagem que o próprio upload devolve (`/api/imagem/<id>`). */
export function fotoValida(v: unknown): string | null {
  const s = texto(v);
  return /^\/api\/imagem\/[A-Za-z0-9._-]{1,120}$/.test(s) ? s : null;
}

/** O `<em>` do título: `*trecho*` vira a parte na cor do portal. */
export function partesDoTitulo(titulo: string): { texto: string; destaque: boolean }[] {
  return titulo.split(/\*([^*]+)\*/).map((t, i) => ({ texto: t, destaque: i % 2 === 1 }))
    .filter((p) => p.texto !== '');
}

/**
 * Do formulário (chave/valor em texto) para o objeto que vai ao JSONB.
 * Corta pelo limite, valida ícone, foto e URL, e DESCARTA o que ficou
 * vazio — o JSON guardado é só o que a pessoa preencheu, e é isso que faz
 * "vazio = padrão" funcionar na leitura. Lança com a mensagem que ela vai
 * ler quando um valor não presta.
 */
export function lerPaginaDoFormulario(
  campo: (nome: string) => string,
  opcoes: { comFotos?: boolean; comChaves?: boolean } = {},
): PaginaEmpresa {
  const corte = (nome: string, max: number) => campo(nome).trim().slice(0, max);
  const p: PaginaEmpresa = {};

  const t = corte('titulo', LIMITES.titulo); if (t) p.titulo = t;
  const st = corte('subtitulo', LIMITES.subtitulo); if (st) p.subtitulo = st;
  const provas = [0, 1, 2].map((i) => corte(`prova${i}`, LIMITES.prova));
  if (provas.some(Boolean)) p.provas = provas;
  const c = corte('citacao', LIMITES.citacao); if (c) p.citacao = c;

  const pilares = [0, 1, 2, 3].map((i) => ({
    icone: campo(`pilarIcone${i}`).trim(),
    titulo: corte(`pilarTitulo${i}`, LIMITES.pilarTitulo),
    texto: corte(`pilarTexto${i}`, LIMITES.pilarTexto),
  }));
  for (const [i, pl] of pilares.entries()) {
    if ((pl.titulo && !pl.texto) || (!pl.titulo && pl.texto)) {
      throw new Error(`O pilar ${i + 1} precisa de título E texto — ou dos dois vazios, para usar o padrão.`);
    }
    if (pl.icone && !iconeValido(pl.icone)) throw new Error(`Ícone do pilar ${i + 1} não existe.`);
  }
  if (pilares.some((pl) => pl.titulo)) {
    p.pilares = pilares.map((pl) => ({ ...pl, icone: iconeValido(pl.icone) ?? '' }));
  }

  const ct = corte('contatoTitulo', LIMITES.contatoTitulo); if (ct) p.contatoTitulo = ct;
  const cx = corte('contatoTexto', LIMITES.contatoTexto); if (cx) p.contatoTexto = cx;
  const ce = corte('contatoEmail', LIMITES.contatoEmail);
  if (ce) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ce)) throw new Error('O e-mail de contato não parece um e-mail.');
    p.contatoEmail = ce;
  }
  const rd = corte('rodapeDescricao', LIMITES.rodapeDescricao); if (rd) p.rodapeDescricao = rd;

  if (opcoes.comFotos) {
    for (const nome of ['fotoAbertura', 'fotoCelular'] as const) {
      const v = campo(nome).trim();
      if (v && !fotoValida(v)) throw new Error('A foto precisa ser enviada pelo botão — cole só o endereço que ele devolve.');
      if (v) p[nome] = v;
    }
    const links: { termos?: string; privacidade?: string } = {};
    for (const nome of ['termos', 'privacidade'] as const) {
      const v = campo(`link${nome[0].toUpperCase()}${nome.slice(1)}`).trim();
      if (v && !urlValida(v)) throw new Error(`O link de ${nome} precisa começar com https://.`);
      if (v) links[nome] = v;
    }
    if (Object.keys(links).length) p.links = links;
  }

  if (opcoes.comChaves) {
    // Checkbox desmarcada não viaja no FormData: a lista de chaves que o
    // formulário mostrou vem em `secoesConhecidas`, e as ausentes dela
    // são as desligadas.
    const conhecidas = campo('secoesConhecidas').split(',').map((s) => s.trim()).filter(Boolean);
    if (conhecidas.length) {
      const secoes: Partial<Record<SecaoPagina, boolean>> = {};
      for (const s of SECOES) {
        if (conhecidas.includes(s) && campo(`secao_${s}`) !== 'on') secoes[s] = false;
      }
      if (Object.keys(secoes).length) p.secoes = secoes;
      if (campo('mostrarNumeros') !== 'on') p.mostrarNumeros = false;
      if (campo('assinatura') !== 'on') p.assinatura = false;
    }
  }

  return p;
}
