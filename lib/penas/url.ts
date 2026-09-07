/**
 * O caso vira URL e a URL vira caso (§5.12).
 *
 * O estado do cálculo mora no endereço, não numa sessão: quem cola o link
 * no grupo de estudo abre o MESMO cálculo, e a página do resultado é
 * renderizada no servidor a partir dele. O formato é JSON em base64url —
 * legível por qualquer linguagem, e sem os caracteres que a query string
 * maltrata.
 *
 * Tudo o que entra é saneado: data inválida cai, número fora de faixa é
 * contido, id desconhecido é ignorado. URL montada à mão não derruba a
 * página — no máximo produz um cálculo vazio.
 */

import type { Caso, Circunstancia59, Concurso, Fracao } from './tipos.ts';
import { dataValida, hojeISO, F } from './tempo.ts';

/** Salário mínimo de referência (2026). A tela pede para conferir. */
export const SALARIO_MINIMO_PADRAO = 1621;

export function casoInicial(fato = hojeISO()): Caso {
  return {
    crimes: [],
    concurso: 'UNICO',
    datas: { fato },
    agente: { reincidente: false },
    vitima: {},
    criterios: {
      fase1: 'OITAVO_INTERVALO', fase2: F.UM_SEXTO, fase3: 'CASCATA', art68Unico: false,
      termoInicialExecutoria: 'TEMA_788', salarioMinimo: SALARIO_MINIMO_PADRAO, valorDiaMulta: { num: 1, den: 30 },
    },
  };
}

export function crimeVazio(tipoId: string): Caso['crimes'][number] {
  return { tipoId, circunstancias59: [], agravantes: [], atenuantes: [], causas: [] };
}

/* ---- base64url que funciona no Node e no navegador ---- */

function paraBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(s: string): string | null {
  try {
    const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function serializarCaso(caso: Caso): string {
  return paraBase64Url(JSON.stringify(caso));
}

export function desserializarCaso(param: string | undefined | null): Caso | null {
  if (!param) return null;
  const json = deBase64Url(param);
  if (!json) return null;
  try {
    return normalizarCaso(JSON.parse(json));
  } catch {
    return null;
  }
}

/* ---- saneamento ---- */

const CIRC59: Circunstancia59[] = ['culpabilidade', 'antecedentes', 'conduta_social', 'personalidade', 'motivos', 'circunstancias', 'consequencias', 'comportamento_vitima'];
const CONCURSOS: Concurso[] = ['UNICO', 'MATERIAL', 'FORMAL', 'FORMAL_IMPROPRIO', 'CONTINUADO'];

const data = (v: unknown): string | undefined => (typeof v === 'string' && dataValida(v) ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const texto = (v: unknown, max = 60): string | undefined => (typeof v === 'string' && v.length <= max ? v : undefined);
const lista = (v: unknown, max = 40): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length <= max).slice(0, 40) : []);
const inteiro = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined;
};
function fracao(v: unknown, padrao: Fracao): Fracao {
  if (v && typeof v === 'object') {
    const num = inteiro((v as Fracao).num, 1, 12), den = inteiro((v as Fracao).den, 1, 100);
    if (num && den) return { num, den };
  }
  return padrao;
}

/** Aceita qualquer objeto e devolve um `Caso` bem formado. */
export function normalizarCaso(bruto: unknown): Caso {
  const base = casoInicial();
  if (!bruto || typeof bruto !== 'object') return base;
  const b = bruto as Record<string, unknown>;

  const crimes = Array.isArray(b.crimes) ? b.crimes.slice(0, 10).flatMap((c) => {
    if (!c || typeof c !== 'object') return [];
    const cr = c as Record<string, unknown>;
    const tipoId = texto(cr.tipoId);
    if (!tipoId) return [];
    return [{
      tipoId,
      circunstancias59: lista(cr.circunstancias59).filter((x): x is Circunstancia59 => (CIRC59 as string[]).includes(x)),
      agravantes: lista(cr.agravantes),
      atenuantes: lista(cr.atenuantes),
      causas: Array.isArray(cr.causas) ? cr.causas.slice(0, 20).flatMap((k) => {
        if (!k || typeof k !== 'object') return [];
        const id = texto((k as Record<string, unknown>).id);
        return id ? [{ id, fracao: fracao((k as Record<string, unknown>).fracao, F.UM_SEXTO) }] : [];
      }) : [],
    }];
  }) : [];

  const d = (b.datas ?? {}) as Record<string, unknown>;
  const a = (b.agente ?? {}) as Record<string, unknown>;
  const v = (b.vitima ?? {}) as Record<string, unknown>;
  const k = (b.criterios ?? {}) as Record<string, unknown>;

  const limpar = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) as T;

  return {
    crimes,
    concurso: CONCURSOS.includes(b.concurso as Concurso) ? (b.concurso as Concurso) : crimes.length > 1 ? 'MATERIAL' : 'UNICO',
    datas: limpar({
      fato: data(d.fato) ?? base.datas.fato,
      cessacao: data(d.cessacao), conhecimentoAutoria: data(d.conhecimentoAutoria), representacao: data(d.representacao),
      recebimentoDenuncia: data(d.recebimentoDenuncia), pronuncia: data(d.pronuncia), confirmacaoPronuncia: data(d.confirmacaoPronuncia),
      sentenca: data(d.sentenca), transitoAcusacao: data(d.transitoAcusacao), transitoAmbos: data(d.transitoAmbos),
      inicioCumprimento: data(d.inicioCumprimento), ultimoAtoQuerelante: data(d.ultimoAtoQuerelante), morteQuerelante: data(d.morteQuerelante),
      prisaoProvisoriaDias: inteiro(d.prisaoProvisoriaDias, 0, 40 * 360), hoje: data(d.hoje),
    }),
    agente: limpar({
      nascimento: data(a.nascimento), reincidente: bool(a.reincidente) ?? false, reincidenteDoloso: bool(a.reincidenteDoloso),
      reincidenteEspecifico: bool(a.reincidenteEspecifico), transitoAnterior: data(a.transitoAnterior), extincaoAnterior: data(a.extincaoAnterior),
      bonsAntecedentes: bool(a.bonsAntecedentes), confessou: bool(a.confessou),
    }),
    vitima: limpar({ nascimento: data(v.nascimento), mulher: bool(v.mulher), violenciaDomestica: bool(v.violenciaDomestica) }),
    criterios: {
      fase1: k.fase1 === 'SEXTO_MINIMO' ? 'SEXTO_MINIMO' : 'OITAVO_INTERVALO',
      fase2: fracao(k.fase2, F.UM_SEXTO),
      fase3: k.fase3 === 'SOMA' ? 'SOMA' : 'CASCATA',
      art68Unico: bool(k.art68Unico) ?? false,
      termoInicialExecutoria: k.termoInicialExecutoria === 'ART_112_LITERAL' ? 'ART_112_LITERAL' : 'TEMA_788',
      salarioMinimo: inteiro(k.salarioMinimo, 100, 100_000) ?? SALARIO_MINIMO_PADRAO,
      valorDiaMulta: fracao(k.valorDiaMulta, { num: 1, den: 30 }),
    },
  };
}
