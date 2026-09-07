/**
 * Lê a pena escrita na lei — "reclusão, de 6 (seis) a 10 (dez) anos, e
 * multa" — e devolve números (§5.12).
 *
 * Serve a duas coisas: ao script `scripts/extrair-penas.mjs`, que gera o
 * RASCUNHO do catálogo a partir do acervo para um humano revisar, e ao
 * teste de integração, que confere se a pena catalogada à mão continua
 * igual à do texto oficial. O que a lei escreve de dez jeitos ("um mês a
 * um ano", "15 (quinze) dias a 6 (seis) meses", "de vinte e quatro a
 * trinta anos") vira um objeto só.
 */

import type { Especie, RegimeMulta } from './tipos.ts';
import { dias } from './tempo.ts';

export interface PenaLida {
  especie: Especie;
  minDias: number;
  maxDias: number;
  multa: RegimeMulta;
  diasMultaMin?: number;
  diasMultaMax?: number;
  /** O trecho de onde a pena foi lida. */
  trecho: string;
}

const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
};

/** "24 (vinte e quatro)" → 24; "vinte e quatro" → 24; "1.500 (mil e quinhentos)" → 1500. */
function numero(s: string): number | null {
  const limpo = s.trim().toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const arabico = limpo.match(/^\d[\d.]*/);
  if (arabico) return Number(arabico[0].replace(/\./g, ''));
  const partes = limpo.split(/\s+e\s+/);
  let total = 0;
  for (const p of partes) {
    if (!(p in NUMEROS)) return null;
    total += NUMEROS[p];
  }
  return total || null;
}

const UNIDADE = /(anos?|meses|mês|dias?)/;

function emDias(valor: number, unidade: string): number {
  if (unidade.startsWith('ano')) return dias(valor);
  if (unidade.startsWith('m')) return dias(0, valor);
  return valor;
}

/**
 * Procura, num trecho de texto, o padrão "ESPÉCIE[,] de X [unidade] a Y
 * unidade[, e/ou multa]". A unidade do mínimo pode estar omitida ("de 6
 * (seis) a 10 (dez) anos"), e aí é a mesma do máximo.
 */
export function lerPena(texto: string): PenaLida | null {
  const t = texto.replace(/\s+/g, ' ');
  const re = /(reclus[ãa]o|deten[çc][ãa]o|pris[ãa]o simples)\s*,?\s*de\s+(.+?)\s+a\s+(.+?)\s*(anos?|meses|mês|dias?)\b(.{0,120})/i;
  const m = t.match(re);
  if (!m) return null;
  const especie: Especie = /reclus/i.test(m[1]) ? 'RECLUSAO' : /deten/i.test(m[1]) ? 'DETENCAO' : 'PRISAO_SIMPLES';
  const unidadeMax = m[4].toLowerCase();

  // o mínimo pode trazer a própria unidade: "de três meses a um ano", "de 15 (quinze) dias a 6 (seis) meses"
  const minBruto = m[2];
  const uMin = minBruto.match(new RegExp(`^(.+?)\\s+${UNIDADE.source}$`, 'i'));
  const minValor = numero(uMin ? uMin[1] : minBruto);
  const maxValor = numero(m[3]);
  if (minValor === null || maxValor === null) return null;
  const minDias = emDias(minValor, uMin ? uMin[2].toLowerCase() : unidadeMax);
  const maxDias = emDias(maxValor, unidadeMax);

  const cauda = m[5];
  let multa: RegimeMulta = 'NAO';
  if (/^\s*,?\s*(e|,)\s*multa/i.test(cauda) || /^\s*,?\s*e\s+(o\s+)?pagamento\s+de/i.test(cauda) || /^\s*,?\s*al[ée]m da multa/i.test(cauda)) multa = 'CUMULATIVA';
  else if (/^\s*,?\s*ou\s+multa/i.test(cauda)) multa = 'ALTERNATIVA';

  const dm = cauda.match(/(?:pagamento de|multa de)\s+(.+?)\s+a\s+(.+?)\s+dias-multa/i);
  const diasMultaMin = dm ? numero(dm[1]) ?? undefined : undefined;
  const diasMultaMax = dm ? numero(dm[2]) ?? undefined : undefined;

  return { especie, minDias, maxDias, multa, diasMultaMin, diasMultaMax, trecho: m[0].slice(0, 160) };
}

const norm = (s: string) => s.replace(/[°º]/g, 'º').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * A pena de uma FORMA do artigo: do caput (a primeira linha "Pena" do
 * texto) ou de um parágrafo/inciso ("§ 2º", "§ 3º, II"). Para o parágrafo,
 * a pena está na própria linha ("§ 4º A pena é de reclusão, de 2 a 8
 * anos") ou na linha "Pena" logo abaixo dele (depois dos incisos que
 * enumeram as hipóteses).
 */
export function penaDaForma(textoDoArtigo: string, forma?: string): PenaLida | null {
  const linhas = textoDoArtigo.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!forma || forma === 'caput') {
    /* A ÚLTIMA linha "Pena" antes do primeiro parágrafo: quando o Planalto
       mantém a redação antiga sem riscá-la (art. 24-A da Maria da Penha), a
       vigente é a que vem depois. */
    let ultima: PenaLida | null = null;
    for (const linha of linhas) {
      if (/^§|^Parágrafo único/i.test(linha)) break;   // a pena do caput vem antes do primeiro parágrafo
      const lida = /^Pena/i.test(linha) ? lerPena(linha) : null;
      if (lida) ultima = lida;
    }
    if (ultima) return ultima;
    // caput sem linha "Pena" própria (pena inline)
    for (const linha of linhas) { if (/^§|^Parágrafo único/i.test(linha)) break; const lida = lerPena(linha); if (lida) return lida; }
    return null;
  }

  const [paragrafo, inciso] = forma.split(',').map((s) => s.trim());
  const alvoParagrafo = norm(paragrafo);
  let i = linhas.findIndex((l) => norm(l).startsWith(alvoParagrafo + ' ') || norm(l).startsWith(alvoParagrafo + '.') || norm(l).startsWith(alvoParagrafo + '-') || norm(l) === alvoParagrafo);
  if (i < 0) return null;
  if (inciso) {
    const alvoInciso = inciso.toLowerCase();
    for (let j = i + 1; j < linhas.length; j++) {
      if (/^§|^Parágrafo único/i.test(linhas[j])) break;
      if (new RegExp(`^${alvoInciso}\\s*[-–—]`, 'i').test(linhas[j])) return lerPena(linhas[j]);
    }
    return null;
  }
  const naLinha = lerPena(linhas[i]);
  if (naLinha) return naLinha;
  for (let j = i + 1; j < linhas.length; j++) {
    if (/^§|^Parágrafo único/i.test(linhas[j])) break;
    if (/^Pena/i.test(linhas[j])) return lerPena(linhas[j]);
  }
  return null;
}
