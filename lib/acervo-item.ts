/**
 * A Biblioteca da empresa — a parte PURA: tipos, validação, corte de
 * assuntos e montagem de filtro (migração db/042).
 *
 * Mora separada de `acervo.ts` (que consulta o banco) pelo mesmo motivo
 * que `admin-cursos-form.ts` e `vademecum-texto.ts` moram separados dos
 * seus pares: o FORMULÁRIO do RH é componente de cliente e precisa
 * destas funções. Importando-as do módulo com as consultas, o driver do
 * Postgres ia junto para o bundle do navegador — o build quebra pedindo
 * `dns`, `net` e `fs`, e é assim que se descobre.
 *
 * O outro ganho é o teste: aqui nada precisa de Postgres, então
 * `acervo.test.ts` roda sempre — e não em silêncio, pulado, quando
 * falta o DATABASE_URL.
 */
export type FormatoAcervo = 'PDF' | 'LINK';
export type StatusAcervo = 'RASCUNHO' | 'PUBLICADO';

export interface ItemAcervo {
  id: number;
  titulo: string;
  autor: string | null;
  assuntos: string[];
  descricao: string | null;
  formato: FormatoAcervo;
  arquivo: string | null;
  bytes: number | null;
  url: string | null;
  capa: string | null;
  ano: number | null;
  editora: string | null;
  setorId: number | null;
  setorNome: string | null;
  status: StatusAcervo;
  criadoEm: Date;
}

/* ------------------------------------------------------------------ *
 * Parte pura
 * ------------------------------------------------------------------ */

/**
 * "LGPD, Compliance ,, liderança" → ['LGPD', 'Compliance', 'liderança'].
 *
 * O RH digita etiquetas numa linha só, separadas por vírgula — pedir um
 * campo por assunto seria um formulário que cresce sozinho. Sobra
 * sujeira previsível: espaço em volta, vírgula final, item repetido.
 * Tudo isso morre aqui, e não no banco, para o RH não descobrir depois
 * que publicou uma etiqueta chamada " LGPD" que nenhum filtro acha.
 *
 * A comparação de repetido é sem acento e sem caixa ("LGPD" e "lgpd" são
 * o mesmo assunto), mas o que fica guardado é a PRIMEIRA grafia que a
 * pessoa escreveu: é ela que aparece no chip.
 */
export function partirAssuntos(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of texto.split(',')) {
    const limpo = bruto.trim().replace(/\s+/g, ' ');
    if (!limpo) continue;
    const chave = dobrar(limpo);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(limpo);
  }
  return saida;
}

/** Sem acento e em minúscula — a mesma regra do filtro do catálogo. */
export const dobrar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Volta ao texto do formulário: o inverso de `partirAssuntos`. */
export const juntarAssuntos = (assuntos: readonly string[]) => assuntos.join(', ');

export interface RascunhoItem {
  titulo: string;
  autor?: string | null;
  assuntos: string[];
  descricao?: string | null;
  formato: FormatoAcervo;
  arquivo?: string | null;
  url?: string | null;
  capa?: string | null;
  ano?: number | null;
  editora?: string | null;
  setorId?: number | null;
}

/**
 * O que impede um item quebrado de chegar ao banco. Devolve a mensagem
 * do primeiro problema, ou `null` quando está tudo certo.
 *
 * Existe além do CHECK da migração porque a mensagem é diferente: o
 * banco derruba a transação com "violates check constraint
 * acervo_tem_conteudo", e o RH precisa ler "Escolha o arquivo PDF".
 */
export function validarItem(item: RascunhoItem, anoAtual = new Date().getFullYear()): string | null {
  if (!item.titulo?.trim()) return 'O título é obrigatório.';
  if (item.titulo.trim().length > 300) return 'O título é longo demais (máximo de 300 caracteres).';
  if (item.formato === 'PDF' && !item.arquivo) {
    return 'Envie o arquivo PDF, ou troque o formato para Link.';
  }
  if (item.formato === 'LINK') {
    const url = item.url?.trim();
    if (!url) return 'Informe o endereço do link, ou troque o formato para PDF.';
    /* Só http(s). Sem esta linha, um `javascript:` colado no campo
       viraria link clicável na tela de toda a equipe — o alvo do link é
       dado que veio de formulário, não código nosso. */
    if (!/^https?:\/\/\S+$/i.test(url)) {
      return 'O endereço precisa começar com http:// ou https://.';
    }
  }
  if (item.ano != null) {
    if (!Number.isInteger(item.ano)) return 'O ano precisa ser um número inteiro.';
    // Um ano futuro é erro de digitação; o ano que vem é edição adiantada.
    if (item.ano < 1400 || item.ano > anoAtual + 1) {
      return `O ano precisa estar entre 1400 e ${anoAtual + 1}.`;
    }
  }
  if (item.assuntos.length > 20) return 'No máximo 20 assuntos por item.';
  return null;
}

export interface FiltroAcervo {
  busca?: string | null;
  assunto?: string | null;
  autor?: string | null;
  formato?: string | null;
}

/**
 * Os filtros da tela, normalizados: vazio e espaço em branco viram
 * `null`, e formato desconhecido é descartado em vez de virar `WHERE
 * formato = 'qualquer coisa'` — o parâmetro vem da barra de endereço,
 * onde qualquer um digita o que quiser.
 */
export function montarFiltro(bruto: FiltroAcervo) {
  const limpar = (v: string | null | undefined) => {
    const t = (v ?? '').trim();
    return t === '' ? null : t;
  };
  const formato = limpar(bruto.formato);
  return {
    busca: limpar(bruto.busca),
    assunto: limpar(bruto.assunto),
    autor: limpar(bruto.autor),
    formato: formato === 'PDF' || formato === 'LINK' ? (formato as FormatoAcervo) : null,
  };
}

/** "2,4 MB" — o peso do arquivo dito de um jeito que se lê. */
export function tamanhoLegivel(bytes: number | null | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  const mb = bytes / 1024 ** 2;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(1).replace('.', ',')} MB`;
}
