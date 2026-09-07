/**
 * Prescrição (arts. 109 a 119 do CP) — §5.12 — e a linha do tempo do
 * processo que diz QUAL prescrição corre em cada fase.
 *
 * Quatro prazos saem do mesmo caso:
 *
 *   PUNITIVA EM ABSTRATO  pela pena máxima cominada (com a maior majorante
 *                         e a menor minorante), até a sentença — art. 109
 *   RETROATIVA            pela pena aplicada, olhando para trás a partir
 *                         da sentença, depois do trânsito para a acusação
 *                         — art. 110, § 1º; desde a Lei 12.234/10 não
 *                         alcança o período anterior à denúncia
 *   INTERCORRENTE         pela pena aplicada, da sentença ao trânsito
 *                         definitivo — art. 110, § 1º
 *   EXECUTÓRIA            pela pena aplicada, acrescida de 1/3 se
 *                         reincidente, do trânsito em julgado — art. 110,
 *                         caput; termo inicial do art. 112, I, lido pelo
 *                         STF (Tema 788) como trânsito para ambas as partes
 *
 * Reduzidos de metade pelo art. 115 (menor de 21 no fato, maior de 70 na
 * sentença). O acréscimo de 1/3 só vale para a executória (Súmula 220 do
 * STJ). Cada crime prescreve sozinho (art. 119), e o continuado prescreve
 * sem o acréscimo (Súmula 497 do STF) — por isso a função recebe a pena
 * de UM crime, não a unificada.
 */

import type { Caso, Modalidade, PenaDoCrime, PrazoPrescricional, PrescricaoDoCrime, Ref, TipoPenal, Trecho } from './tipos.ts';
import { aniversario, dataBR, diferencaDias, dias, fimPrazoPenalMeses, formatarPena, idadeEm, mesesTexto } from './tempo.ts';
import type { Reincidencia } from './dosimetria.ts';

const CP = (rotulo: string): Ref => ({ norma: 'cp', rotulo });
const L12234 = '2010-05-06';
const L12650 = '2012-05-17';   // art. 111, V (dignidade sexual de menores)
const L14344 = '2022-05-25';   // art. 111, V ampliado (violência contra criança e adolescente)
const L15160 = '2025-07-03';   // exceção do art. 115

/** Tabela do art. 109, em meses, pela pena (em dias) e pela data do fato. */
export function prazoDoArt109(penaDias: number, dataFato: string): { meses: number; inciso: string } {
  if (penaDias > dias(12)) return { meses: 240, inciso: 'I' };
  if (penaDias > dias(8)) return { meses: 192, inciso: 'II' };
  if (penaDias > dias(4)) return { meses: 144, inciso: 'III' };
  if (penaDias > dias(2)) return { meses: 96, inciso: 'IV' };
  if (penaDias >= dias(1)) return { meses: 48, inciso: 'V' };
  // Lei 12.234/10 elevou de 2 para 3 anos o prazo da pena inferior a 1 ano
  return dataFato >= L12234 ? { meses: 36, inciso: 'VI' } : { meses: 24, inciso: 'VI (redação anterior à Lei 12.234/10)' };
}

export interface Reducoes {
  metade: boolean;
  motivoMetade?: string;
  excecao115?: string;
}

export function reducaoDoArt115(tipo: TipoPenal, caso: Caso): Reducoes {
  const { agente, vitima, datas } = caso;
  if (!agente.nascimento) return { metade: false };
  const menor21 = idadeEm(agente.nascimento, datas.fato) < 21;
  const maior70 = datas.sentenca ? idadeEm(agente.nascimento, datas.sentenca) >= 70 : false;
  if (!menor21 && !maior70) return { metade: false };
  const motivo = menor21
    ? `agente com ${idadeEm(agente.nascimento, datas.fato)} anos na data do fato (menor de 21)`
    : `agente com ${idadeEm(agente.nascimento, datas.sentenca!)} anos na data da sentença (maior de 70)`;
  const excecao = tipo.dignidadeSexual && tipo.violenciaOuGraveAmeaca && vitima.mulher && datas.fato >= L15160;
  if (excecao) return { metade: false, excecao115: `O art. 115 reduziria o prazo à metade (${motivo}), mas o crime envolve violência sexual contra a mulher: sem redução (Lei 15.160/25).` };
  return { metade: true, motivoMetade: `Prazo reduzido de metade: ${motivo} (art. 115).` };
}

function montarPrazo(
  modalidade: Modalidade, penaRef: number, dataFato: string, reducoes: Reducoes, reincidente: boolean,
): PrazoPrescricional {
  const tabela = prazoDoArt109(penaRef, dataFato);
  let meses = tabela.meses;
  const composicao = [`Pena de referência ${formatarPena(penaRef)} → art. 109, ${tabela.inciso}: ${mesesTexto(tabela.meses)}.`];
  const base: Ref[] = [CP('Art. 109')];
  if (modalidade !== 'PUNITIVA_ABSTRATA') base.push(CP('Art. 110'));
  if (modalidade === 'EXECUTORIA' && reincidente) {
    meses = Math.round(meses * 4 / 3);
    composicao.push(`Acrescido de 1/3 pela reincidência (art. 110, caput): ${mesesTexto(meses)}.`);
  } else if (reincidente && (modalidade === 'RETROATIVA' || modalidade === 'INTERCORRENTE')) {
    composicao.push('Sem o acréscimo de 1/3 da reincidência: ele só vale para a executória (Súmula 220 do STJ).');
  }
  if (reducoes.metade) {
    meses = Math.round(meses / 2);
    composicao.push(`${reducoes.motivoMetade} Prazo final: ${mesesTexto(meses)}.`);
    base.push(CP('Art. 115'));
  }
  if (reducoes.excecao115) composicao.push(reducoes.excecao115);
  return { modalidade, penaReferenciaDias: penaRef, prazoMeses: meses, composicao, base };
}

/** Termo inicial da prescrição antes da sentença (art. 111). */
export function termoInicial(tipo: TipoPenal, pena: PenaDoCrime, caso: Caso, crimeIndex: number): { data: string; explicacao: string } {
  const { datas, vitima } = caso;
  const crime = caso.crimes[crimeIndex];
  const tentado = crime?.causas.some((c) => c.id === 'cp-14-tentativa');
  let data = datas.fato;
  let explicacao = 'Do dia em que o crime se consumou (art. 111, I).';
  if (tentado) explicacao = 'Tentativa: do dia em que cessou a atividade criminosa (art. 111, II).';
  if (datas.cessacao && datas.cessacao > datas.fato) { data = datas.cessacao; explicacao = 'Crime permanente: do dia em que cessou a permanência (art. 111, III).'; }

  const menorDe18 = vitima.nascimento ? idadeEm(vitima.nascimento, datas.fato) < 18 : false;
  const alcancado = (tipo.dignidadeSexual && datas.fato >= L12650) || (tipo.violenciaOuGraveAmeaca && datas.fato >= L14344);
  if (menorDe18 && alcancado && vitima.nascimento) {
    const dezoito = aniversario(vitima.nascimento, 18);
    const acaoAntes = datas.recebimentoDenuncia && datas.recebimentoDenuncia < dezoito;
    if (acaoAntes) explicacao += ` A vítima era menor de 18, mas a ação penal foi proposta antes de ela completar 18 (${dataBR(dezoito)}): vale o termo comum (art. 111, V, parte final).`;
    else if (dezoito > data) { data = dezoito; explicacao = `Vítima menor de 18 anos em crime contra a dignidade sexual ou com violência: a prescrição só começa quando ela completa 18, em ${dataBR(dezoito)} (art. 111, V).`; }
  }
  return { data, explicacao };
}

/* ------------------------------------------------------------------ */
/*  Linha do tempo                                                     */
/* ------------------------------------------------------------------ */

function trecho(
  fase: Trecho['fase'], titulo: string, inicio: string, fim: string | null, marcoInicial: string, marcoFinal: string,
  prazo: PrazoPrescricional | null, hoje: string, explicacao: string, imprescritivel: boolean,
): Trecho {
  const fimEfetivo = fim ?? hoje;
  const diasCorridos = Math.max(0, diferencaDias(inicio, fimEfetivo));
  if (imprescritivel) {
    return { fase, titulo, inicio, fim, marcoInicial, marcoFinal, modalidade: prazo?.modalidade ?? 'NENHUMA', prazoMeses: null, vencimento: null, situacao: 'IMPRESCRITIVEL', explicacao, diasCorridos, diasRestantes: null };
  }
  if (!prazo) {
    return { fase, titulo, inicio, fim, marcoInicial, marcoFinal, modalidade: 'NENHUMA', prazoMeses: null, vencimento: null, situacao: 'NAO_CORRE', explicacao, diasCorridos, diasRestantes: null };
  }
  const vencimento = fimPrazoPenalMeses(inicio, prazo.prazoMeses);
  let situacao: Trecho['situacao'];
  if (fim) situacao = fim > vencimento ? 'PRESCRITO' : 'INTERROMPIDO';
  else situacao = hoje > vencimento ? 'PRESCRITO' : 'CORRENDO';
  const diasRestantes = fim ? null : diferencaDias(hoje, vencimento);
  return { fase, titulo, inicio, fim, marcoInicial, marcoFinal, modalidade: prazo.modalidade, prazoMeses: prazo.prazoMeses, vencimento, situacao, explicacao, diasCorridos, diasRestantes };
}

export function prescricaoDoCrime(
  tipo: TipoPenal, pena: PenaDoCrime, caso: Caso, crimeIndex: number, reincidencia: Reincidencia, hoje: string,
): PrescricaoDoCrime {
  const { datas, criterios } = caso;
  const avisos: string[] = [];
  const reducoes = reducaoDoArt115(tipo, caso);
  const reinc = reincidencia.efetiva;

  const abstrata = montarPrazo('PUNITIVA_ABSTRATA', pena.maximaAbstrataDias, datas.fato, reducoes, false);
  const retroativa = montarPrazo('RETROATIVA', pena.penaDefinitivaDias, datas.fato, reducoes, reinc);
  const intercorrente = montarPrazo('INTERCORRENTE', pena.penaDefinitivaDias, datas.fato, reducoes, reinc);
  const executoria = montarPrazo('EXECUTORIA', pena.penaDefinitivaDias, datas.fato, reducoes, reinc);
  const prazos: PrazoPrescricional[] = [abstrata, retroativa, intercorrente, executoria];

  if (tipo.multa !== 'NAO') {
    const isolada = tipo.multa === 'ALTERNATIVA';
    prazos.push({
      modalidade: 'MULTA', penaReferenciaDias: pena.penaDefinitivaDias, prazoMeses: isolada ? 24 : executoria.prazoMeses,
      composicao: isolada
        ? ['Multa cominada alternativamente: se for a única APLICADA, prescreve em 2 anos (art. 114, I). Se aplicada junto com a privativa, segue o prazo dela (art. 114, II).']
        : [`Multa cumulativa: prescreve no mesmo prazo da pena privativa de liberdade (art. 114, II) — ${mesesTexto(executoria.prazoMeses)} na executória. As penas mais leves prescrevem com as mais graves (art. 118).`],
      base: [CP('Art. 114'), CP('Art. 118')],
    });
  }

  if (tipo.imprescritivel) avisos.push('Crime imprescritível (CF, art. 5º, XLII e XLIV): nenhum dos prazos abaixo se consuma. A linha do tempo mostra as fases, mas sem vencimento.');
  if (reducoes.excecao115) avisos.push(reducoes.excecao115);
  if (reinc) avisos.push('O acréscimo de 1/3 da reincidência (art. 110, caput) foi aplicado só à prescrição executória (Súmula 220 do STJ).');
  if (datas.fato >= L12234) avisos.push('Fato posterior à Lei 12.234/10: a prescrição retroativa não alcança o período entre o fato e o recebimento da denúncia (art. 110, § 1º, parte final).');
  else avisos.push('Fato anterior à Lei 12.234/10: a prescrição retroativa pode ser reconhecida também entre o fato e o recebimento da denúncia (redação antiga do art. 110, § 2º).');
  avisos.push('Causas suspensivas (art. 116: questão prejudicial, pena no exterior, recurso inadmissível aos tribunais superiores, ANPP não cumprido) não estão na linha do tempo — se houver, o prazo fica parado durante elas.');

  /* ---- trechos ---- */
  const t0 = termoInicial(tipo, pena, caso, crimeIndex);
  const trechos: Trecho[] = [];
  const impr = tipo.imprescritivel;
  const temTransitoAcusacao = Boolean(datas.transitoAcusacao || datas.transitoAmbos);
  const denuncia = datas.recebimentoDenuncia ?? null;

  // 1. do fato ao recebimento da denúncia
  {
    const retroAlcanca = temTransitoAcusacao && datas.fato < L12234;
    const prazo = retroAlcanca ? retroativa : abstrata;
    const expl = `${t0.explicacao} Até a sentença corre a prescrição da pretensão punitiva pela pena máxima em abstrato (art. 109).` +
      (temTransitoAcusacao ? (retroAlcanca ? ' Com o trânsito para a acusação, este trecho é reavaliado pela pena aplicada (retroativa), porque o fato é anterior à Lei 12.234/10.' : ' A retroativa pela pena aplicada NÃO alcança este trecho (Lei 12.234/10): aqui vale só a abstrata.') : '');
    trechos.push(trecho('INQUERITO', 'Do fato ao recebimento da denúncia', t0.data, denuncia, 'termo inicial (art. 111)', 'recebimento da denúncia (art. 117, I)', prazo, hoje, expl, impr));
  }

  if (denuncia) {
    const marcosJuri = [datas.pronuncia && { data: datas.pronuncia, nome: 'pronúncia (art. 117, II)' }, datas.confirmacaoPronuncia && { data: datas.confirmacaoPronuncia, nome: 'decisão confirmatória da pronúncia (art. 117, III)' }].filter(Boolean) as { data: string; nome: string }[];
    const sentenca = datas.sentenca ?? null;
    const prazoInstrucao = temTransitoAcusacao ? retroativa : abstrata;
    const explInstrucao = temTransitoAcusacao
      ? 'Com trânsito em julgado para a acusação, o trecho entre a denúncia e a sentença é medido pela pena APLICADA (prescrição retroativa, art. 110, § 1º).'
      : 'Enquanto não há sentença com trânsito para a acusação, corre a prescrição pela pena máxima em abstrato (art. 109).';

    let inicio = denuncia;
    let nomeInicio = 'recebimento da denúncia (art. 117, I)';
    for (const marco of marcosJuri) {
      trechos.push(trecho('JURI', `De ${nomeInicio.split(' (')[0]} a ${marco.nome.split(' (')[0]}`, inicio, marco.data, nomeInicio, marco.nome, prazoInstrucao, hoje, `${explInstrucao} A ${marco.nome.split(' (')[0]} interrompe e recomeça o prazo (art. 117, § 2º).`, impr));
      inicio = marco.data; nomeInicio = marco.nome;
    }
    trechos.push(trecho(marcosJuri.length ? 'JURI' : 'INSTRUCAO', `De ${nomeInicio.split(' (')[0]} à sentença condenatória`, inicio, sentenca, nomeInicio, 'publicação da sentença ou acórdão condenatório recorrível (art. 117, IV)', prazoInstrucao, hoje, explInstrucao, impr));

    // 3. da sentença ao trânsito definitivo
    if (sentenca) {
      const fimRecurso = datas.transitoAmbos ?? null;
      const prazoRecurso = temTransitoAcusacao ? intercorrente : abstrata;
      trechos.push(trecho('RECURSO', 'Da sentença ao trânsito em julgado', sentenca, fimRecurso, 'sentença condenatória (art. 117, IV)', 'trânsito em julgado para ambas as partes', prazoRecurso, hoje,
        temTransitoAcusacao
          ? `Depois do trânsito para a acusação${datas.transitoAcusacao ? ` (${dataBR(datas.transitoAcusacao)})` : ''}, entre a sentença e o trânsito definitivo corre a prescrição INTERCORRENTE pela pena aplicada (art. 110, § 1º).`
          : 'Sem trânsito para a acusação ainda, a acusação pode recorrer para aumentar a pena: segue valendo a prescrição pela pena máxima em abstrato.', impr));

      // 4. execução
      const termoExec = criterios.termoInicialExecutoria === 'TEMA_788' ? datas.transitoAmbos : (datas.transitoAcusacao ?? datas.transitoAmbos);
      if (termoExec) {
        const fimExec = datas.inicioCumprimento ?? null;
        trechos.push(trecho('EXECUCAO', 'Do trânsito em julgado ao início do cumprimento', termoExec, fimExec,
          criterios.termoInicialExecutoria === 'TEMA_788' ? 'trânsito em julgado para ambas as partes (Tema 788 do STF)' : 'trânsito em julgado para a acusação (art. 112, I, literal)',
          'início do cumprimento da pena (art. 117, V)', executoria, hoje,
          `Prescrição da pretensão EXECUTÓRIA pela pena aplicada${reinc ? ', acrescida de 1/3 pela reincidência' : ''} (art. 110, caput). ${criterios.termoInicialExecutoria === 'TEMA_788' ? 'Termo inicial no trânsito para ambas as partes, como fixou o STF no Tema 788 (2023) — antes disso não há pena a executar.' : 'Termo inicial no trânsito para a acusação, pela letra do art. 112, I (critério afastado pelo STF no Tema 788).'} Iniciado o cumprimento, o prazo se interrompe; evasão faz correr pelo tempo restante (art. 113).`, impr));
      } else {
        trechos.push({ fase: 'EXECUCAO', titulo: 'Execução', inicio: sentenca, fim: null, marcoInicial: 'trânsito em julgado', marcoFinal: 'início do cumprimento', modalidade: 'EXECUTORIA', prazoMeses: executoria.prazoMeses, vencimento: null, situacao: 'FALTA_DADO', explicacao: `Informe a data do trânsito em julgado ${criterios.termoInicialExecutoria === 'TEMA_788' ? 'para ambas as partes' : 'para a acusação'} para calcular a prescrição executória (${mesesTexto(executoria.prazoMeses)}).`, diasCorridos: null, diasRestantes: null });
      }
    }
  }

  const ultimo = trechos[trechos.length - 1];
  const faseAtual: PrescricaoDoCrime['faseAtual'] = !denuncia ? 'INQUERITO' : ultimo.situacao === 'FALTA_DADO' ? 'RECURSO' : ultimo.fase;

  return { tipoId: tipo.id, nome: tipo.nome, imprescritivel: impr, prazos, trechos, faseAtual, avisos };
}
