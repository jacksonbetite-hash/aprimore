/**
 * Dosimetria trifásica (art. 68 do CP) — §5.12.
 *
 *   1ª fase  pena-base, pelas circunstâncias judiciais do art. 59, presa
 *            aos limites do tipo;
 *   2ª fase  agravantes e atenuantes, também presas aos limites (Súmula
 *            231 do STJ para baixo; para cima, o máximo cominado);
 *   3ª fase  causas de aumento e de diminuição, que podem sair dos
 *            limites — e é por isso que a tentativa de roubo pode dar
 *            menos que os 6 anos do caput.
 *
 * Depois, o concurso de crimes (arts. 69 a 71), o teto do art. 75, a
 * detração (art. 42) e a multa (arts. 49 e 60). Tudo em dias inteiros.
 *
 * Onde a lei não fixa a fração, a jurisprudência fixou um costume, e o
 * costume aqui é PARÂMETRO (`caso.criterios`), não verdade: a memória de
 * cálculo diz qual foi usado, para que se possa discordar dele.
 */

import type {
  Caso, Causa, Circunstancia, CrimeDoCaso, Fracao, Passo, PenaDoCrime, TipoPenal, Unificacao, Especie,
} from './tipos.ts';
import { aplicarFracao, dias, formatarPena, fracaoTexto, fracaoValor, idadeEm, F, somarMeses, fracaoIgual } from './tempo.ts';
import { causaPorId, causasDoTipo, circunstancia, rotuloCompleto } from './catalogo/index.ts';

const PACOTE_ANTICRIME = '2020-01-23';

/* ------------------------------------------------------------------ */
/*  Reincidência e circunstâncias que vêm dos dados do caso            */
/* ------------------------------------------------------------------ */

export interface Reincidencia {
  efetiva: boolean;
  motivo: string;
  /** Data em que a condenação anterior deixou de gerar reincidência (art. 64, I). */
  caducaEm?: string;
}

/**
 * Reincidência que VALE para o caso (arts. 63 e 64). Marcar "reincidente"
 * não basta: se a pena anterior foi cumprida ou extinta há mais de cinco
 * anos da data do fato, a condenação não prevalece — o agente é primário
 * para todos os efeitos, ainda que com maus antecedentes.
 */
export function reincidenciaEfetiva(caso: Caso): Reincidencia {
  const { agente, datas } = caso;
  if (!agente.reincidente) return { efetiva: false, motivo: 'Sem condenação anterior transitada em julgado informada.' };
  if (agente.transitoAnterior && agente.transitoAnterior >= datas.fato) {
    return { efetiva: false, motivo: `A condenação anterior transitou em julgado em ${agente.transitoAnterior}, depois do fato: não há reincidência (art. 63), só maus antecedentes.` };
  }
  if (agente.extincaoAnterior) {
    const caducaEm = somarMeses(agente.extincaoAnterior, 60).data;
    if (datas.fato > caducaEm) {
      return { efetiva: false, caducaEm, motivo: `A pena anterior foi extinta em ${agente.extincaoAnterior}; passados mais de cinco anos (art. 64, I), a condenação não prevalece para reincidência.` };
    }
    return { efetiva: true, caducaEm, motivo: `Condenação anterior transitada antes do fato; a pena foi extinta em ${agente.extincaoAnterior}, dentro dos cinco anos do art. 64, I (valeria até ${caducaEm}).` };
  }
  return { efetiva: true, motivo: 'Condenação anterior transitada em julgado antes do fato (art. 63).' };
}

/**
 * As circunstâncias que o motor acrescenta sozinho a partir dos dados do
 * caso — reincidência, menoridade relativa, senilidade, confissão e a
 * idade da vítima —, para que o aluno não precise saber que a data de
 * nascimento que digitou vira atenuante.
 */
export function circunstanciasAutomaticas(tipo: TipoPenal, caso: Caso): { agravantes: string[]; atenuantes: string[]; notas: string[] } {
  const agravantes: string[] = [];
  const atenuantes: string[] = [];
  const notas: string[] = [];
  const { agente, vitima, datas } = caso;

  if (reincidenciaEfetiva(caso).efetiva) agravantes.push('ag-reincidencia');
  if (agente.confessou) atenuantes.push('at-confissao');

  const excecaoSexual = Boolean(tipo.dignidadeSexual && tipo.violenciaOuGraveAmeaca && vitima.mulher);
  if (agente.nascimento) {
    if (idadeEm(agente.nascimento, datas.fato) < 21) {
      if (excecaoSexual) notas.push('Menor de 21 anos na data do fato, mas o crime envolve violência sexual contra a mulher: a atenuante do art. 65, I, não se aplica (Lei 15.160/25).');
      else atenuantes.push('at-menoridade');
    }
    if (datas.sentenca && idadeEm(agente.nascimento, datas.sentenca) >= 70) {
      if (excecaoSexual) notas.push('Maior de 70 anos na data da sentença, mas o crime envolve violência sexual contra a mulher: a atenuante do art. 65, I, não se aplica (Lei 15.160/25).');
      else atenuantes.push('at-senilidade');
    }
  }
  if (vitima.nascimento && !tipo.idadeElementar) {
    const idade = idadeEm(vitima.nascimento, datas.fato);
    if (idade < 12 || idade >= 60) agravantes.push('ag-vitima-vulneravel');
  }
  if (vitima.violenciaDomestica && !tipo.violenciaDomestica) agravantes.push('ag-relacoes-domesticas');
  return { agravantes, atenuantes, notas };
}

/* ------------------------------------------------------------------ */
/*  As três fases                                                      */
/* ------------------------------------------------------------------ */

const NOME_59: Record<string, string> = {
  culpabilidade: 'culpabilidade', antecedentes: 'antecedentes', conduta_social: 'conduta social',
  personalidade: 'personalidade', motivos: 'motivos', circunstancias: 'circunstâncias',
  consequencias: 'consequências', comportamento_vitima: 'comportamento da vítima',
};

function unicos<T>(xs: T[]): T[] { return [...new Set(xs)]; }

export function dosarCrime(tipo: TipoPenal, crime: CrimeDoCaso, caso: Caso): PenaDoCrime {
  const memoria: Passo[] = [];
  const avisos: string[] = [];
  const base = { norma: tipo.norma, rotulo: tipo.rotulo };
  const { criterios } = caso;
  const min = tipo.penaMinDias, max = tipo.penaMaxDias;
  const especie = tipo.especie === 'RECLUSAO' ? 'reclusão' : tipo.especie === 'DETENCAO' ? 'detenção' : 'prisão simples';

  memoria.push({
    fase: 0, titulo: 'Pena cominada', base, deDias: min, paraDias: max,
    detalhe: `${tipo.nome} (${rotuloCompleto(tipo)}): ${especie}, de ${formatarPena(min)} a ${formatarPena(max)}${tipo.multa === 'CUMULATIVA' ? ', e multa' : tipo.multa === 'ALTERNATIVA' ? ', ou multa' : ''}.`,
  });

  /* ---- 1ª fase ---- */
  const negativas = unicos(crime.circunstancias59);
  const intervalo = max - min;
  const incremento = criterios.fase1 === 'OITAVO_INTERVALO' ? Math.floor(intervalo / 8) : Math.floor(min / 6);
  let penaBase = Math.min(max, min + negativas.length * incremento);
  memoria.push({
    fase: 1, titulo: 'Pena-base (art. 59)', base: { norma: 'cp', rotulo: 'Art. 59' }, deDias: min, paraDias: penaBase,
    fracao: negativas.length ? `${negativas.length} × ${criterios.fase1 === 'OITAVO_INTERVALO' ? '1/8 do intervalo' : '1/6 da mínima'}` : undefined,
    detalhe: negativas.length === 0
      ? 'Nenhuma circunstância judicial desfavorável: pena-base no mínimo legal.'
      : `${negativas.length} ${negativas.length === 1 ? 'circunstância desfavorável' : 'circunstâncias desfavoráveis'} (${negativas.map((n) => NOME_59[n]).join(', ')}), cada uma valendo ${formatarPena(incremento)} — ${criterios.fase1 === 'OITAVO_INTERVALO' ? '1/8 do intervalo entre o mínimo e o máximo (critério do STJ)' : '1/6 da pena mínima'}.${min + negativas.length * incremento > max ? ' O resultado ultrapassaria o máximo e foi contido nele.' : ''}`,
  });

  /* ---- 2ª fase ---- */
  const auto = circunstanciasAutomaticas(tipo, caso);
  avisos.push(...auto.notas);
  let agravantes = unicos([...crime.agravantes, ...auto.agravantes]).map(circunstancia).filter((c): c is Circunstancia => Boolean(c));
  let atenuantes = unicos([...crime.atenuantes, ...auto.atenuantes]).map(circunstancia).filter((c): c is Circunstancia => Boolean(c));

  // Tema 585 do STJ: reincidência e confissão espontânea se compensam integralmente.
  const temReinc = agravantes.some((c) => c.chave === 'REINCIDENCIA');
  const temConf = atenuantes.some((c) => c.chave === 'CONFISSAO');
  let compensadas = '';
  if (temReinc && temConf) {
    agravantes = agravantes.filter((c) => c.chave !== 'REINCIDENCIA');
    atenuantes = atenuantes.filter((c) => c.chave !== 'CONFISSAO');
    compensadas = ' Reincidência e confissão espontânea se compensam integralmente (Tema 585 do STJ) e saem da conta.';
  }

  const parcela2 = Math.floor((penaBase * criterios.fase2.num) / criterios.fase2.den);
  let intermediaria = penaBase + parcela2 * agravantes.length - parcela2 * atenuantes.length;
  let contida = '';
  if (intermediaria < min) { intermediaria = min; contida = ' Atenuante não leva a pena abaixo do mínimo legal (Súmula 231 do STJ).'; }
  if (intermediaria > max) { intermediaria = max; contida = ' Agravante não leva a pena acima do máximo legal.'; }
  const lista = (cs: Circunstancia[]) => cs.map((c) => c.nome).join('; ');
  memoria.push({
    fase: 2, titulo: 'Agravantes e atenuantes (arts. 61 a 67)', base: { norma: 'cp', rotulo: 'Art. 68' },
    deDias: penaBase, paraDias: intermediaria,
    fracao: agravantes.length + atenuantes.length ? `${fracaoTexto(criterios.fase2)} da pena-base por circunstância` : undefined,
    detalhe: agravantes.length + atenuantes.length === 0
      ? `Nenhuma agravante ou atenuante.${compensadas}`
      : `${agravantes.length ? `Agravantes: ${lista(agravantes)}. ` : ''}${atenuantes.length ? `Atenuantes: ${lista(atenuantes)}. ` : ''}Cada uma vale ${formatarPena(parcela2)} (${fracaoTexto(criterios.fase2)} da pena-base).${compensadas}${contida}${agravantes.length && atenuantes.length ? ' No concurso, preponderam motivos, personalidade e reincidência (art. 67); com frações iguais, o resultado é aritmético.' : ''}`,
  });

  /* ---- 3ª fase ---- */
  const cabiveis = causasDoTipo(tipo, caso.datas.fato);
  const aplicadas: { causa: Causa; fracao: Fracao }[] = [];
  for (const pedida of crime.causas) {
    const causa = cabiveis.find((c) => c.id === pedida.id) ?? causaPorId(pedida.id);
    if (!causa) { avisos.push(`Causa "${pedida.id}" não reconhecida e ignorada.`); continue; }
    if (!cabiveis.some((c) => c.id === causa.id)) {
      avisos.push(`${causa.nome}: não cabe a este tipo nesta data e foi ignorada.`);
      continue;
    }
    let fracao = pedida.fracao;
    if (fracaoValor(fracao) < fracaoValor(causa.fracaoMin)) { fracao = causa.fracaoMin; avisos.push(`${causa.nome}: fração abaixo do mínimo legal; usada ${fracaoTexto(fracao)}.`); }
    if (fracaoValor(fracao) > fracaoValor(causa.fracaoMax)) { fracao = causa.fracaoMax; avisos.push(`${causa.nome}: fração acima do máximo legal; usada ${fracaoTexto(fracao)}.`); }
    aplicadas.push({ causa, fracao });
  }

  // art. 68, p. ún.: entre causas da parte especial do mesmo sinal, o juiz pode ficar só com a maior
  let ordem = aplicadas;
  if (criterios.art68Unico) {
    for (const sinal of ['+', '-'] as const) {
      const especificas = aplicadas.filter((a) => a.causa.escopo === 'ESPECIFICA' && a.causa.sinal === sinal);
      if (especificas.length > 1) {
        const maior = especificas.reduce((m, a) => (fracaoValor(a.fracao) > fracaoValor(m.fracao) ? a : m));
        ordem = ordem.filter((a) => !(a.causa.escopo === 'ESPECIFICA' && a.causa.sinal === sinal) || a === maior);
        avisos.push(`Art. 68, p. ún.: das ${especificas.length} causas de ${sinal === '+' ? 'aumento' : 'diminuição'} da parte especial, aplicou-se só a maior (${maior.causa.nome}, ${fracaoTexto(maior.fracao)}).`);
      }
    }
  }
  // específicas antes das gerais; aumentos antes das diminuições
  ordem = [...ordem].sort((a, b) => {
    const e = Number(b.causa.escopo === 'ESPECIFICA') - Number(a.causa.escopo === 'ESPECIFICA');
    if (e) return e;
    return Number(b.causa.sinal === '+') - Number(a.causa.sinal === '+');
  });

  let definitiva = intermediaria;
  if (ordem.length === 0) {
    memoria.push({ fase: 3, titulo: 'Causas de aumento e de diminuição', base: { norma: 'cp', rotulo: 'Art. 68' }, deDias: intermediaria, paraDias: intermediaria, detalhe: 'Nenhuma causa de aumento ou de diminuição.' });
  } else if (criterios.fase3 === 'CASCATA') {
    for (const { causa, fracao } of ordem) {
      const de = definitiva;
      definitiva = aplicarFracao(definitiva, fracao, causa.sinal);
      memoria.push({
        fase: 3, titulo: causa.sinal === '+' ? 'Causa de aumento' : 'Causa de diminuição', base: causa.base,
        deDias: de, paraDias: definitiva, fracao: rotuloFracao(fracao, causa.sinal),
        detalhe: `${causa.nome}: ${causa.sinal === '+' ? 'aumento' : 'diminuição'} de ${rotuloFracao(fracao, causa.sinal)} sobre ${formatarPena(de)} (incidência em cascata, cada causa sobre o resultado da anterior).`,
      });
    }
  } else {
    let saldo = 0;
    const partes: string[] = [];
    for (const { causa, fracao } of ordem) {
      const parcela = Math.floor((intermediaria * fracao.num) / fracao.den);
      saldo += causa.sinal === '+' ? parcela : -parcela;
      partes.push(`${causa.nome}: ${causa.sinal}${formatarPena(parcela)} (${fracaoTexto(fracao)})`);
    }
    definitiva = Math.max(0, intermediaria + saldo);
    memoria.push({
      fase: 3, titulo: 'Causas de aumento e de diminuição', base: { norma: 'cp', rotulo: 'Art. 68' },
      deDias: intermediaria, paraDias: definitiva,
      detalhe: `Todas sobre a pena da 2ª fase (${formatarPena(intermediaria)}), somadas: ${partes.join('; ')}.`,
    });
  }
  if (definitiva < min) avisos.push('A pena definitiva ficou abaixo do mínimo cominado: é o efeito legítimo das causas de diminuição, que não se prendem aos limites do tipo.');
  if (definitiva > max) avisos.push('A pena definitiva ficou acima do máximo cominado: é o efeito legítimo das causas de aumento.');

  /* ---- multa ---- */
  const diasMulta = tipo.multa === 'NAO' ? null : dosarMulta(tipo, negativas.length, agravantes.length, atenuantes.length, ordem, criterios);
  if (diasMulta !== null) {
    memoria.push({
      fase: 3, titulo: 'Pena de multa (arts. 49, 58 e 60)', base: { norma: 'cp', rotulo: 'Art. 49' }, deDias: 0, paraDias: 0,
      detalhe: `${diasMulta} dias-multa, percorrendo as mesmas três fases entre ${tipo.diasMultaMin ?? 10} e ${tipo.diasMultaMax ?? 360} dias-multa${tipo.multa === 'ALTERNATIVA' ? ' — a multa aqui é ALTERNATIVA à pena privativa: o juiz escolhe uma ou outra' : ''}. O valor de cada dia-multa (1/30 a 5 salários mínimos) depende da situação econômica do réu (art. 60).`,
    });
  }

  /* ---- pena em abstrato para prescrição e institutos despenalizadores ---- */
  const { maxima, minima } = penasAbstratas(tipo, ordem.map((a) => a.causa));

  return {
    tipoId: tipo.id, nome: tipo.nome, rotuloCompleto: rotuloCompleto(tipo), especie: tipo.especie,
    penaBaseDias: penaBase, penaIntermediariaDias: intermediaria, penaDefinitivaDias: definitiva,
    maximaAbstrataDias: maxima, minimaAbstrataDias: minima, diasMulta, memoria, avisos,
  };
}

function rotuloFracao(f: Fracao, sinal: '+' | '-'): string {
  if (sinal === '+' && fracaoIgual(f, F.INTEIRO)) return 'dobro';
  if (sinal === '+' && fracaoIgual(f, F.DOBRO)) return 'triplo';
  return fracaoTexto(f);
}

/**
 * Pena máxima e mínima EM ABSTRATO depois das causas do caso: a máxima
 * com o maior aumento e a menor diminuição (é ela que regula a
 * prescrição antes da sentença, art. 109), a mínima com o menor aumento e
 * a maior diminuição (é ela que abre ou fecha ANPP e suspensão do
 * processo). Agravantes e atenuantes não entram: não têm fração legal.
 */
export function penasAbstratas(tipo: TipoPenal, causas: Causa[]) {
  let maxima = tipo.penaMaxDias, minima = tipo.penaMinDias;
  for (const c of causas) {
    if (c.sinal === '+') { maxima = aplicarFracao(maxima, c.fracaoMax, '+'); minima = aplicarFracao(minima, c.fracaoMin, '+'); }
    else { maxima = aplicarFracao(maxima, c.fracaoMin, '-'); minima = aplicarFracao(minima, c.fracaoMax, '-'); }
  }
  return { maxima, minima };
}

function dosarMulta(
  tipo: TipoPenal, negativas: number, agravantes: number, atenuantes: number,
  causas: { causa: Causa; fracao: Fracao }[], criterios: Caso['criterios'],
): number {
  const dmMin = tipo.diasMultaMin ?? 10, dmMax = tipo.diasMultaMax ?? 360;
  const inc = criterios.fase1 === 'OITAVO_INTERVALO' ? Math.floor((dmMax - dmMin) / 8) : Math.floor(dmMin / 6);
  let dm = Math.min(dmMax, dmMin + negativas * inc);
  const parcela = Math.floor((dm * criterios.fase2.num) / criterios.fase2.den);
  dm = Math.min(dmMax, Math.max(dmMin, dm + parcela * agravantes - parcela * atenuantes));
  for (const { causa, fracao } of causas) dm = aplicarFracao(dm, fracao, causa.sinal);
  return Math.max(1, dm);
}

/* ------------------------------------------------------------------ */
/*  Concurso de crimes e unificação                                    */
/* ------------------------------------------------------------------ */

const ESPECIE_PESO: Record<Especie, number> = { RECLUSAO: 3, DETENCAO: 2, PRISAO_SIMPLES: 1 };

/** Fração do concurso formal (1/6 a 1/2) e do crime continuado (1/6 a 2/3) pelo número de crimes — critério do STJ. */
export function fracaoPorNumeroDeCrimes(n: number, regra: 'FORMAL' | 'CONTINUADO'): Fracao {
  if (n <= 2) return F.UM_SEXTO;
  if (n === 3) return F.UM_QUINTO;
  if (n === 4) return F.UM_QUARTO;
  if (n === 5) return F.UM_TERCO;
  if (n === 6 || regra === 'FORMAL') return F.METADE;
  return F.DOIS_TERCOS;
}

export function unificar(penas: PenaDoCrime[], caso: Caso): Unificacao {
  const passos: Passo[] = [];
  const soma = penas.reduce((s, p) => s + p.penaDefinitivaDias, 0);
  const maisGrave = penas.reduce((m, p) => (p.penaDefinitivaDias > m.penaDefinitivaDias ? p : m), penas[0]);
  const especiePrevalente = penas.reduce<Especie>((e, p) => (ESPECIE_PESO[p.especie] > ESPECIE_PESO[e] ? p.especie : e), penas[0].especie);
  const limiteCumprimentoDias = caso.datas.fato >= PACOTE_ANTICRIME ? dias(40) : dias(30);
  const regra = penas.length === 1 ? 'UNICO' : caso.concurso === 'UNICO' ? 'MATERIAL' : caso.concurso;
  let total = soma;

  if (penas.length === 1) {
    total = penas[0].penaDefinitivaDias;
  } else if (regra === 'MATERIAL' || regra === 'FORMAL_IMPROPRIO') {
    total = soma;
    passos.push({
      fase: 4, titulo: regra === 'MATERIAL' ? 'Concurso material (art. 69)' : 'Concurso formal impróprio (art. 70, 2ª parte)',
      base: { norma: 'cp', rotulo: regra === 'MATERIAL' ? 'Art. 69' : 'Art. 70' }, deDias: maisGrave.penaDefinitivaDias, paraDias: total,
      detalhe: `As penas se somam: ${penas.map((p) => `${p.nome} ${formatarPena(p.penaDefinitivaDias)}`).join(' + ')} = ${formatarPena(total)}.${regra === 'FORMAL_IMPROPRIO' ? ' Desígnios autônomos: cumulam-se como no concurso material.' : ''}`,
    });
  } else {
    const f = fracaoPorNumeroDeCrimes(penas.length, regra as 'FORMAL' | 'CONTINUADO');
    const exasperada = aplicarFracao(maisGrave.penaDefinitivaDias, f, '+');
    const beneficio = exasperada > soma;
    total = beneficio ? soma : exasperada;
    passos.push({
      fase: 4, titulo: regra === 'FORMAL' ? 'Concurso formal (art. 70)' : 'Crime continuado (art. 71)',
      base: { norma: 'cp', rotulo: regra === 'FORMAL' ? 'Art. 70' : 'Art. 71' }, deDias: maisGrave.penaDefinitivaDias, paraDias: total, fracao: fracaoTexto(f),
      detalhe: `A pena mais grave (${maisGrave.nome}, ${formatarPena(maisGrave.penaDefinitivaDias)}) aumentada de ${fracaoTexto(f)} por serem ${penas.length} crimes: ${formatarPena(exasperada)}.${beneficio ? ` Como a exasperação superaria a soma das penas (${formatarPena(soma)}), prevalece a soma — concurso material benéfico (art. 70, p. ún., e art. 71).` : ''}`,
    });
  }

  if (total > limiteCumprimentoDias) {
    passos.push({
      fase: 4, titulo: 'Limite de cumprimento (art. 75)', base: { norma: 'cp', rotulo: 'Art. 75' }, deDias: total, paraDias: limiteCumprimentoDias,
      detalhe: `A pena total (${formatarPena(total)}) supera o teto de ${formatarPena(limiteCumprimentoDias)} para fato ${caso.datas.fato >= PACOTE_ANTICRIME ? 'posterior' : 'anterior'} ao Pacote Anticrime (23/01/2020). O TEMPO DE CUMPRIMENTO fica unificado no teto; a pena aplicada continua sendo a total, e é ela que serve de base a progressão e livramento (Súmula 715 do STF).`,
    });
  }

  const diasMultaTotal = penas.some((p) => p.diasMulta !== null) ? penas.reduce((s, p) => s + (p.diasMulta ?? 0), 0) : null;
  const { salarioMinimo, valorDiaMulta } = caso.criterios;
  const multaReais = diasMultaTotal === null ? null : Math.round(diasMultaTotal * salarioMinimo * fracaoValor(valorDiaMulta) * 100) / 100;

  return { regra, totalDias: total, especiePrevalente, limiteCumprimentoDias, passos, diasMultaTotal, multaReais };
}
