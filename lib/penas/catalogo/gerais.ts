/**
 * Parte Geral do Código Penal — o que vale para todo crime (§5.12).
 *
 * Agravantes e atenuantes (2ª fase) e as causas gerais de aumento e de
 * diminuição (3ª fase). Cada uma aponta para o artigo no acervo do
 * vade-mécum: é de lá que a tela puxa o texto, e é isso que o teste de
 * integração confere.
 */

import type { Causa, Circunstancia, Ref } from '../tipos.ts';
import { F } from '../tempo.ts';

const cp = (rotulo: string): Ref => ({ norma: 'cp', rotulo });

export const AGRAVANTES: Circunstancia[] = [
  { id: 'ag-reincidencia', nome: 'Reincidência', sinal: '+', base: cp('Art. 61'), preponderante: true, chave: 'REINCIDENCIA' },
  { id: 'ag-motivo-futil-torpe', nome: 'Motivo fútil ou torpe (art. 61, II, a)', sinal: '+', base: cp('Art. 61'), preponderante: true },
  { id: 'ag-outro-crime', nome: 'Para facilitar ou assegurar outro crime (art. 61, II, b)', sinal: '+', base: cp('Art. 61'), preponderante: true },
  { id: 'ag-traicao', nome: 'À traição, de emboscada ou dissimulação (art. 61, II, c)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-meio-cruel', nome: 'Veneno, fogo, explosivo, tortura ou meio cruel (art. 61, II, d)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-parente', nome: 'Contra ascendente, descendente, irmão ou cônjuge (art. 61, II, e)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-relacoes-domesticas', nome: 'Relações domésticas, coabitação, hospitalidade ou violência contra a mulher (art. 61, II, f)', sinal: '+', base: cp('Art. 61'), chave: 'VIOLENCIA_MULHER' },
  { id: 'ag-abuso-poder', nome: 'Abuso de poder ou violação de dever de cargo, ofício ou profissão (art. 61, II, g)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-vitima-vulneravel', nome: 'Contra criança, maior de 60 anos, enfermo ou grávida (art. 61, II, h)', sinal: '+', base: cp('Art. 61'), chave: 'VITIMA_VULNERAVEL' },
  { id: 'ag-protecao-autoridade', nome: 'Ofendido sob imediata proteção da autoridade (art. 61, II, i)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-calamidade', nome: 'Em calamidade pública ou desgraça particular do ofendido (art. 61, II, j)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-embriaguez', nome: 'Embriaguez preordenada (art. 61, II, l)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-instituicao-ensino', nome: 'Nas dependências de instituição de ensino (art. 61, II, m)', sinal: '+', base: cp('Art. 61') },
  { id: 'ag-62-dirige', nome: 'Promove, organiza ou dirige os demais agentes (art. 62, I)', sinal: '+', base: cp('Art. 62') },
  { id: 'ag-62-coage', nome: 'Coage ou induz outrem à execução (art. 62, II)', sinal: '+', base: cp('Art. 62') },
  { id: 'ag-62-instiga', nome: 'Instiga subordinado ou não punível (art. 62, III)', sinal: '+', base: cp('Art. 62') },
  { id: 'ag-62-paga', nome: 'Executa mediante paga ou promessa de recompensa (art. 62, IV)', sinal: '+', base: cp('Art. 62'), preponderante: true },
];

export const ATENUANTES: Circunstancia[] = [
  { id: 'at-menoridade', nome: 'Menor de 21 anos na data do fato (art. 65, I)', sinal: '-', base: cp('Art. 65'), preponderante: true, chave: 'MENORIDADE' },
  { id: 'at-senilidade', nome: 'Maior de 70 anos na data da sentença (art. 65, I)', sinal: '-', base: cp('Art. 65'), chave: 'SENILIDADE' },
  { id: 'at-desconhecimento-lei', nome: 'Desconhecimento da lei (art. 65, II)', sinal: '-', base: cp('Art. 65') },
  { id: 'at-relevante-valor', nome: 'Motivo de relevante valor social ou moral (art. 65, III, a)', sinal: '-', base: cp('Art. 65'), preponderante: true },
  { id: 'at-reparacao', nome: 'Minorou as consequências ou reparou o dano antes do julgamento (art. 65, III, b)', sinal: '-', base: cp('Art. 65') },
  { id: 'at-coacao', nome: 'Coação resistível, ordem superior ou violenta emoção (art. 65, III, c)', sinal: '-', base: cp('Art. 65') },
  { id: 'at-confissao', nome: 'Confissão espontânea (art. 65, III, d)', sinal: '-', base: cp('Art. 65'), preponderante: true, chave: 'CONFISSAO' },
  { id: 'at-multidao', nome: 'Sob influência de multidão em tumulto (art. 65, III, e)', sinal: '-', base: cp('Art. 65') },
  { id: 'at-inominada', nome: 'Circunstância relevante não prevista em lei (art. 66)', sinal: '-', base: cp('Art. 66') },
];

/** Causas de aumento e diminuição da Parte Geral (3ª fase). */
export const CAUSAS_GERAIS: Causa[] = [
  {
    id: 'cp-14-tentativa', nome: 'Tentativa (art. 14, p. ún.)', sinal: '-',
    fracaoMin: F.UM_TERCO, fracaoMax: F.DOIS_TERCOS, opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS],
    base: cp('Art. 14'), escopo: 'GERAL', condicao: 'DOLOSO',
    descricao: 'Quanto mais perto da consumação, menor a redução (critério do iter criminis).',
  },
  {
    id: 'cp-16-arrependimento-posterior', nome: 'Arrependimento posterior (art. 16)', sinal: '-',
    fracaoMin: F.UM_TERCO, fracaoMax: F.DOIS_TERCOS, opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS],
    base: cp('Art. 16'), escopo: 'GERAL', condicao: 'SEM_VIOLENCIA',
    descricao: 'Reparação do dano ou restituição da coisa até o recebimento da denúncia, por ato voluntário.',
  },
  {
    id: 'cp-26-semi-imputabilidade', nome: 'Semi-imputabilidade (art. 26, p. ún.)', sinal: '-',
    fracaoMin: F.UM_TERCO, fracaoMax: F.DOIS_TERCOS, opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS],
    base: cp('Art. 26'), escopo: 'GERAL',
  },
  {
    id: 'cp-29-1-participacao-menor', nome: 'Participação de menor importância (art. 29, § 1º)', sinal: '-',
    fracaoMin: F.UM_SEXTO, fracaoMax: F.UM_TERCO, opcoes: [F.UM_SEXTO, F.UM_QUARTO, F.UM_TERCO],
    base: cp('Art. 29'), escopo: 'GERAL',
  },
  {
    id: 'cp-29-2-cooperacao-distinta', nome: 'Cooperação dolosamente distinta com resultado previsível (art. 29, § 2º)', sinal: '+',
    fracaoMin: F.UM_SEXTO, fracaoMax: F.METADE, opcoes: [F.UM_SEXTO, F.UM_TERCO, F.METADE],
    base: cp('Art. 29'), escopo: 'GERAL',
  },
];

export function circunstancia(id: string): Circunstancia | undefined {
  return AGRAVANTES.find((c) => c.id === id) ?? ATENUANTES.find((c) => c.id === id);
}
