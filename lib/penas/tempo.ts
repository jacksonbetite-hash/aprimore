/**
 * Tempo, para a Calculadora Penal (§5.12): pena em dias, prazo penal e
 * prazo processual, idade. Parte pura — sem banco, sem React.
 *
 * Dois calendários convivem no processo penal, e confundi-los é errar a
 * data em um ou dois dias — que é exatamente o que decide uma prescrição:
 *
 *   PENAL (art. 10 do CP)      — o dia do começo conta; meses e anos pelo
 *                                calendário comum; não se prorroga.
 *                                Decadência, prescrição, duração da pena.
 *   PROCESSUAL (art. 798 CPP)  — o dia do começo não conta; o do
 *                                vencimento conta; cai em domingo ou
 *                                feriado, prorroga. Perempção, recursos.
 *
 * E a PENA tem a sua aritmética própria: ano de 12 meses, mês de 30 dias,
 * fração de dia desprezada (art. 11). "Um sexto de um ano" é dois meses,
 * não 60,83 dias.
 */

import type { Fracao } from './tipos.ts';

export const DIAS_NO_MES = 30;
export const DIAS_NO_ANO = 360;

/* ------------------------------------------------------------------ */
/*  Pena em dias                                                       */
/* ------------------------------------------------------------------ */

export interface AMD { anos: number; meses: number; dias: number }

export const dias = (anos: number, meses = 0, d = 0) => anos * DIAS_NO_ANO + meses * DIAS_NO_MES + d;

export function paraAMD(total: number): AMD {
  const anos = Math.floor(total / DIAS_NO_ANO);
  const resto = total - anos * DIAS_NO_ANO;
  const meses = Math.floor(resto / DIAS_NO_MES);
  return { anos, meses, dias: resto - meses * DIAS_NO_MES };
}

/** "6 anos, 2 meses e 20 dias" — zero se omite; 0 dias inteiro vira "0 dia". */
export function formatarPena(total: number): string {
  if (total <= 0) return '0 dia';
  const { anos, meses, dias: d } = paraAMD(total);
  const partes: string[] = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  if (d) partes.push(`${d} ${d === 1 ? 'dia' : 'dias'}`);
  if (partes.length === 1) return partes[0];
  return partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1];
}

/**
 * Aplica uma fração à pena e despreza a fração de dia (art. 11). Sinal
 * positivo aumenta, negativo diminui. O arredondamento é para baixo no
 * VALOR DA FRAÇÃO, não na pena: diminuir 1/3 de 100 dias tira 33 (fica 67),
 * e aumentar 1/3 põe 33 (fica 133) — a fração desprezada nunca prejudica
 * o réu em nenhum dos sentidos.
 */
export function aplicarFracao(pena: number, f: Fracao, sinal: '+' | '-'): number {
  const parcela = Math.floor((pena * f.num) / f.den);
  return sinal === '+' ? pena + parcela : Math.max(0, pena - parcela);
}

export const fracaoTexto = (f: Fracao) => `${f.num}/${f.den}`;
export const fracaoValor = (f: Fracao) => f.num / f.den;
export const fracaoIgual = (a: Fracao, b: Fracao) => a.num * b.den === b.num * a.den;

/** Só as frações que a lei escreve por extenso. */
export const F = {
  UM_OITAVO: { num: 1, den: 8 }, UM_SEXTO: { num: 1, den: 6 }, UM_QUINTO: { num: 1, den: 5 },
  UM_QUARTO: { num: 1, den: 4 }, UM_TERCO: { num: 1, den: 3 }, METADE: { num: 1, den: 2 },
  DOIS_TERCOS: { num: 2, den: 3 }, INTEIRO: { num: 1, den: 1 }, DOBRO: { num: 2, den: 1 },
  TRIPLO: { num: 3, den: 1 },
} as const;

/* ------------------------------------------------------------------ */
/*  Datas (ISO 'AAAA-MM-DD', aritmética em UTC)                        */
/* ------------------------------------------------------------------ */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dataValida(s: string | undefined | null): s is string {
  if (!s || !ISO.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function utc(s: string): Date { return new Date(s + 'T00:00:00Z'); }
function iso(d: Date): string { return d.toISOString().slice(0, 10); }

export function somarDias(s: string, n: number): string {
  const d = utc(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

/** Dias corridos de `a` até `b` (b − a). Negativo se b vem antes. */
export function diferencaDias(a: string, b: string): number {
  return Math.round((utc(b).getTime() - utc(a).getTime()) / 86_400_000);
}

export const antes = (a: string, b: string) => diferencaDias(a, b) > 0;

function ultimoDiaDoMes(ano: number, mes0: number): number {
  return new Date(Date.UTC(ano, mes0 + 1, 0)).getUTCDate();
}

/**
 * Soma meses pelo calendário comum. Quando o dia não existe no mês de
 * destino (31 de agosto + 6 meses), cai no último dia daquele mês, e o
 * chamador fica sabendo — porque isso muda o fim do prazo penal.
 */
export function somarMeses(s: string, n: number): { data: string; ajustado: boolean } {
  const d = utc(s);
  const dia = d.getUTCDate();
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const ultimo = ultimoDiaDoMes(alvo.getUTCFullYear(), alvo.getUTCMonth());
  const ajustado = dia > ultimo;
  alvo.setUTCDate(ajustado ? ultimo : dia);
  return { data: iso(alvo), ajustado };
}

/**
 * Fim de um prazo PENAL de `meses` contado de `inicio` (art. 10 do CP).
 *
 * O dia do começo conta, então o prazo termina no dia ANTERIOR ao
 * correspondente: 6 meses a partir de 15/03 vão até 14/09. Se o
 * correspondente não existe (31/08 + 6 meses), o prazo termina no último
 * dia do mês de destino, 28 (ou 29) de fevereiro — sem tirar mais um dia,
 * porque o mês acabou antes de chegar ao correspondente.
 *
 * Devolve o ÚLTIMO DIA em que o direito ainda pode ser exercido / em que
 * a punibilidade ainda existe. A decadência ou a prescrição se consuma no
 * dia seguinte.
 */
export function fimPrazoPenalMeses(inicio: string, meses: number): string {
  const { data, ajustado } = somarMeses(inicio, meses);
  return ajustado ? data : somarDias(data, -1);
}

export function fimPrazoPenalDias(inicio: string, n: number): string {
  // o dia do começo é o primeiro dos n dias
  return somarDias(inicio, n - 1);
}

/* ---- prazo processual (art. 798 CPP) ---- */

/** Feriados nacionais com data fixa, mais a Sexta-feira Santa (feriado forense). */
export function ehFeriado(s: string): boolean {
  const [ano, m, d] = s.split('-').map(Number);
  const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
  const md = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (fixos.includes(md)) return true;
  // Dia da Consciência Negra é feriado nacional desde 2024 (Lei 14.759/23)
  if (md === '11-20' && ano >= 2024) return true;
  return s === somarDias(pascoa(ano), -2);
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function ehDiaUtil(s: string): boolean {
  const ds = utc(s).getUTCDay();
  return ds !== 0 && ds !== 6 && !ehFeriado(s);
}

/**
 * Fim de um prazo PROCESSUAL de `n` dias (art. 798 CPP): exclui o dia do
 * começo, inclui o do vencimento, e prorroga para o dia útil seguinte
 * quando cai em fim de semana ou feriado. Os dias do meio correm mesmo em
 * feriado — o prazo é contínuo; só o último dia se prorroga.
 */
export function fimPrazoProcessualDias(inicio: string, n: number): string {
  let fim = somarDias(inicio, n);
  while (!ehDiaUtil(fim)) fim = somarDias(fim, 1);
  return fim;
}

/* ---- idade ---- */

/** Anos completos em `em`. Quem nasceu em 29/02 completa em 01/03 nos anos comuns. */
export function idadeEm(nascimento: string, em: string): number {
  const n = utc(nascimento), d = utc(em);
  let idade = d.getUTCFullYear() - n.getUTCFullYear();
  const aniversarioNaoChegou =
    d.getUTCMonth() < n.getUTCMonth()
    || (d.getUTCMonth() === n.getUTCMonth() && d.getUTCDate() < n.getUTCDate());
  if (aniversarioNaoChegou) idade--;
  return idade;
}

/** Data em que completa `anos` anos. */
export function aniversario(nascimento: string, anos: number): string {
  return somarMeses(nascimento, anos * 12).data;
}

export const hojeISO = () => new Date().toISOString().slice(0, 10);

/** 'AAAA-MM-DD' → 'DD/MM/AAAA', sem passar por fuso horário. */
export function dataBR(s: string | null | undefined): string {
  if (!s) return '—';
  const [a, m, d] = s.split('-');
  return `${d}/${m}/${a}`;
}

export function mesesTexto(meses: number): string {
  const anos = Math.floor(meses / 12), resto = meses % 12;
  const partes: string[] = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ') || '0 mês';
}
