/**
 * A Calculadora Penal inteira, numa função pura (§5.12): recebe o caso,
 * devolve o resultado. Sem banco, sem React — o que permite rodar a mesma
 * função no navegador (prévia ao vivo) e no servidor (a página do
 * resultado), e testá-la com casos-referência de acórdãos.
 */

import type { Caso, Consequencias, Derivado, Resultado, TipoPenal } from './tipos.ts';
import { dataBR, diferencaDias, formatarPena, hojeISO, idadeEm, dataValida, aniversario, somarMeses } from './tempo.ts';
import { tipoPorId, CATALOGO_CONFERIDO_EM, rotuloCompleto } from './catalogo/index.ts';
import { dosarCrime, unificar, reincidenciaEfetiva } from './dosimetria.ts';
import { regimeInicial, substituicao, sursis, despenalizadores } from './regime.ts';
import { progressao, livramento } from './execucao.ts';
import { prescricaoDoCrime } from './prescricao.ts';
import { decadencia, perempcao } from './extincao.ts';

export type CodigoErro = 'SEM_CRIME' | 'INIMPUTAVEL' | 'DATA_INVALIDA' | 'TIPO_INEXISTENTE';

/* Sem 'parameter property' no construtor: o Node roda estes arquivos só
   apagando os tipos (strip-only), e essa sintaxe não é apagável. */
export class ErroDeCalculo extends Error {
  readonly codigo: CodigoErro;
  constructor(message: string, codigo: CodigoErro) {
    super(message);
    this.name = 'ErroDeCalculo';
    this.codigo = codigo;
  }
}

const PESO_ACAO = { PRIVADA: 3, PUBLICA_CONDICIONADA: 2, PUBLICA_INCONDICIONADA: 1 } as const;

export function calcular(caso: Caso): Resultado {
  const hoje = caso.datas.hoje && dataValida(caso.datas.hoje) ? caso.datas.hoje : hojeISO();
  if (!dataValida(caso.datas.fato)) throw new ErroDeCalculo('Informe a data do fato: é ela que escolhe a lei aplicável e abre todos os prazos.', 'DATA_INVALIDA');
  if (caso.crimes.length === 0) throw new ErroDeCalculo('Escolha pelo menos um crime.', 'SEM_CRIME');

  if (caso.agente.nascimento && idadeEm(caso.agente.nascimento, caso.datas.fato) < 18) {
    throw new ErroDeCalculo(
      `Na data do fato o agente tinha ${idadeEm(caso.agente.nascimento, caso.datas.fato)} anos: menor de 18 é penalmente inimputável (CP, art. 27; CF, art. 228). Não há pena a calcular — o caso segue pelo ECA (Lei 8.069/90), com medidas socioeducativas, e a prescrição é regulada pela pena do tipo reduzida à metade (Súmula 338 do STJ).`,
      'INIMPUTAVEL',
    );
  }

  const avisos: string[] = [];
  const tipos: TipoPenal[] = [];
  const crimesValidos: Caso['crimes'] = [];
  for (const crime of caso.crimes) {
    const tipo = tipoPorId(crime.tipoId, caso.datas.fato);
    if (!tipo) {
      const qualquer = tipoPorId(crime.tipoId);
      avisos.push(qualquer
        ? `${qualquer.nome}: não havia redação vigente em ${dataBR(caso.datas.fato)} (o tipo é da Lei de ${qualquer.vigenciaDe.slice(0, 4)}). Fato anterior à lei que criou o crime não é crime (CF, art. 5º, XXXIX). O crime foi retirado do cálculo.`
        : `Crime "${crime.tipoId}" não está no catálogo e foi ignorado.`);
      continue;
    }
    tipos.push(tipo);
    crimesValidos.push(crime);
  }
  if (tipos.length === 0) throw new ErroDeCalculo(avisos.join(' ') || 'Nenhum crime válido para a data do fato.', 'TIPO_INEXISTENTE');
  const casoValido: Caso = { ...caso, crimes: crimesValidos };

  const penas = tipos.map((tipo, i) => dosarCrime(tipo, crimesValidos[i], casoValido));
  const unificacao = unificar(penas, casoValido);
  const reincidencia = reincidenciaEfetiva(casoValido);
  if (caso.agente.reincidente && !reincidencia.efetiva) avisos.push(reincidencia.motivo);

  const ctx = { caso: casoValido, tipos, penas, unificacao, reincidencia, hoje };
  const regime = regimeInicial(ctx);
  const subst = substituicao(ctx);
  const susp = sursis(ctx, subst);
  const desp = despenalizadores(ctx);
  const prog = progressao(ctx);
  const livr = livramento(ctx, prog.vedaLivramento);
  const consequencias: Consequencias = {
    regime, substituicao: subst, sursis: susp, despenalizadores: desp,
    execucao: { versao: prog.versao, progressao: { fracaoTexto: prog.fracaoTexto, diasNecessarios: prog.diasNecessarios, fundamento: prog.fundamento, base: prog.base, data: prog.data }, livramento: livr },
  };

  const prescricao = tipos.map((tipo, i) => prescricaoDoCrime(tipo, penas[i], casoValido, i, reincidencia, hoje));

  // decadência e perempção pelo crime cuja ação penal mais depende do ofendido
  const indice = tipos.reduce((m, t, i) => (PESO_ACAO[t.acaoPenal] > PESO_ACAO[tipos[m].acaoPenal] ? i : m), 0);
  const dec = decadencia(tipos[indice], casoValido, hoje);
  const per = perempcao(tipos[indice], casoValido, hoje);
  if (tipos.length > 1) avisos.push(`Decadência e perempção foram avaliadas para ${tipos[indice].nome}; no concurso, cada crime tem a sua espécie de ação penal (${tipos.map((t) => `${t.nome}: ${NOME_ACAO[t.acaoPenal]}`).join('; ')}).`);

  const ficha = montarFicha(casoValido, tipos, reincidencia, hoje);

  return { crimes: penas, unificacao, consequencias, prescricao, decadencia: dec, perempcao: per, ficha, avisos, hoje };
}

const NOME_ACAO = { PRIVADA: 'ação privada', PUBLICA_CONDICIONADA: 'pública condicionada', PUBLICA_INCONDICIONADA: 'pública incondicionada' } as const;

/**
 * A ficha do caso: o que o motor DEDUZIU dos dados informados, para o
 * aluno conferir as premissas antes de acreditar no resultado. Uma data
 * de nascimento errada muda pena, prescrição e sursis ao mesmo tempo — e
 * sem a ficha ninguém veria.
 */
export function montarFicha(caso: Caso, tipos: TipoPenal[], reincidencia: ReturnType<typeof reincidenciaEfetiva>, hoje: string): Derivado[] {
  const { agente, vitima, datas } = caso;
  const ficha: Derivado[] = [];

  for (const t of tipos) {
    const redacao = t.vigenciaAte
      ? `redação vigente de ${dataBR(t.vigenciaDe)} a ${dataBR(t.vigenciaAte)}${t.observacoes ? ` — ${t.observacoes}` : ''}`
      : `redação vigente desde ${dataBR(t.vigenciaDe)}`;
    ficha.push({ rotulo: 'Lei aplicada', valor: `${t.nome} (${rotuloCompleto(t)}), ${redacao}.`, efeito: `A data do fato (${dataBR(datas.fato)}) escolhe a redação (CF, art. 5º, XL): lei posterior só alcança o fato se for mais benéfica, e leis não se combinam (Súmula 501 do STJ).`, base: { norma: t.norma, rotulo: t.rotulo } });
    ficha.push({ rotulo: 'Ação penal', valor: NOME_ACAO[t.acaoPenal] + (t.hediondo !== 'NAO' ? ` · ${t.hediondo === 'HEDIONDO' ? 'crime hediondo' : 'equiparado a hediondo'}` : '') + (t.violenciaOuGraveAmeaca ? ' · com violência ou grave ameaça' : ' · sem violência ou grave ameaça') + (t.elemento === 'CULPOSO' ? ' · culposo' : ''), efeito: t.acaoPenal === 'PUBLICA_INCONDICIONADA' ? 'Sem decadência nem perempção.' : t.acaoPenal === 'PRIVADA' ? 'Sujeito a decadência (queixa) e a perempção.' : 'Sujeito a decadência da representação; sem perempção.' });
  }

  ficha.push({ rotulo: 'Tempo decorrido desde o fato', valor: `${diferencaDias(datas.fato, hoje)} dias (${formatarPena(Math.max(0, Math.round(diferencaDias(datas.fato, hoje) / 365.25 * 360)))} aproximados), até ${dataBR(hoje)}.` });

  if (agente.nascimento) {
    const noFato = idadeEm(agente.nascimento, datas.fato);
    const efeitos: string[] = [];
    if (noFato < 21) efeitos.push('menor de 21: atenuante do art. 65, I, e prazo prescricional pela metade (art. 115)');
    else efeitos.push(`não era menor de 21 (completou 21 em ${dataBR(aniversario(agente.nascimento, 21))}): sem a atenuante do art. 65, I, nem a redução do art. 115 por esse fundamento`);
    ficha.push({ rotulo: 'Idade do agente na data do fato', valor: `${noFato} anos`, efeito: efeitos.join('; ') + '.', base: { norma: 'cp', rotulo: 'Art. 65' } });
    const ref = datas.sentenca ?? hoje;
    const naSentenca = idadeEm(agente.nascimento, ref);
    ficha.push({
      rotulo: datas.sentenca ? 'Idade do agente na data da sentença' : 'Idade do agente hoje (sem data de sentença)',
      valor: `${naSentenca} anos`,
      efeito: naSentenca >= 70
        ? 'Maior de 70: atenuante do art. 65, I; prescrição pela metade (art. 115); sursis etário até 4 anos (art. 77, § 2º).'
        : `Completa 70 em ${dataBR(aniversario(agente.nascimento, 70))}; se a sentença vier depois disso, incidem art. 65, I, art. 115 e art. 77, § 2º.`,
      base: { norma: 'cp', rotulo: 'Art. 115' },
    });
  } else {
    ficha.push({ rotulo: 'Idade do agente', valor: 'não informada', efeito: 'Sem a data de nascimento não se avaliam a menoridade relativa (art. 65, I), a redução da prescrição (art. 115), o sursis etário (art. 77, § 2º) nem a inimputabilidade (art. 27).' });
  }

  if (vitima.nascimento) {
    const idade = idadeEm(vitima.nascimento, datas.fato);
    const efeitos: string[] = [];
    if (idade < 12) efeitos.push('criança (ECA, art. 2º): agravante do art. 61, II, h');
    else if (idade < 18) efeitos.push('adolescente: a prescrição de crime sexual ou com violência só começa aos 18 dela (art. 111, V)');
    if (idade < 14) efeitos.push('menor de 14: vulnerável para os arts. 217-A e 218-B; majorante do art. 121, § 2º-B');
    if (idade >= 60) efeitos.push('maior de 60: agravante do art. 61, II, h; qualifica a extorsão mediante sequestro (art. 159, § 1º); majora o estelionato (art. 171, § 4º)');
    if (efeitos.length === 0) efeitos.push('entre 18 e 59 anos: a idade não muda a pena');
    ficha.push({ rotulo: 'Idade da vítima na data do fato', valor: `${idade} anos${vitima.mulher ? ' · mulher' : ''}${vitima.violenciaDomestica ? ' · contexto de violência doméstica' : ''}`, efeito: efeitos.join('; ') + '.', base: { norma: 'cp', rotulo: 'Art. 61' } });
  } else if (vitima.mulher || vitima.violenciaDomestica) {
    ficha.push({ rotulo: 'Vítima', valor: `${vitima.mulher ? 'mulher' : ''}${vitima.mulher && vitima.violenciaDomestica ? ', ' : ''}${vitima.violenciaDomestica ? 'em contexto de violência doméstica e familiar' : ''}`, efeito: vitima.violenciaDomestica ? 'Agravante do art. 61, II, f; afasta a Lei 9.099/95 (Lei 11.340/06, art. 41), a substituição (Súmula 588 do STJ) e o ANPP (CPP, art. 28-A, § 2º, IV).' : 'Abre as majorantes por razões da condição do sexo feminino onde previstas (arts. 141, § 3º, e 147, § 1º).' });
  }

  if (agente.reincidente) {
    ficha.push({ rotulo: 'Reincidência', valor: reincidencia.efetiva ? 'reincidente' : 'NÃO reincidente para efeitos legais', efeito: reincidencia.motivo + (reincidencia.efetiva && reincidencia.caducaEm ? '' : reincidencia.efetiva && !agente.extincaoAnterior ? ' Informe a data em que a pena anterior foi cumprida ou extinta para verificar a temporariedade de cinco anos (art. 64, I).' : ''), base: { norma: 'cp', rotulo: 'Art. 64' } });
  } else {
    ficha.push({ rotulo: 'Reincidência', valor: 'primário', efeito: 'Sem agravante do art. 61, I; sem o acréscimo de 1/3 na prescrição executória; frações menores de progressão e livramento.' });
  }

  if (datas.prisaoProvisoriaDias) ficha.push({ rotulo: 'Prisão provisória', valor: formatarPena(datas.prisaoProvisoriaDias), efeito: 'Detraída da pena (art. 42) e considerada para o regime inicial (CPP, art. 387, § 2º).', base: { norma: 'cp', rotulo: 'Art. 42' } });

  ficha.push({ rotulo: 'Catálogo de regras', valor: `penas e causas conferidas no acervo em ${dataBR(CATALOGO_CONFERIDO_EM)}`, efeito: 'Se a lei mudou depois dessa data, o resultado pode estar desatualizado.' });
  ficha.push({ rotulo: 'Dia-multa', valor: `${caso.criterios.valorDiaMulta.num}/${caso.criterios.valorDiaMulta.den} do salário mínimo de R$ ${caso.criterios.salarioMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, efeito: 'O salário mínimo vigente ao tempo do fato (art. 49, § 1º) — confira o valor do ano.' });

  // a próxima mudança de idade que importa
  if (agente.nascimento && !datas.sentenca) {
    const setenta = aniversario(agente.nascimento, 70);
    if (setenta > hoje) ficha.push({ rotulo: 'Próximo marco etário', valor: `${dataBR(setenta)} (70 anos)`, efeito: 'Sentença depois dessa data reduz a prescrição à metade (art. 115) e atenua a pena (art. 65, I).' });
  }
  void somarMeses;
  return ficha;
}
