/**
 * Catálogo v1 — Lei de Drogas (11.343/06), Lei Maria da Penha (11.340/06) e
 * Lei do Racismo (7.716/89).
 *
 * Penas lidas do acervo (texto conferido em 03/09/2026). A Lei de Drogas
 * fixa os próprios dias-multa, por isso `diasMultaMin/Max` aparecem aqui
 * e não no Código Penal, onde valem os 10 a 360 do art. 49.
 */

import type { Causa, Ref, TipoPenal } from '../tipos.ts';
import { dias as d, F } from '../tempo.ts';

const drogas = (rotulo: string): Ref => ({ norma: 'drogas', rotulo });
const mp = (rotulo: string): Ref => ({ norma: 'maria-da-penha', rotulo });

const L11343 = '2006-10-08';   // 45 dias após a publicação (23/08/2006)
const L13641 = '2018-04-04';   // criou o art. 24-A
const L14994 = '2024-10-09';   // art. 24-A passou a reclusão de 2 a 5 anos
const L15383 = '2026-04-09';   // art. 24-A, § 4º
const L14532 = '2023-01-11';   // injúria racial passou a ser o art. 2º-A da Lei 7.716/89

export const CAUSAS_LEIS: Causa[] = [
  {
    id: 'drogas-33-4-privilegio', nome: 'Tráfico privilegiado: primário, bons antecedentes, sem dedicação criminosa nem organização (art. 33, § 4º)',
    sinal: '-', fracaoMin: F.UM_SEXTO, fracaoMax: F.DOIS_TERCOS, opcoes: [F.UM_SEXTO, F.UM_TERCO, F.METADE, F.DOIS_TERCOS],
    base: drogas('Art. 33'), escopo: 'ESPECIFICA', vigenciaDe: L11343,
    descricao: 'Afasta a hediondez (LEP, art. 112, § 5º; STF HC 118.533).',
  },
  {
    id: 'drogas-40', nome: 'Majorantes do art. 40: transnacionalidade, função pública, escola/presídio/transporte público, arma, interestadualidade, criança',
    sinal: '+', fracaoMin: F.UM_SEXTO, fracaoMax: F.DOIS_TERCOS, opcoes: [F.UM_SEXTO, F.UM_QUINTO, F.UM_QUARTO, F.UM_TERCO, F.METADE, F.DOIS_TERCOS],
    base: drogas('Art. 40'), escopo: 'ESPECIFICA', vigenciaDe: L11343,
    descricao: 'Mais de um inciso justifica fração acima do mínimo (STJ).',
  },
  {
    id: 'drogas-41-colaboracao', nome: 'Colaboração voluntária na identificação dos coautores e recuperação do produto (art. 41)',
    sinal: '-', fracaoMin: F.UM_TERCO, fracaoMax: F.DOIS_TERCOS, opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS],
    base: drogas('Art. 41'), escopo: 'ESPECIFICA', vigenciaDe: L11343,
  },
  {
    id: 'mp-24A-4', nome: 'Descumprimento por violação da área de exclusão ou da tornozeleira (art. 24-A, § 4º)',
    sinal: '+', fracaoMin: F.UM_TERCO, fracaoMax: F.METADE, base: mp('Art. 24-A'), escopo: 'ESPECIFICA', vigenciaDe: L15383,
  },
];

const DROGAS = {
  norma: 'drogas', multa: 'CUMULATIVA' as const, acaoPenal: 'PUBLICA_INCONDICIONADA' as const, elemento: 'DOLOSO' as const,
  violenciaOuGraveAmeaca: false, hediondo: 'NAO' as const, imprescritivel: false, vigenciaDe: L11343, causasEspecificas: [] as string[],
};

export const TIPOS_LEIS: TipoPenal[] = [
  { ...DROGAS, id: 'drogas-33', rotulo: 'Art. 33', forma: 'caput', nome: 'Tráfico de drogas', especie: 'RECLUSAO',
    penaMinDias: d(5), penaMaxDias: d(15), diasMultaMin: 500, diasMultaMax: 1500, hediondo: 'EQUIPARADO', trafico: true,
    causasEspecificas: ['drogas-33-4-privilegio', 'drogas-40', 'drogas-41-colaboracao'],
    observacoes: 'Equiparado a hediondo (CF, art. 5º, XLIII). Com o § 4º deixa de ser (LEP, art. 112, § 5º). Vedada a conversão em restritiva pelo art. 44 da Lei, mas o STF a admite (HC 97.256).' },
  { ...DROGAS, id: 'drogas-33-2', rotulo: 'Art. 33', forma: '§ 2º', nome: 'Induzimento ao uso de droga', especie: 'DETENCAO',
    penaMinDias: d(1), penaMaxDias: d(3), diasMultaMin: 100, diasMultaMax: 300, causasEspecificas: ['drogas-40'] },
  { ...DROGAS, id: 'drogas-33-3', rotulo: 'Art. 33', forma: '§ 3º', nome: 'Uso compartilhado (oferecer para consumo conjunto)', especie: 'DETENCAO',
    penaMinDias: d(0, 6), penaMaxDias: d(1), diasMultaMin: 700, diasMultaMax: 1500, causasEspecificas: ['drogas-40'] },
  { ...DROGAS, id: 'drogas-34', rotulo: 'Art. 34', nome: 'Maquinário para tráfico', especie: 'RECLUSAO',
    penaMinDias: d(3), penaMaxDias: d(10), diasMultaMin: 1200, diasMultaMax: 2000, causasEspecificas: ['drogas-40', 'drogas-41-colaboracao'] },
  { ...DROGAS, id: 'drogas-35', rotulo: 'Art. 35', nome: 'Associação para o tráfico', especie: 'RECLUSAO',
    penaMinDias: d(3), penaMaxDias: d(10), diasMultaMin: 700, diasMultaMax: 1200, causasEspecificas: ['drogas-40', 'drogas-41-colaboracao'],
    observacoes: 'Não é hediondo nem equiparado (STJ).' },
  { ...DROGAS, id: 'drogas-37', rotulo: 'Art. 37', nome: 'Colaboração como informante', especie: 'RECLUSAO',
    penaMinDias: d(2), penaMaxDias: d(6), diasMultaMin: 300, diasMultaMax: 700, causasEspecificas: ['drogas-40', 'drogas-41-colaboracao'] },

  /* ---- Lei Maria da Penha ---- */
  { norma: 'maria-da-penha', id: 'mp-24-A', rotulo: 'Art. 24-A', nome: 'Descumprimento de medida protetiva de urgência', especie: 'DETENCAO',
    penaMinDias: d(0, 3), penaMaxDias: d(2), multa: 'NAO', acaoPenal: 'PUBLICA_INCONDICIONADA', elemento: 'DOLOSO',
    violenciaOuGraveAmeaca: false, hediondo: 'NAO', imprescritivel: false, violenciaDomestica: true,
    vigenciaDe: L13641, vigenciaAte: L14994, causasEspecificas: [],
    observacoes: 'Redação da Lei 13.641/18: detenção, de 3 meses a 2 anos.' },
  { norma: 'maria-da-penha', id: 'mp-24-A', rotulo: 'Art. 24-A', nome: 'Descumprimento de medida protetiva de urgência', especie: 'RECLUSAO',
    penaMinDias: d(2), penaMaxDias: d(5), multa: 'CUMULATIVA', acaoPenal: 'PUBLICA_INCONDICIONADA', elemento: 'DOLOSO',
    violenciaOuGraveAmeaca: false, hediondo: 'NAO', imprescritivel: false, violenciaDomestica: true,
    vigenciaDe: L14994, causasEspecificas: ['mp-24A-4'],
    observacoes: 'Só o juiz concede fiança no flagrante (§ 2º). A Lei 9.099/95 não se aplica (art. 41).' },

  /* ---- Lei 7.716/89 — os imprescritíveis (CF, art. 5º, XLII) ---- */
  { norma: 'racismo', id: 'racismo-20', rotulo: 'Art. 20', forma: 'caput', nome: 'Racismo (praticar, induzir ou incitar a discriminação)', especie: 'RECLUSAO',
    penaMinDias: d(1), penaMaxDias: d(3), multa: 'CUMULATIVA', acaoPenal: 'PUBLICA_INCONDICIONADA', elemento: 'DOLOSO',
    violenciaOuGraveAmeaca: false, hediondo: 'NAO', imprescritivel: true, vigenciaDe: '1997-05-15', causasEspecificas: [],
    observacoes: 'Imprescritível e inafiançável (CF, art. 5º, XLII). Pelos meios de comunicação ou redes sociais (§ 2º), reclusão de 2 a 5 anos.' },
  { norma: 'racismo', id: 'racismo-2A', rotulo: 'Art. 2º-A', nome: 'Injúria racial', especie: 'RECLUSAO',
    penaMinDias: d(2), penaMaxDias: d(5), multa: 'CUMULATIVA', acaoPenal: 'PUBLICA_INCONDICIONADA', elemento: 'DOLOSO',
    violenciaOuGraveAmeaca: false, hediondo: 'NAO', imprescritivel: true, vigenciaDe: L14532, causasEspecificas: [],
    observacoes: 'Era o art. 140, § 3º, do CP; a Lei 14.532/23 a trouxe para a Lei do Racismo. Imprescritível (STF, HC 154.248).' },
];
