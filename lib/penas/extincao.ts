/**
 * Decadência (CP, art. 103; CPP, art. 38) e perempção (CPP, art. 60) — §5.12.
 *
 * As duas só existem quando a ação penal depende do ofendido: a
 * decadência, na ação privada e na pública condicionada; a perempção,
 * só na ação privada exclusiva. Num crime de ação pública incondicionada
 * a resposta certa é "não se aplica" — e a tela diz isso com o motivo,
 * porque é assim que a pergunta cai na prova.
 *
 * Prazos diferentes, calendários diferentes: a decadência é prazo PENAL
 * (art. 10 do CP — o dia do começo conta, não se prorroga, não se
 * interrompe); a perempção é prazo PROCESSUAL (art. 798 do CPP — o dia
 * do começo não conta, prorroga para o dia útil).
 */

import type { Caso, Decadencia, Perempcao, Ref, TipoPenal } from './tipos.ts';
import { dataBR, fimPrazoPenalMeses, fimPrazoProcessualDias, somarDias } from './tempo.ts';

const CP = (rotulo: string): Ref => ({ norma: 'cp', rotulo });
const CPP = (rotulo: string): Ref => ({ norma: 'cpp', rotulo });
const MP = (rotulo: string): Ref => ({ norma: 'maria-da-penha', rotulo });
const L15438 = '2026-06-18';   // art. 103, p. ún.: 12 meses na violência doméstica

export function decadencia(tipo: TipoPenal, caso: Caso, hoje: string): Decadencia {
  const { datas, vitima } = caso;
  const base: Ref[] = [CP('Art. 103'), CPP('Art. 38')];
  const especie = tipo.acaoPenal;

  if (especie === 'PUBLICA_INCONDICIONADA') {
    return {
      aplicavel: false, base,
      motivo: `${tipo.nome} é crime de ação penal pública incondicionada: o Ministério Público age de ofício, não há queixa nem representação a exercer, e por isso não há decadência.${tipo.violenciaDomestica ? ' Na lesão corporal em violência doméstica isso vale mesmo para a lesão leve (Súmula 542 do STJ).' : ''}${tipo.dignidadeSexual ? ' Nos crimes contra a dignidade sexual, a ação é pública incondicionada desde a Lei 13.718/18 (art. 225).' : ''}`,
    };
  }

  const domestica = Boolean(tipo.violenciaDomestica || (vitima.violenciaDomestica && vitima.mulher));
  const prazoMeses = domestica && datas.fato >= L15438 ? 12 : 6;
  if (domestica && datas.fato >= L15438) base.push(CP('Art. 103'));
  const termo = datas.conhecimentoAutoria ?? datas.fato;
  const presumido = !datas.conhecimentoAutoria;
  const ultimoDia = fimPrazoPenalMeses(termo, prazoMeses);
  const consumadaEm = somarDias(ultimoDia, 1);
  const exercicio = datas.representacao ?? datas.recebimentoDenuncia;
  const direito = especie === 'PRIVADA' ? 'de queixa' : 'de representação';

  let situacao: Decadencia['situacao'];
  let motivo = `${tipo.nome} é crime de ação penal ${especie === 'PRIVADA' ? 'privada' : 'pública condicionada à representação'}: o ofendido tem ${prazoMeses} meses, contados do dia em que soube quem é o autor${presumido ? ` (não informado — presumido igual à data do fato, ${dataBR(datas.fato)})` : ` (${dataBR(termo)})`}, para exercer o direito ${direito}. Prazo penal (art. 10): o dia do começo conta e não há prorrogação. Último dia: ${dataBR(ultimoDia)}.`;
  if (domestica && datas.fato >= L15438) motivo += ' Em violência doméstica e familiar contra a mulher, o prazo é de 12 meses (art. 103, p. ún., Lei 15.438/26).';
  if (exercicio) {
    if (exercicio <= ultimoDia) { situacao = 'EXERCIDA'; motivo += ` ${especie === 'PRIVADA' ? 'A queixa foi recebida' : 'A representação foi oferecida'} em ${dataBR(exercicio)}, dentro do prazo.`; }
    else { situacao = 'DECAIU'; motivo += ` ${especie === 'PRIVADA' ? 'A queixa só foi recebida' : 'A representação só veio'} em ${dataBR(exercicio)}, depois do prazo: decadência, extinta a punibilidade (art. 107, IV).`; }
  } else if (hoje > ultimoDia) { situacao = 'DECAIU'; motivo += ` Sem exercício informado até hoje (${dataBR(hoje)}): decaiu em ${dataBR(consumadaEm)}.`; }
  else { situacao = 'NO_PRAZO'; motivo += ` Ainda no prazo: restam ${Math.max(0, Math.round((new Date(ultimoDia).getTime() - new Date(hoje).getTime()) / 86_400_000))} dias.`; }

  if (especie === 'PUBLICA_CONDICIONADA') {
    motivo += ' A representação é retratável até o oferecimento da denúncia (CPP, art. 25)';
    if (domestica) { motivo += ' — em violência doméstica, só em audiência designada para isso, antes do recebimento da denúncia e ouvido o MP (Lei 11.340/06, art. 16).'; base.push(MP('Art. 16')); }
    else motivo += '.';
  }
  if (especie === 'PRIVADA') motivo += ' Morto o ofendido, o direito passa a cônjuge, ascendente, descendente ou irmão (art. 100, § 4º).';

  return { aplicavel: true, motivo, prazoMeses, termoInicial: termo, ultimoDia, consumadaEm, situacao, base };
}

export function perempcao(tipo: TipoPenal, caso: Caso, hoje: string): Perempcao {
  const { datas } = caso;
  const base: Ref[] = [CPP('Art. 60')];
  if (tipo.acaoPenal !== 'PRIVADA') {
    return {
      aplicavel: false, base, hipoteses: [],
      motivo: `A perempção é sanção à inércia do QUERELANTE e só existe na ação penal privada exclusiva (art. 60, caput: "nos casos em que somente se procede mediante queixa"). ${tipo.nome} é de ação pública${tipo.acaoPenal === 'PUBLICA_CONDICIONADA' ? ' condicionada' : ''}: quem a move é o Ministério Público, e a inércia dele não perime. Também não há perempção na ação privada subsidiária da pública (CPP, art. 29): ali o MP retoma a ação.`,
    };
  }

  const hipoteses: Perempcao['hipoteses'] = [];
  // I — 30 dias seguidos sem promover o andamento
  {
    const inicio = datas.ultimoAtoQuerelante;
    const h: Perempcao['hipoteses'][number] = { inciso: 'I', descricao: 'Querelante deixa de promover o andamento do processo por 30 dias seguidos.', prazoDias: 30 };
    if (inicio) {
      h.termoInicial = inicio;
      h.ultimoDia = fimPrazoProcessualDias(inicio, 30);
      h.situacao = hoje > h.ultimoDia ? 'PEREMPTA' : 'NO_PRAZO';
      h.descricao += ` Último ato em ${dataBR(inicio)}; prazo processual (art. 798: o dia do começo não conta, prorroga para o dia útil) — o 30º dia é ${dataBR(h.ultimoDia)}. ${h.situacao === 'PEREMPTA' ? 'Se não houve andamento até essa data, a ação está perempta e a punibilidade extinta (CP, art. 107, IV).' : 'Ainda no prazo.'}`;
    } else { h.situacao = 'FALTA_DADO'; h.descricao += ' Informe a data do último ato do querelante para calcular.'; }
    hipoteses.push(h);
  }
  // II — morte ou incapacidade sem sucessão em 60 dias
  {
    const inicio = datas.morteQuerelante;
    const h: Perempcao['hipoteses'][number] = { inciso: 'II', descricao: 'Morte ou incapacidade do querelante sem que cônjuge, ascendente, descendente ou irmão compareça para prosseguir em 60 dias.', prazoDias: 60 };
    if (inicio) {
      h.termoInicial = inicio;
      h.ultimoDia = fimPrazoProcessualDias(inicio, 60);
      h.situacao = hoje > h.ultimoDia ? 'PEREMPTA' : 'NO_PRAZO';
      h.descricao += ` Morte em ${dataBR(inicio)}; 60º dia (prazo processual): ${dataBR(h.ultimoDia)}. ${h.situacao === 'PEREMPTA' ? 'Sem habilitação de sucessor até essa data, a ação está perempta.' : 'Ainda no prazo para a habilitação.'}`;
    } else { h.situacao = 'FALTA_DADO'; h.descricao += ' Informe a data da morte ou incapacidade para calcular.'; }
    hipoteses.push(h);
  }
  hipoteses.push({ inciso: 'III', descricao: 'Querelante falta, sem justificativa, a ato a que devia estar presente, ou deixa de pedir a condenação nas alegações finais. Hipótese de ato, não de prazo: verifica-se nos autos.' });
  hipoteses.push({ inciso: 'IV', descricao: 'Querelante pessoa jurídica que se extingue sem deixar sucessor.' });

  return {
    aplicavel: true, base, hipoteses,
    motivo: `${tipo.nome} é crime de ação penal privada: a inércia do querelante perime a ação (art. 60 do CPP) e extingue a punibilidade (CP, art. 107, IV). A perempção pressupõe ação já iniciada — antes da queixa, o que corre é a decadência.`,
  };
}
