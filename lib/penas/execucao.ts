/**
 * Execução (§5.12): fração de progressão de regime (LEP, art. 112) e de
 * livramento condicional (CP, art. 83), pela data do fato.
 *
 * O art. 112 foi reescrito três vezes em vinte anos, e cada redação vale
 * para os fatos do seu tempo (CF, art. 5º, XL — a lei penal mais grave
 * não retroage, e a regra de progressão é de direito material para esse
 * fim):
 *
 *   até 28/03/2007         1/6 para todos (a Lei 8.072/90 só permitia o
 *                          regime integralmente fechado, declarado
 *                          inconstitucional pelo STF em 2006)
 *   29/03/2007–22/01/2020  Lei 11.464/07: 1/6; hediondo 2/5 (primário) e 3/5 (reincidente)
 *   23/01/2020–23/03/2026  Pacote Anticrime: 16% a 70%
 *   desde 24/03/2026       Leis 15.358/26 e 15.402/26: 1/6, 20%, 25%, 30%, 70% a 85%
 *
 * Os textos de 2026 foram lidos do acervo (conferido em 03/09/2026); as
 * datas, do Planalto.
 */

import type { Caso, Consequencias, TipoPenal, Unificacao } from './tipos.ts';
import { dias, formatarPena, somarDias } from './tempo.ts';
import type { Reincidencia } from './dosimetria.ts';

const LEP = (rotulo: string) => ({ norma: 'lep', rotulo });
const CP = (rotulo: string) => ({ norma: 'cp', rotulo });

const L11464 = '2007-03-29';
const PACOTE = '2020-01-23';
const L15358 = '2026-03-24';

interface Regra { texto: string; num: number; den: number; fundamento: string; vedaLivramento?: boolean }

const pct = (n: number, fundamento: string, vedaLivramento = false): Regra => ({ texto: `${n}%`, num: n, den: 100, fundamento, vedaLivramento });
const fr = (num: number, den: number, fundamento: string): Regra => ({ texto: `${num}/${den}`, num, den, fundamento });

export interface ContextoExecucao {
  caso: Caso;
  tipos: TipoPenal[];
  unificacao: Unificacao;
  reincidencia: Reincidencia;
}

/**
 * A fração de progressão do crime mais grave do conjunto: no concurso,
 * cada crime tem a sua, e a execução as aplica em separado (LEP, art. 111);
 * para a tela, a que manda é a mais severa.
 */
export function progressao(ctx: ContextoExecucao): Consequencias['execucao']['progressao'] & { versao: string; vedaLivramento: boolean } {
  const { caso, tipos, unificacao, reincidencia } = ctx;
  const fato = caso.datas.fato;
  const reinc = reincidencia.efetiva;
  const especifico = reinc && Boolean(caso.agente.reincidenteEspecifico);
  const hediondo = tipos.some((t) => t.hediondo !== 'NAO' && !privilegiado(t, caso));
  const morte = tipos.some((t) => t.hediondo !== 'NAO' && t.resultadoMorte && !privilegiado(t, caso));
  const feminicidio = tipos.some((t) => t.feminicidio);
  const violencia = tipos.some((t) => t.violenciaOuGraveAmeaca && t.elemento !== 'CULPOSO');

  let regra: Regra;
  let versao: string;

  if (fato < L11464) {
    versao = 'redação anterior à Lei 11.464/07';
    regra = fr(1, 6, 'Regra geral de 1/6 para todos os crimes (o regime integralmente fechado da Lei 8.072/90 foi declarado inconstitucional — STF, HC 82.959).');
  } else if (fato < PACOTE) {
    versao = 'Lei 11.464/07';
    if (hediondo) regra = reinc ? fr(3, 5, 'Crime hediondo ou equiparado, reincidente: 3/5 (Lei 8.072/90, art. 2º, § 2º, na redação da Lei 11.464/07).') : fr(2, 5, 'Crime hediondo ou equiparado, primário: 2/5 (Lei 8.072/90, art. 2º, § 2º, na redação da Lei 11.464/07).');
    else regra = fr(1, 6, 'Crime comum: 1/6 da pena no regime anterior (LEP, art. 112, redação da Lei 10.792/03).');
  } else if (fato < L15358) {
    versao = 'Pacote Anticrime (Lei 13.964/19)';
    if (hediondo && morte) regra = especifico ? pct(70, 'Reincidente específico em crime hediondo com resultado morte (art. 112, VIII) — vedado o livramento.', true) : pct(50, `Crime hediondo com resultado morte, ${reinc ? 'reincidente não específico (Tema 1.084 do STJ: vale a fração do primário)' : 'primário'} (art. 112, VI, a) — vedado o livramento.`, true);
    else if (hediondo) regra = especifico ? pct(60, 'Reincidente específico em crime hediondo ou equiparado (art. 112, VII).') : pct(40, `Crime hediondo ou equiparado, ${reinc ? 'reincidente não específico (Tema 1.084 do STJ: vale a fração do primário)' : 'primário'} (art. 112, V).`);
    else if (violencia) regra = reinc ? pct(30, 'Reincidente em crime com violência ou grave ameaça (art. 112, IV).') : pct(25, 'Primário, crime com violência ou grave ameaça (art. 112, III).');
    else regra = reinc ? pct(20, 'Reincidente em crime sem violência ou grave ameaça (art. 112, II).') : pct(16, 'Primário, crime sem violência ou grave ameaça (art. 112, I).');
  } else {
    versao = 'Leis 15.358/26 e 15.402/26';
    if (hediondo && morte) regra = especifico ? pct(85, 'Reincidente em crime hediondo ou equiparado com resultado morte (art. 112, VIII) — vedado o livramento.', true) : pct(75, `Crime hediondo com resultado morte, ${reinc ? 'reincidente não específico (aplicada a fração do primário, como no Tema 1.084 do STJ)' : 'primário'} (art. 112, VI, a) — vedado o livramento.`, true);
    else if (feminicidio) regra = pct(75, 'Feminicídio, primário (art. 112, VI, d) — vedado o livramento.', true);
    else if (hediondo) regra = especifico ? pct(80, 'Reincidente em crime hediondo ou equiparado (art. 112, VII).') : pct(70, `Crime hediondo ou equiparado, ${reinc ? 'reincidente não específico' : 'primário'} (art. 112, V).`);
    else if (violencia) regra = reinc ? pct(30, 'Reincidente, crime com violência ou grave ameaça (art. 112, II e IV).') : pct(25, 'Primário, crime com violência ou grave ameaça (art. 112, I).');
    else regra = reinc ? pct(20, 'Reincidente em crime sem violência ou grave ameaça (art. 112, III).') : fr(1, 6, 'Primário, crime sem violência: 1/6 da pena no regime anterior (art. 112, caput).');
  }

  const total = unificacao.totalDias;
  const necessarios = Math.ceil((total * regra.num) / regra.den);
  const inicio = caso.datas.inicioCumprimento;
  const data = inicio ? somarDias(inicio, Math.max(0, necessarios - (caso.datas.prisaoProvisoriaDias ?? 0))) : undefined;
  let fundamento = `${regra.fundamento} Sobre ${formatarPena(total)}: ${formatarPena(necessarios)}.`;
  if (tipos.some((t) => privilegiado(t, caso))) fundamento += ' O tráfico privilegiado (art. 33, § 4º) não é hediondo para este fim (LEP, art. 112, § 5º).';
  if (data) fundamento += ` Iniciado o cumprimento em ${inicio}${caso.datas.prisaoProvisoriaDias ? ', descontada a prisão provisória' : ''}, a primeira progressão é possível a partir de ${data}, preenchido o requisito subjetivo.`;

  return { fracaoTexto: regra.texto, diasNecessarios: necessarios, fundamento, base: LEP('Art. 112'), data, versao, vedaLivramento: Boolean(regra.vedaLivramento) };
}

function privilegiado(t: TipoPenal, caso: Caso): boolean {
  if (!t.trafico) return false;
  const crime = caso.crimes.find((c) => c.tipoId === t.id);
  return Boolean(crime?.causas.some((c) => c.id === 'drogas-33-4-privilegio'));
}

export function livramento(ctx: ContextoExecucao, vedadoPelaProgressao: boolean): Consequencias['execucao']['livramento'] {
  const { caso, tipos, unificacao, reincidencia } = ctx;
  const base = CP('Art. 83');
  const total = unificacao.totalDias;
  const reinc = reincidencia.efetiva;
  const hediondo = tipos.some((t) => (t.hediondo !== 'NAO' && !privilegiado(t, caso)) || t.trafico);
  const morte = tipos.some((t) => t.hediondo !== 'NAO' && t.resultadoMorte);

  if (total < dias(2)) return { cabivel: false, base, fundamento: `Pena de ${formatarPena(total)}: o livramento exige pena igual ou superior a 2 anos (art. 83, caput).` };
  if (caso.datas.fato >= PACOTE && vedadoPelaProgressao) return { cabivel: false, base: LEP('Art. 112'), fundamento: `${morte ? 'Crime hediondo com resultado morte' : 'Hipótese do art. 112, VI ou VIII, da LEP'}: livramento condicional vedado desde o Pacote Anticrime.` };
  if (hediondo && reinc && caso.agente.reincidenteEspecifico) return { cabivel: false, base, fundamento: 'Reincidente específico em crime hediondo, tortura, tráfico ou terrorismo: vedado (art. 83, V).' };

  let fracao: { texto: string; num: number; den: number }, fundamento: string;
  if (hediondo) { fracao = { texto: '2/3', num: 2, den: 3 }; fundamento = 'Crime hediondo, tráfico, tortura ou terrorismo, não reincidente específico: mais de 2/3 da pena (art. 83, V).'; }
  else if (reinc && caso.agente.reincidenteDoloso !== false) { fracao = { texto: '1/2', num: 1, den: 2 }; fundamento = 'Reincidente em crime doloso: mais da metade da pena (art. 83, II).'; }
  else { fracao = { texto: '1/3', num: 1, den: 3 }; fundamento = `Não reincidente em crime doloso${caso.agente.bonsAntecedentes === false ? ', mas sem bons antecedentes — a jurisprudência aplica a fração do inciso I mesmo assim, por falta de previsão intermediária' : ' e com bons antecedentes'}: mais de 1/3 da pena (art. 83, I).`; }

  const necessarios = Math.floor((total * fracao.num) / fracao.den) + 1;
  const inicio = caso.datas.inicioCumprimento;
  const data = inicio ? somarDias(inicio, Math.max(0, necessarios - (caso.datas.prisaoProvisoriaDias ?? 0))) : undefined;
  fundamento += ` Sobre ${formatarPena(total)}: ${formatarPena(necessarios)}. Exige ainda bom comportamento, ausência de falta grave nos últimos 12 meses e reparação do dano (art. 83, III e IV).`;
  if (tipos.some((t) => t.violenciaOuGraveAmeaca && t.elemento !== 'CULPOSO')) fundamento += ' Em crime doloso com violência, o juiz ainda verifica se há condições pessoais que afastem a reiteração (art. 83, p. ún.).';
  return { cabivel: true, fracaoTexto: fracao.texto, diasNecessarios: necessarios, fundamento, base, data };
}
