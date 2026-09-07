/**
 * O que vem depois da pena (§5.12): regime inicial (art. 33), substituição
 * por restritiva de direitos (art. 44), sursis (art. 77) e os institutos
 * despenalizadores que dependem só da pena em abstrato — infração de menor
 * potencial ofensivo, suspensão condicional do processo e acordo de não
 * persecução penal.
 *
 * Muita coisa aqui é "pode", não "deve": o juiz PODE fixar regime mais
 * brando, a substituição depende de a medida ser suficiente. Onde a lei
 * dá margem, a resposta é 'DEPENDE' com o motivo — dizer "cabível" seria
 * prometer o que o juiz não prometeu.
 */

import type { Caso, Consequencias, PenaDoCrime, Regime, TipoPenal, Unificacao } from './tipos.ts';
import { dias, formatarPena, idadeEm } from './tempo.ts';
import type { Reincidencia } from './dosimetria.ts';
import { fracaoPorNumeroDeCrimes } from './dosimetria.ts';
import { aplicarFracao } from './tempo.ts';

const CP = (rotulo: string) => ({ norma: 'cp', rotulo });
const CPP = (rotulo: string) => ({ norma: 'cpp', rotulo });
const LEI_9099 = (rotulo: string) => ({ norma: 'lei-9099', rotulo });
const MP = (rotulo: string) => ({ norma: 'maria-da-penha', rotulo });

export interface ContextoConsequencias {
  caso: Caso;
  tipos: TipoPenal[];        // um por crime, na mesma ordem de `penas`
  penas: PenaDoCrime[];
  unificacao: Unificacao;
  reincidencia: Reincidencia;
  hoje: string;
}

export function regimeInicial(ctx: ContextoConsequencias): Consequencias['regime'] {
  const { caso, tipos, penas, unificacao, reincidencia } = ctx;
  const avisos: string[] = [];
  const detracao = Math.max(0, caso.datas.prisaoProvisoriaDias ?? 0);
  const considerada = Math.max(0, unificacao.totalDias - detracao);
  const reinc = reincidencia.efetiva;
  const negativas = penas.some((_, i) => caso.crimes[i]?.circunstancias59.length > 0);
  const especie = unificacao.especiePrevalente;

  let inicial: Regime;
  let fundamento: string;

  if (especie === 'DETENCAO' || especie === 'PRISAO_SIMPLES') {
    if (considerada > dias(4)) { inicial = 'SEMIABERTO'; fundamento = 'Pena de detenção superior a 4 anos: regime semiaberto (art. 33, caput). Detenção nunca começa em regime fechado.'; }
    else if (reinc) { inicial = 'SEMIABERTO'; fundamento = 'Detenção até 4 anos, réu reincidente: regime semiaberto (art. 33, caput e § 2º, c, a contrario).'; }
    else { inicial = 'ABERTO'; fundamento = 'Detenção não superior a 4 anos, réu não reincidente: regime aberto (art. 33, § 2º, c).'; }
  } else if (considerada > dias(8)) {
    inicial = 'FECHADO'; fundamento = 'Pena superior a 8 anos: regime inicial fechado (art. 33, § 2º, a).';
  } else if (considerada > dias(4)) {
    if (reinc) { inicial = 'FECHADO'; fundamento = 'Pena entre 4 e 8 anos e réu reincidente: o semiaberto do art. 33, § 2º, b, exige não reincidência — regime fechado.'; }
    else { inicial = 'SEMIABERTO'; fundamento = 'Pena superior a 4 e não superior a 8 anos, réu não reincidente: regime semiaberto (art. 33, § 2º, b).'; }
  } else if (reinc) {
    if (negativas) { inicial = 'FECHADO'; fundamento = 'Pena até 4 anos, réu reincidente e com circunstâncias judiciais desfavoráveis: regime fechado (art. 33, §§ 2º e 3º).'; }
    else { inicial = 'SEMIABERTO'; fundamento = 'Pena até 4 anos e réu reincidente: o aberto exige não reincidência, mas, favoráveis as circunstâncias do art. 59, cabe o semiaberto (Súmula 269 do STJ).'; }
  } else {
    inicial = 'ABERTO'; fundamento = 'Pena não superior a 4 anos, réu não reincidente: regime aberto (art. 33, § 2º, c).';
  }

  if (detracao > 0) avisos.push(`A detração de ${formatarPena(detracao)} de prisão provisória foi computada para fixar o regime (art. 387, § 2º, do CPP): pena considerada ${formatarPena(considerada)}.`);
  if (negativas && inicial !== 'FECHADO') avisos.push('Há circunstância judicial desfavorável: o juiz pode fixar regime mais gravoso que o da pena, com fundamentação concreta (art. 33, § 3º) — nunca só pela gravidade abstrata do crime (Súmulas 718 e 719 do STF e 440 do STJ).');
  if (tipos.some((t) => t.hediondo !== 'NAO')) avisos.push('Crime hediondo ou equiparado não obriga regime inicial fechado: o STF declarou inconstitucional o art. 2º, § 1º, da Lei 8.072/90 (HC 111.840). Vale a regra geral do art. 33.');
  if (tipos.some((t) => t.contraAdministracao)) avisos.push('Crime contra a administração pública: a progressão de regime fica condicionada à reparação do dano (art. 33, § 4º).');
  if (unificacao.totalDias > unificacao.limiteCumprimentoDias) avisos.push('O regime é fixado pela pena total, não pelo teto de cumprimento do art. 75 (Súmula 715 do STF).');

  return { inicial, fundamento, base: CP('Art. 33'), penaConsideradaDias: considerada, avisos };
}

export function substituicao(ctx: ContextoConsequencias): Consequencias['substituicao'] {
  const { caso, tipos, penas, unificacao, reincidencia } = ctx;
  const base = CP('Art. 44');
  const total = unificacao.totalDias;
  const todosCulposos = tipos.every((t) => t.elemento === 'CULPOSO');
  const comViolencia = tipos.some((t) => t.violenciaOuGraveAmeaca && t.elemento !== 'CULPOSO');
  const domestica = tipos.some((t) => t.violenciaDomestica) || Boolean(caso.vitima.violenciaDomestica && caso.vitima.mulher);

  if (domestica && comViolencia) return { cabivel: false, base, motivo: 'Violência doméstica e familiar contra a mulher: a substituição é vedada (Súmula 588 do STJ), e a Lei Maria da Penha proíbe cesta básica, prestação pecuniária e multa isolada (art. 17).' };
  if (comViolencia) return { cabivel: false, base, motivo: 'Crime doloso cometido com violência ou grave ameaça à pessoa (art. 44, I).' };
  if (!todosCulposos && total > dias(4)) return { cabivel: false, base, motivo: `Pena de ${formatarPena(total)} supera 4 anos (art. 44, I).` };
  if (reincidencia.efetiva && caso.agente.reincidenteDoloso !== false) {
    if (caso.agente.reincidenteEspecifico) return { cabivel: false, base, motivo: 'Reincidente específico em crime doloso: vedada (art. 44, II e § 3º).' };
    return { cabivel: 'DEPENDE', base, motivo: 'Reincidente em crime doloso: o juiz pode substituir se a medida for socialmente recomendável e a reincidência não for pelo mesmo crime (art. 44, § 3º).' };
  }
  const negativas = penas.some((_, i) => caso.crimes[i]?.circunstancias59.length > 0);
  if (negativas) return { cabivel: 'DEPENDE', base, motivo: 'Requisitos objetivos presentes; há circunstância judicial desfavorável, e o art. 44, III, exige que culpabilidade, antecedentes, conduta, personalidade, motivos e circunstâncias indiquem que a substituição basta.' };
  const drogas = tipos.some((t) => t.trafico);
  const modo = total <= dias(1) ? 'por uma restritiva de direitos ou por multa (art. 44, § 2º, 1ª parte)' : 'por duas restritivas de direitos, ou por uma restritiva e multa (art. 44, § 2º, 2ª parte)';
  return { cabivel: true, base, motivo: `Pena ${todosCulposos ? 'por crime culposo' : `de ${formatarPena(total)}, sem violência ou grave ameaça`}, réu não reincidente em crime doloso: substituição ${modo}.${drogas ? ' No tráfico, a vedação do art. 44 da Lei 11.343/06 foi declarada inconstitucional pelo STF (HC 97.256).' : ''}${penas.length > 1 && unificacao.regra === 'MATERIAL' ? ' No concurso material, avalia-se pela soma (art. 69, § 1º).' : ''}` };
}

export function sursis(ctx: ContextoConsequencias, subst: Consequencias['substituicao']): Consequencias['sursis'] {
  const { caso, unificacao, reincidencia, hoje } = ctx;
  const base = CP('Art. 77');
  const total = unificacao.totalDias;
  const dataRef = caso.datas.sentenca ?? hoje;
  const idoso = caso.agente.nascimento ? idadeEm(caso.agente.nascimento, dataRef) >= 70 : false;

  if (reincidencia.efetiva && caso.agente.reincidenteDoloso !== false) return { cabivel: false, base, motivo: 'Reincidente em crime doloso (art. 77, I). Condenação anterior só a multa não impediria (§ 1º).' };
  if (total > dias(4)) return { cabivel: false, base, motivo: `Pena de ${formatarPena(total)}: o sursis comum vai até 2 anos e o etário/humanitário até 4 (art. 77, caput e § 2º).` };
  if (total > dias(2)) {
    if (idoso) return { cabivel: subst.cabivel === true ? 'DEPENDE' : true, modalidade: 'ETARIO_HUMANITARIO', base, motivo: `Pena até 4 anos e condenado maior de 70 anos: sursis etário, por 4 a 6 anos (art. 77, § 2º).${subst.cabivel === true ? ' Como a substituição do art. 44 cabe, o sursis é subsidiário (art. 77, III).' : ''}` };
    return { cabivel: 'DEPENDE', modalidade: 'ETARIO_HUMANITARIO', base, motivo: `Pena entre 2 e 4 anos: só o sursis humanitário, se razões de saúde justificarem (art. 77, § 2º)${caso.agente.nascimento ? '' : ' — ou etário, se o condenado tiver mais de 70 anos (informe a data de nascimento)'}.` };
  }
  if (subst.cabivel === true) return { cabivel: 'DEPENDE', modalidade: 'SIMPLES', base, motivo: 'Pena até 2 anos, mas a substituição por restritiva de direitos é cabível e tem preferência (art. 77, III): o sursis só entra se ela não for indicada.' };
  return { cabivel: true, modalidade: 'SIMPLES', base, motivo: `Pena de ${formatarPena(total)}, não reincidente em crime doloso e sem substituição cabível: suspensão da execução por 2 a 4 anos (art. 77), com as condições do art. 78.` };
}

/**
 * Máximo e mínimo em abstrato do CONJUNTO dos crimes, como os tribunais
 * medem para os despenalizadores: no concurso material somam-se; no
 * formal e no continuado, aplica-se a exasperação (Súmula 243 do STJ e
 * Súmula 723 do STF).
 */
export function penasAbstratasDoConjunto(penas: PenaDoCrime[], unificacao: Unificacao) {
  if (penas.length === 1) return { maxima: penas[0].maximaAbstrataDias, minima: penas[0].minimaAbstrataDias };
  const maiorMax = Math.max(...penas.map((p) => p.maximaAbstrataDias));
  const maiorMin = Math.max(...penas.map((p) => p.minimaAbstrataDias));
  if (unificacao.regra === 'FORMAL' || unificacao.regra === 'CONTINUADO') {
    const regra = unificacao.regra;
    const fMin = fracaoPorNumeroDeCrimes(penas.length, regra);
    const fMax = regra === 'FORMAL' ? { num: 1, den: 2 } : { num: 2, den: 3 };
    return { maxima: aplicarFracao(maiorMax, fMax, '+'), minima: aplicarFracao(maiorMin, fMin, '+') };
  }
  return {
    maxima: penas.reduce((s, p) => s + p.maximaAbstrataDias, 0),
    minima: penas.reduce((s, p) => s + p.minimaAbstrataDias, 0),
  };
}

export function despenalizadores(ctx: ContextoConsequencias): Consequencias['despenalizadores'] {
  const { caso, tipos, penas, unificacao, reincidencia } = ctx;
  const { maxima, minima } = penasAbstratasDoConjunto(penas, unificacao);
  const domestica = tipos.some((t) => t.violenciaDomestica) || Boolean(caso.vitima.violenciaDomestica && caso.vitima.mulher);
  const comViolencia = tipos.some((t) => t.violenciaOuGraveAmeaca && t.elemento !== 'CULPOSO');
  const varios = penas.length > 1 ? ` (${unificacao.regra === 'MATERIAL' ? 'somados os crimes' : 'com a exasperação do concurso'}, Súmula 243 do STJ)` : '';
  const lista: Consequencias['despenalizadores'] = [];

  // IMPO
  const impo = maxima <= dias(2);
  if (domestica) lista.push({ nome: 'Infração de menor potencial ofensivo e transação penal', cabivel: false, base: MP('Art. 41'), motivo: 'A Lei 9.099/95 não se aplica à violência doméstica e familiar contra a mulher (Lei 11.340/06, art. 41; Súmula 536 do STJ).' });
  else if (impo) lista.push({ nome: 'Infração de menor potencial ofensivo e transação penal', cabivel: reincidencia.efetiva ? 'DEPENDE' : true, base: LEI_9099('Art. 61'), motivo: `Pena máxima em abstrato de ${formatarPena(maxima)}${varios}, não superior a 2 anos: competência do Juizado Especial Criminal, com transação penal (art. 76)${reincidencia.efetiva ? ' — salvo se já condenado a pena privativa por sentença definitiva (art. 76, § 2º, I)' : ''}.` });
  else lista.push({ nome: 'Infração de menor potencial ofensivo e transação penal', cabivel: false, base: LEI_9099('Art. 61'), motivo: `Pena máxima em abstrato de ${formatarPena(maxima)}${varios} supera 2 anos.` });

  // suspensão condicional do processo
  if (domestica) lista.push({ nome: 'Suspensão condicional do processo', cabivel: false, base: MP('Art. 41'), motivo: 'Vedada na violência doméstica contra a mulher (art. 41 da Lei 11.340/06; Súmula 536 do STJ).' });
  else if (minima > dias(1)) lista.push({ nome: 'Suspensão condicional do processo', cabivel: false, base: LEI_9099('Art. 89'), motivo: `Pena mínima em abstrato de ${formatarPena(minima)}${varios} supera 1 ano.` });
  else if (reincidencia.efetiva) lista.push({ nome: 'Suspensão condicional do processo', cabivel: false, base: LEI_9099('Art. 89'), motivo: 'Pena mínima até 1 ano, mas o acusado foi condenado por outro crime (art. 89, caput).' });
  else lista.push({ nome: 'Suspensão condicional do processo', cabivel: 'DEPENDE', base: LEI_9099('Art. 89'), motivo: `Pena mínima em abstrato de ${formatarPena(minima)}${varios}, não superior a 1 ano: o MP pode propor a suspensão por 2 a 4 anos, se o acusado não estiver sendo processado por outro crime e presentes os requisitos do sursis.` });

  // ANPP
  if (domestica) lista.push({ nome: 'Acordo de não persecução penal', cabivel: false, base: CPP('Art. 28-A'), motivo: 'Vedado nos crimes de violência doméstica ou familiar e nos praticados contra a mulher por razões do sexo (art. 28-A, § 2º, IV).' });
  else if (comViolencia) lista.push({ nome: 'Acordo de não persecução penal', cabivel: false, base: CPP('Art. 28-A'), motivo: 'Crime com violência ou grave ameaça (art. 28-A, caput).' });
  else if (minima >= dias(4)) lista.push({ nome: 'Acordo de não persecução penal', cabivel: false, base: CPP('Art. 28-A'), motivo: `Pena mínima de ${formatarPena(minima)}${varios}, consideradas as causas de aumento e diminuição (§ 1º), não é inferior a 4 anos.` });
  else if (!domestica && impo) lista.push({ nome: 'Acordo de não persecução penal', cabivel: false, base: CPP('Art. 28-A'), motivo: 'Cabe transação penal no Juizado, que tem preferência (art. 28-A, § 2º, I).' });
  else if (reincidencia.efetiva) lista.push({ nome: 'Acordo de não persecução penal', cabivel: false, base: CPP('Art. 28-A'), motivo: 'Investigado reincidente (art. 28-A, § 2º, II).' });
  else lista.push({ nome: 'Acordo de não persecução penal', cabivel: caso.agente.confessou ? true : 'DEPENDE', base: CPP('Art. 28-A'), motivo: `Pena mínima de ${formatarPena(minima)}${varios}, inferior a 4 anos, sem violência, não reincidente: o MP pode propor o acordo${caso.agente.confessou ? ', confessada a prática' : ' — exige confissão formal e circunstanciada'}. Enquanto não cumprido, a prescrição não corre (CP, art. 116, IV).` });

  return lista;
}
