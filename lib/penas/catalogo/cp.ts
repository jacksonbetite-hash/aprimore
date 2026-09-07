/**
 * Catálogo v1 — Código Penal (§5.12).
 *
 * Cada entrada é um tipo penal COM a pena que o acervo do vade-mécum traz
 * hoje (texto conferido em 03/09/2026). A pena não foi copiada de manual:
 * foi lida do bloco "Pena" do artigo no acervo, e o teste de integração
 * (`penas-catalogo.test.ts`, com DATABASE_URL) confere que continua igual.
 *
 * Lei no tempo: um mesmo `id` pode aparecer mais de uma vez, com janelas
 * de vigência diferentes. A data do fato escolhe a versão (CF, art. 5º,
 * XL). As datas são as de publicação das leis, conferidas no Planalto:
 *
 *   Lei 14.994/24 — 09/10/2024  feminicídio autônomo (121-A), 129 § 9º, 147 § 1º, 24-A
 *   Lei 15.159/25 — 03/07/2025  129 §§ 12 e 13
 *   Lei 15.160/25 — 03/07/2025  arts. 65, I, e 115 (exceção da violência sexual contra a mulher)
 *   Lei 15.358/26 — 24/03/2026  marco legal do crime organizado (penas das organizações ultraviolentas)
 *   Lei 15.397/26 — 30/04/2026  furto, roubo, estelionato e receptação; revoga o 171, § 5º
 *
 * O que NÃO está aqui: os tipos que a v1 não catalogou. A lista é fechada
 * de propósito (§5.12): um tipo entra quando a pena, a ação penal e as
 * causas específicas foram conferidas no texto.
 */

import type { Causa, Fracao, Ref, TipoPenal } from '../tipos.ts';
import { dias as d, F } from '../tempo.ts';

const cp = (rotulo: string): Ref => ({ norma: 'cp', rotulo });

const REFORMA_84 = '1985-01-13';   // Lei 7.209/84 entrou em vigor em 13/01/1985
const L14994 = '2024-10-09';
const L15159 = '2025-07-03';
const L15358 = '2026-03-24';
const L15397 = '2026-04-30';

type Base = Pick<TipoPenal, 'id' | 'rotulo' | 'nome' | 'especie' | 'penaMinDias' | 'penaMaxDias'>;
type Resto = Partial<Omit<TipoPenal, keyof Base>>;

function t(base: Base, resto: Resto = {}): TipoPenal {
  return {
    norma: 'cp', multa: 'NAO', acaoPenal: 'PUBLICA_INCONDICIONADA', elemento: 'DOLOSO',
    violenciaOuGraveAmeaca: false, hediondo: 'NAO', imprescritivel: false,
    vigenciaDe: REFORMA_84, causasEspecificas: [],
    ...base, ...resto,
  };
}

/* ------------------------------------------------------------------ */
/*  Causas específicas (majorantes e minorantes do próprio artigo)     */
/* ------------------------------------------------------------------ */

const c = (
  id: string, nome: string, sinal: '+' | '-', min: Fracao, max: Fracao,
  rotulo: string, extra: Partial<Causa> = {},
): Causa => ({
  id, nome, sinal, fracaoMin: min, fracaoMax: max, base: cp(rotulo), escopo: 'ESPECIFICA', ...extra,
});

export const CAUSAS_CP: Causa[] = [
  c('cp-121-1-privilegio', 'Homicídio privilegiado: relevante valor social/moral ou violenta emoção (§ 1º)', '-', F.UM_SEXTO, F.UM_TERCO, 'Art. 121', { opcoes: [F.UM_SEXTO, F.UM_QUARTO, F.UM_TERCO] }),
  c('cp-121-2B-I', 'Vítima menor de 14 com deficiência ou doença (§ 2º-B, I)', '+', F.UM_TERCO, F.METADE, 'Art. 121'),
  c('cp-121-2B-II', 'Vítima menor de 14 e autor com autoridade sobre ela (§ 2º-B, II)', '+', F.DOIS_TERCOS, F.DOIS_TERCOS, 'Art. 121'),
  c('cp-121-4-culposo', 'Culposo: inobservância de regra técnica ou omissão de socorro (§ 4º)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 121'),
  c('cp-121-6-milicia', 'Praticado por milícia privada ou grupo de extermínio (§ 6º)', '+', F.UM_TERCO, F.METADE, 'Art. 121'),
  c('cp-121A-2', 'Feminicídio majorado (art. 121-A, § 2º)', '+', F.UM_TERCO, F.METADE, 'Art. 121-A', { vigenciaDe: L14994 }),
  c('cp-122-3', 'Motivo egoístico ou vítima menor/com resistência diminuída (§ 3º): pena duplicada', '+', F.INTEIRO, F.INTEIRO, 'Art. 122'),
  c('cp-122-4', 'Pela internet, rede social ou transmissão ao vivo (§ 4º): até o dobro', '+', F.UM_SEXTO, F.INTEIRO, 'Art. 122', { opcoes: [F.UM_SEXTO, F.UM_TERCO, F.METADE, F.INTEIRO] }),
  c('cp-129-4-privilegio', 'Lesão privilegiada: relevante valor ou violenta emoção (§ 4º)', '-', F.UM_SEXTO, F.UM_TERCO, 'Art. 129', { opcoes: [F.UM_SEXTO, F.UM_QUARTO, F.UM_TERCO] }),
  c('cp-129-7', 'Hipóteses dos §§ 4º e 6º do art. 121 (§ 7º)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 129'),
  c('cp-129-10', 'Lesão grave, gravíssima ou seguida de morte em contexto doméstico (§ 10)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 129'),
  c('cp-129-11', 'Violência doméstica contra pessoa com deficiência (§ 11)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 129'),
  c('cp-129-12-I', 'Contra agente de segurança ou parente em razão da função (§ 12, I)', '+', F.UM_TERCO, F.DOIS_TERCOS, 'Art. 129', { vigenciaDe: L15159 }),
  c('cp-141-caput', 'Contra Presidente, funcionário público, na presença de várias pessoas, contra pessoa vulnerável (art. 141, caput)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 141'),
  c('cp-141-1-paga', 'Mediante paga ou promessa de recompensa (art. 141, § 1º): dobro', '+', F.INTEIRO, F.INTEIRO, 'Art. 141'),
  c('cp-141-2-redes', 'Cometido ou divulgado em redes sociais (art. 141, § 2º): triplo', '+', F.DOBRO, F.DOBRO, 'Art. 141'),
  c('cp-141-3-mulher', 'Contra a mulher por razões da condição do sexo feminino (art. 141, § 3º): dobro', '+', F.INTEIRO, F.INTEIRO, 'Art. 141', { vigenciaDe: L14994 }),
  c('cp-147-1-mulher', 'Ameaça contra a mulher por razões da condição do sexo feminino (§ 1º): dobro', '+', F.INTEIRO, F.INTEIRO, 'Art. 147', { vigenciaDe: L14994 }),
  c('cp-147A-1', 'Perseguição contra criança, adolescente, idoso, mulher por razões do sexo, ou por duas ou mais pessoas ou com arma (§ 1º)', '+', F.METADE, F.METADE, 'Art. 147-A'),
  c('cp-155-1-repouso', 'Durante o repouso noturno (§ 1º)', '+', F.METADE, F.METADE, 'Art. 155'),
  c('cp-155-2-privilegio', 'Furto privilegiado: primário e coisa de pequeno valor (§ 2º)', '-', F.UM_TERCO, F.DOIS_TERCOS, 'Art. 155', { opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS] }),
  c('cp-155-4C-I', 'Fraude eletrônica com servidor fora do país (§ 4º-C, I)', '+', F.UM_TERCO, F.DOIS_TERCOS, 'Art. 155'),
  c('cp-155-4C-II', 'Fraude eletrônica contra idoso ou vulnerável (§ 4º-C, II): 1/3 ao dobro', '+', F.UM_TERCO, F.INTEIRO, 'Art. 155', { opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS, F.INTEIRO] }),
  c('cp-157-2', 'Concurso de pessoas, transporte de valores, veículo para outro Estado, restrição de liberdade, explosivos (§ 2º)', '+', F.UM_TERCO, F.METADE, 'Art. 157', { opcoes: [F.UM_TERCO, { num: 3, den: 8 }, { num: 5, den: 12 }, F.METADE] }),
  c('cp-157-2A', 'Emprego de arma de fogo ou destruição de obstáculo com explosivo (§ 2º-A)', '+', F.DOIS_TERCOS, F.DOIS_TERCOS, 'Art. 157'),
  c('cp-157-2B', 'Arma de fogo de uso restrito ou proibido (§ 2º-B): dobro', '+', F.INTEIRO, F.INTEIRO, 'Art. 157'),
  c('cp-158-1', 'Extorsão por duas ou mais pessoas ou com emprego de arma (§ 1º)', '+', F.UM_TERCO, F.METADE, 'Art. 158'),
  c('cp-159-4-delacao', 'Concorrente que denuncia e facilita a libertação (§ 4º)', '-', F.UM_TERCO, F.DOIS_TERCOS, 'Art. 159'),
  c('cp-168-1', 'Coisa recebida em depósito necessário, como tutor/curador/administrador ou em razão de ofício (§ 1º)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 168'),
  c('cp-171-1-privilegio', 'Estelionato privilegiado: primário e prejuízo de pequeno valor (§ 1º c/c 155, § 2º)', '-', F.UM_TERCO, F.DOIS_TERCOS, 'Art. 171', { opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS] }),
  c('cp-171-2B', 'Fraude eletrônica com servidor fora do país (§ 2º-B)', '+', F.UM_TERCO, F.DOIS_TERCOS, 'Art. 171'),
  c('cp-171-3', 'Em detrimento de entidade pública ou de economia popular (§ 3º)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 171'),
  c('cp-171-4', 'Contra idoso ou vulnerável (§ 4º): 1/3 ao dobro', '+', F.UM_TERCO, F.INTEIRO, 'Art. 171', { opcoes: [F.UM_TERCO, F.METADE, F.DOIS_TERCOS, F.INTEIRO] }),
  c('cp-180-6', 'Receptação de bens públicos (§ 6º): dobro', '+', F.INTEIRO, F.INTEIRO, 'Art. 180'),
  c('cp-216A-2', 'Assédio sexual contra menor de 18 (§ 2º): até 1/3', '+', F.UM_SEXTO, F.UM_TERCO, 'Art. 216-A'),
  c('cp-226-I', 'Concurso de duas ou mais pessoas (art. 226, I): quarta parte', '+', F.UM_QUARTO, F.UM_QUARTO, 'Art. 226'),
  c('cp-226-II', 'Agente com autoridade sobre a vítima: ascendente, padrasto, tutor, empregador (art. 226, II): metade', '+', F.METADE, F.METADE, 'Art. 226'),
  c('cp-226-IV', 'Estupro coletivo ou corretivo (art. 226, IV)', '+', F.UM_TERCO, F.DOIS_TERCOS, 'Art. 226'),
  c('cp-250-1', 'Incêndio com intuito de vantagem ou em casa habitada, edifício público, embarcação, lavoura (§ 1º)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 250'),
  c('cp-288-1', 'Associação armada ou com participação de criança ou adolescente (§ 1º): até a metade', '+', F.UM_SEXTO, F.METADE, 'Art. 288'),
  c('cp-297-1', 'Funcionário público prevalecendo-se do cargo (§ 1º): sexta parte', '+', F.UM_SEXTO, F.UM_SEXTO, 'Art. 297'),
  c('cp-299-pu', 'Funcionário público prevalecendo-se do cargo ou registro civil (p. ún.): sexta parte', '+', F.UM_SEXTO, F.UM_SEXTO, 'Art. 299'),
  c('cp-311-1', 'No exercício da função pública ou em razão dela (§ 1º)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 311'),
  c('cp-312-3', 'Peculato culposo: reparação do dano após a sentença (§ 3º): metade', '-', F.METADE, F.METADE, 'Art. 312'),
  c('cp-317-1', 'Funcionário retarda, omite ou pratica ato infringindo dever (§ 1º)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 317'),
  c('cp-333-pu', 'Funcionário retarda, omite ou pratica ato infringindo dever (p. ún.)', '+', F.UM_TERCO, F.UM_TERCO, 'Art. 333'),
  c('cp-339-1', 'Anonimato ou nome suposto (§ 1º): sexta parte', '+', F.UM_SEXTO, F.UM_SEXTO, 'Art. 339'),
  c('cp-339-2', 'Imputação de contravenção (§ 2º): metade', '-', F.METADE, F.METADE, 'Art. 339'),
  c('cp-342-1', 'Suborno ou prova para processo penal / com ente público (§ 1º)', '+', F.UM_SEXTO, F.UM_TERCO, 'Art. 342'),
  c('cp-344-pu', 'Processo que envolve crime contra a dignidade sexual (p. ún.)', '+', F.UM_TERCO, F.METADE, 'Art. 344'),
];

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

export const TIPOS_CP: TipoPenal[] = [
  /* ---- Título I — crimes contra a pessoa ---- */
  t({ id: 'cp-121', rotulo: 'Art. 121', nome: 'Homicídio simples', especie: 'RECLUSAO', penaMinDias: d(6), penaMaxDias: d(20) },
    { forma: 'caput', violenciaOuGraveAmeaca: true, resultadoMorte: true,
      causasEspecificas: ['cp-121-1-privilegio', 'cp-121-2B-I', 'cp-121-2B-II', 'cp-121-6-milicia'],
      observacoes: 'Hediondo só quando praticado em atividade típica de grupo de extermínio (Lei 8.072/90, art. 1º, I).' }),
  t({ id: 'cp-121-2', rotulo: 'Art. 121', nome: 'Homicídio qualificado', especie: 'RECLUSAO', penaMinDias: d(12), penaMaxDias: d(30) },
    { forma: '§ 2º', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', resultadoMorte: true,
      causasEspecificas: ['cp-121-1-privilegio', 'cp-121-2B-I', 'cp-121-2B-II', 'cp-121-6-milicia'],
      observacoes: 'Qualificado-privilegiado só com qualificadora objetiva (incisos III e IV) — e aí deixa de ser hediondo (STJ).' }),
  t({ id: 'cp-121-3', rotulo: 'Art. 121', nome: 'Homicídio culposo', especie: 'DETENCAO', penaMinDias: d(1), penaMaxDias: d(3) },
    { forma: '§ 3º', elemento: 'CULPOSO', resultadoMorte: true, causasEspecificas: ['cp-121-4-culposo'] }),
  t({ id: 'cp-121-A', rotulo: 'Art. 121-A', nome: 'Feminicídio', especie: 'RECLUSAO', penaMinDias: d(20), penaMaxDias: d(40) },
    { violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', resultadoMorte: true, feminicidio: true, vigenciaDe: L14994,
      causasEspecificas: ['cp-121A-2'] }),
  t({ id: 'cp-122', rotulo: 'Art. 122', nome: 'Induzimento, instigação ou auxílio a suicídio ou automutilação', especie: 'RECLUSAO', penaMinDias: d(0, 6), penaMaxDias: d(2) },
    { forma: 'caput', causasEspecificas: ['cp-122-3', 'cp-122-4'] }),
  t({ id: 'cp-122-2', rotulo: 'Art. 122', nome: 'Induzimento a suicídio com resultado morte', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(6) },
    { forma: '§ 2º', resultadoMorte: true, causasEspecificas: ['cp-122-3', 'cp-122-4'] }),

  t({ id: 'cp-129', rotulo: 'Art. 129', nome: 'Lesão corporal leve', especie: 'DETENCAO', penaMinDias: d(0, 3), penaMaxDias: d(1) },
    { forma: 'caput', violenciaOuGraveAmeaca: true, acaoPenal: 'PUBLICA_CONDICIONADA',
      causasEspecificas: ['cp-129-4-privilegio', 'cp-129-7', 'cp-129-12-I'],
      observacoes: 'Condicionada à representação pelo art. 88 da Lei 9.099/95. Em violência doméstica, use o § 9º (incondicionada — Súmula 542 do STJ).' }),
  t({ id: 'cp-129-1', rotulo: 'Art. 129', nome: 'Lesão corporal grave', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(5) },
    { forma: '§ 1º', violenciaOuGraveAmeaca: true, causasEspecificas: ['cp-129-4-privilegio', 'cp-129-7', 'cp-129-10', 'cp-129-12-I'] }),
  t({ id: 'cp-129-2', rotulo: 'Art. 129', nome: 'Lesão corporal gravíssima', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(8) },
    { forma: '§ 2º', violenciaOuGraveAmeaca: true, causasEspecificas: ['cp-129-4-privilegio', 'cp-129-7', 'cp-129-10', 'cp-129-12-I'] }),
  t({ id: 'cp-129-3', rotulo: 'Art. 129', nome: 'Lesão corporal seguida de morte', especie: 'RECLUSAO', penaMinDias: d(4), penaMaxDias: d(12) },
    { forma: '§ 3º', violenciaOuGraveAmeaca: true, elemento: 'PRETERDOLOSO', resultadoMorte: true,
      causasEspecificas: ['cp-129-4-privilegio', 'cp-129-7', 'cp-129-10'] }),
  t({ id: 'cp-129-6', rotulo: 'Art. 129', nome: 'Lesão corporal culposa', especie: 'DETENCAO', penaMinDias: d(0, 2), penaMaxDias: d(1) },
    { forma: '§ 6º', elemento: 'CULPOSO', acaoPenal: 'PUBLICA_CONDICIONADA', causasEspecificas: ['cp-129-7'] }),
  // § 9º — Lei 14.994/24 trocou detenção de 3 meses a 3 anos por reclusão de 2 a 5 anos
  t({ id: 'cp-129-9', rotulo: 'Art. 129', nome: 'Lesão corporal em violência doméstica', especie: 'DETENCAO', penaMinDias: d(0, 3), penaMaxDias: d(3) },
    { forma: '§ 9º', violenciaOuGraveAmeaca: true, violenciaDomestica: true, vigenciaDe: '2006-09-22', vigenciaAte: L14994,
      causasEspecificas: ['cp-129-11'], observacoes: 'Redação da Lei 11.340/06: detenção, de 3 meses a 3 anos.' }),
  t({ id: 'cp-129-9', rotulo: 'Art. 129', nome: 'Lesão corporal em violência doméstica', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(5) },
    { forma: '§ 9º', violenciaOuGraveAmeaca: true, violenciaDomestica: true, vigenciaDe: L14994,
      causasEspecificas: ['cp-129-11'], observacoes: 'Pública incondicionada (Súmula 542 do STJ). Sem substituição por restritiva (Súmula 588 do STJ).' }),
  t({ id: 'cp-129-13', rotulo: 'Art. 129', nome: 'Lesão corporal contra a mulher por razões da condição do sexo feminino', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(5) },
    { forma: '§ 13', violenciaOuGraveAmeaca: true, violenciaDomestica: true, vigenciaDe: L15159 }),

  t({ id: 'cp-138', rotulo: 'Art. 138', nome: 'Calúnia', especie: 'DETENCAO', penaMinDias: d(0, 6), penaMaxDias: d(2) },
    { multa: 'CUMULATIVA', acaoPenal: 'PRIVADA', causasEspecificas: ['cp-141-caput', 'cp-141-1-paga', 'cp-141-2-redes', 'cp-141-3-mulher'],
      observacoes: 'Ação privada (art. 145); pública condicionada contra funcionário público em razão das funções, e por requisição contra o Presidente.' }),
  t({ id: 'cp-139', rotulo: 'Art. 139', nome: 'Difamação', especie: 'DETENCAO', penaMinDias: d(0, 3), penaMaxDias: d(1) },
    { multa: 'CUMULATIVA', acaoPenal: 'PRIVADA', causasEspecificas: ['cp-141-caput', 'cp-141-1-paga', 'cp-141-2-redes', 'cp-141-3-mulher'] }),
  t({ id: 'cp-140', rotulo: 'Art. 140', nome: 'Injúria', especie: 'DETENCAO', penaMinDias: d(0, 1), penaMaxDias: d(0, 6) },
    { forma: 'caput', multa: 'ALTERNATIVA', acaoPenal: 'PRIVADA', causasEspecificas: ['cp-141-caput', 'cp-141-1-paga', 'cp-141-2-redes', 'cp-141-3-mulher'] }),
  t({ id: 'cp-140-3', rotulo: 'Art. 140', nome: 'Injúria por religião, idade ou deficiência', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(3) },
    { forma: '§ 3º', multa: 'CUMULATIVA', acaoPenal: 'PUBLICA_CONDICIONADA', vigenciaDe: '2023-01-11',
      causasEspecificas: ['cp-141-caput', 'cp-141-1-paga', 'cp-141-2-redes'],
      observacoes: 'A injúria racial saiu daqui com a Lei 14.532/23 e é hoje o art. 2º-A da Lei 7.716/89 — imprescritível.' }),

  t({ id: 'cp-147', rotulo: 'Art. 147', nome: 'Ameaça', especie: 'DETENCAO', penaMinDias: d(0, 1), penaMaxDias: d(0, 6) },
    { multa: 'ALTERNATIVA', violenciaOuGraveAmeaca: true, acaoPenal: 'PUBLICA_CONDICIONADA', causasEspecificas: ['cp-147-1-mulher'],
      observacoes: 'Contra a mulher por razões do sexo (§ 1º): pena em dobro e ação incondicionada (§ 2º).' }),
  t({ id: 'cp-147-A', rotulo: 'Art. 147-A', nome: 'Perseguição (stalking)', especie: 'RECLUSAO', penaMinDias: d(0, 6), penaMaxDias: d(2) },
    { multa: 'CUMULATIVA', acaoPenal: 'PUBLICA_CONDICIONADA', vigenciaDe: '2021-04-01', causasEspecificas: ['cp-147A-1'] }),
  t({ id: 'cp-148', rotulo: 'Art. 148', nome: 'Sequestro e cárcere privado', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(3) },
    { forma: 'caput', violenciaOuGraveAmeaca: true }),
  t({ id: 'cp-148-1', rotulo: 'Art. 148', nome: 'Sequestro qualificado (parente, menor, mais de 15 dias, fim libidinoso)', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(5) },
    { forma: '§ 1º', violenciaOuGraveAmeaca: true }),
  t({ id: 'cp-150', rotulo: 'Art. 150', nome: 'Violação de domicílio', especie: 'DETENCAO', penaMinDias: d(0, 1), penaMaxDias: d(0, 3) },
    { forma: 'caput', multa: 'ALTERNATIVA' }),

  /* ---- Título II — crimes contra o patrimônio ---- */
  t({ id: 'cp-155', rotulo: 'Art. 155', nome: 'Furto simples', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(4) },
    { forma: 'caput', multa: 'CUMULATIVA', vigenciaAte: L15397, causasEspecificas: ['cp-155-1-repouso', 'cp-155-2-privilegio'],
      observacoes: 'Redação anterior à Lei 15.397/26: reclusão, de 1 a 4 anos.' }),
  t({ id: 'cp-155', rotulo: 'Art. 155', nome: 'Furto simples', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(6) },
    { forma: 'caput', multa: 'CUMULATIVA', vigenciaDe: L15397, causasEspecificas: ['cp-155-1-repouso', 'cp-155-2-privilegio'] }),
  t({ id: 'cp-155-4', rotulo: 'Art. 155', nome: 'Furto qualificado', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(8) },
    { forma: '§ 4º', multa: 'CUMULATIVA', causasEspecificas: ['cp-155-1-repouso', 'cp-155-2-privilegio'],
      observacoes: 'Furto qualificado-privilegiado é admitido com qualificadora objetiva (Súmula 511 do STJ).' }),
  t({ id: 'cp-155-4A', rotulo: 'Art. 155', nome: 'Furto com explosivo', especie: 'RECLUSAO', penaMinDias: d(4), penaMaxDias: d(10) },
    { forma: '§ 4º-A', multa: 'CUMULATIVA', vigenciaDe: '2018-04-24' }),
  t({ id: 'cp-155-4B', rotulo: 'Art. 155', nome: 'Furto mediante fraude eletrônica', especie: 'RECLUSAO', penaMinDias: d(4), penaMaxDias: d(10) },
    { forma: '§ 4º-B', multa: 'CUMULATIVA', vigenciaDe: '2021-05-28', causasEspecificas: ['cp-155-4C-I', 'cp-155-4C-II'] }),

  t({ id: 'cp-157', rotulo: 'Art. 157', nome: 'Roubo', especie: 'RECLUSAO', penaMinDias: d(4), penaMaxDias: d(10) },
    { forma: 'caput', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, vigenciaAte: L15397,
      causasEspecificas: ['cp-157-2', 'cp-157-2A', 'cp-157-2B'], observacoes: 'Redação anterior à Lei 15.397/26: reclusão, de 4 a 10 anos.' }),
  t({ id: 'cp-157', rotulo: 'Art. 157', nome: 'Roubo', especie: 'RECLUSAO', penaMinDias: d(6), penaMaxDias: d(10) },
    { forma: 'caput', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, vigenciaDe: L15397,
      causasEspecificas: ['cp-157-2', 'cp-157-2A', 'cp-157-2B'],
      observacoes: 'Hediondo quando majorado pela restrição de liberdade (§ 2º, V), por arma de fogo (§ 2º-A, I) ou por arma de uso restrito (§ 2º-B) — Lei 8.072/90, art. 1º, II.' }),
  t({ id: 'cp-157-3-I', rotulo: 'Art. 157', nome: 'Roubo com lesão corporal grave', especie: 'RECLUSAO', penaMinDias: d(7), penaMaxDias: d(18) },
    { forma: '§ 3º, I', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', vigenciaDe: '2018-04-24' }),
  t({ id: 'cp-157-3-II', rotulo: 'Art. 157', nome: 'Latrocínio', especie: 'RECLUSAO', penaMinDias: d(20), penaMaxDias: d(30) },
    { forma: '§ 3º, II', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', resultadoMorte: true,
      vigenciaDe: '2018-04-24', vigenciaAte: L15397, observacoes: 'Redação anterior à Lei 15.397/26: reclusão, de 20 a 30 anos.' }),
  t({ id: 'cp-157-3-II', rotulo: 'Art. 157', nome: 'Latrocínio', especie: 'RECLUSAO', penaMinDias: d(24), penaMaxDias: d(30) },
    { forma: '§ 3º, II', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', resultadoMorte: true, vigenciaDe: L15397 }),

  t({ id: 'cp-158', rotulo: 'Art. 158', nome: 'Extorsão', especie: 'RECLUSAO', penaMinDias: d(4), penaMaxDias: d(10) },
    { forma: 'caput', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, causasEspecificas: ['cp-158-1'] }),
  t({ id: 'cp-158-3', rotulo: 'Art. 158', nome: 'Extorsão com restrição de liberdade (sequestro relâmpago)', especie: 'RECLUSAO', penaMinDias: d(6), penaMaxDias: d(12) },
    { forma: '§ 3º', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', vigenciaDe: '2009-12-03' }),
  t({ id: 'cp-159', rotulo: 'Art. 159', nome: 'Extorsão mediante sequestro', especie: 'RECLUSAO', penaMinDias: d(8), penaMaxDias: d(15) },
    { forma: 'caput', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', causasEspecificas: ['cp-159-4-delacao'] }),
  t({ id: 'cp-159-1', rotulo: 'Art. 159', nome: 'Extorsão mediante sequestro qualificada (mais de 24h, menor de 18, maior de 60, bando)', especie: 'RECLUSAO', penaMinDias: d(12), penaMaxDias: d(20) },
    { forma: '§ 1º', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', idadeElementar: true, causasEspecificas: ['cp-159-4-delacao'] }),
  t({ id: 'cp-159-3', rotulo: 'Art. 159', nome: 'Extorsão mediante sequestro com resultado morte', especie: 'RECLUSAO', penaMinDias: d(24), penaMaxDias: d(30) },
    { forma: '§ 3º', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', resultadoMorte: true, causasEspecificas: ['cp-159-4-delacao'] }),
  t({ id: 'cp-163', rotulo: 'Art. 163', nome: 'Dano', especie: 'DETENCAO', penaMinDias: d(0, 1), penaMaxDias: d(0, 6) },
    { forma: 'caput', multa: 'ALTERNATIVA', acaoPenal: 'PRIVADA', observacoes: 'Ação privada no caput (art. 167).' }),
  t({ id: 'cp-168', rotulo: 'Art. 168', nome: 'Apropriação indébita', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(4) },
    { multa: 'CUMULATIVA', causasEspecificas: ['cp-168-1'] }),

  // Estelionato: o Pacote Anticrime (Lei 13.964/19, 23/01/2020) o fez condicionado à
  // representação (§ 5º); a Lei 15.397/26 revogou o § 5º e ele voltou a ser incondicionado.
  t({ id: 'cp-171', rotulo: 'Art. 171', nome: 'Estelionato', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(5) },
    { forma: 'caput', multa: 'CUMULATIVA', vigenciaAte: '2020-01-23', causasEspecificas: ['cp-171-1-privilegio', 'cp-171-3', 'cp-171-4'] }),
  t({ id: 'cp-171', rotulo: 'Art. 171', nome: 'Estelionato', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(5) },
    { forma: 'caput', multa: 'CUMULATIVA', acaoPenal: 'PUBLICA_CONDICIONADA', vigenciaDe: '2020-01-23', vigenciaAte: L15397,
      causasEspecificas: ['cp-171-1-privilegio', 'cp-171-3', 'cp-171-4'],
      observacoes: 'Entre o Pacote Anticrime e a Lei 15.397/26, condicionado à representação (§ 5º), salvo contra a administração pública, incapaz, maior de 70 ou vulnerável.' }),
  t({ id: 'cp-171', rotulo: 'Art. 171', nome: 'Estelionato', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(5) },
    { forma: 'caput', multa: 'CUMULATIVA', vigenciaDe: L15397, causasEspecificas: ['cp-171-1-privilegio', 'cp-171-3', 'cp-171-4'] }),
  t({ id: 'cp-171-2A', rotulo: 'Art. 171', nome: 'Fraude eletrônica', especie: 'RECLUSAO', penaMinDias: d(4), penaMaxDias: d(8) },
    { forma: '§ 2º-A', multa: 'CUMULATIVA', vigenciaDe: '2021-05-28', causasEspecificas: ['cp-171-2B', 'cp-171-4'] }),

  t({ id: 'cp-180', rotulo: 'Art. 180', nome: 'Receptação', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(4) },
    { forma: 'caput', multa: 'CUMULATIVA', vigenciaAte: L15397, causasEspecificas: ['cp-180-6'],
      observacoes: 'Redação anterior à Lei 15.397/26: reclusão, de 1 a 4 anos.' }),
  t({ id: 'cp-180', rotulo: 'Art. 180', nome: 'Receptação', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(6) },
    { forma: 'caput', multa: 'CUMULATIVA', vigenciaDe: L15397, causasEspecificas: ['cp-180-6'] }),
  t({ id: 'cp-180-1', rotulo: 'Art. 180', nome: 'Receptação qualificada (atividade comercial)', especie: 'RECLUSAO', penaMinDias: d(3), penaMaxDias: d(8) },
    { forma: '§ 1º', multa: 'CUMULATIVA', causasEspecificas: ['cp-180-6'] }),
  t({ id: 'cp-180-3', rotulo: 'Art. 180', nome: 'Receptação culposa', especie: 'DETENCAO', penaMinDias: d(0, 1), penaMaxDias: d(1) },
    { forma: '§ 3º', multa: 'ALTERNATIVA', elemento: 'CULPOSO' }),

  /* ---- Título VI — dignidade sexual (ação pública incondicionada desde a Lei 13.718/18) ---- */
  t({ id: 'cp-213', rotulo: 'Art. 213', nome: 'Estupro', especie: 'RECLUSAO', penaMinDias: d(6), penaMaxDias: d(10) },
    { forma: 'caput', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', dignidadeSexual: true, causasEspecificas: ['cp-226-I', 'cp-226-II', 'cp-226-IV'] }),
  t({ id: 'cp-213-1', rotulo: 'Art. 213', nome: 'Estupro com lesão grave ou vítima entre 14 e 18 anos', especie: 'RECLUSAO', penaMinDias: d(8), penaMaxDias: d(12) },
    { forma: '§ 1º', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', dignidadeSexual: true, causasEspecificas: ['cp-226-I', 'cp-226-II', 'cp-226-IV'] }),
  t({ id: 'cp-213-2', rotulo: 'Art. 213', nome: 'Estupro com resultado morte', especie: 'RECLUSAO', penaMinDias: d(12), penaMaxDias: d(30) },
    { forma: '§ 2º', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', resultadoMorte: true, dignidadeSexual: true, causasEspecificas: ['cp-226-I', 'cp-226-II', 'cp-226-IV'] }),
  t({ id: 'cp-215', rotulo: 'Art. 215', nome: 'Violação sexual mediante fraude', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(6) },
    { dignidadeSexual: true, causasEspecificas: ['cp-226-I', 'cp-226-II', 'cp-226-IV'] }),
  t({ id: 'cp-215-A', rotulo: 'Art. 215-A', nome: 'Importunação sexual', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(5) },
    { dignidadeSexual: true, vigenciaDe: '2018-09-25', causasEspecificas: ['cp-226-I', 'cp-226-II', 'cp-226-IV'] }),
  t({ id: 'cp-216-A', rotulo: 'Art. 216-A', nome: 'Assédio sexual', especie: 'DETENCAO', penaMinDias: d(1), penaMaxDias: d(2) },
    { dignidadeSexual: true, causasEspecificas: ['cp-216A-2'] }),
  t({ id: 'cp-217-A', rotulo: 'Art. 217-A', nome: 'Estupro de vulnerável', especie: 'RECLUSAO', penaMinDias: d(10), penaMaxDias: d(18) },
    { forma: 'caput', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', dignidadeSexual: true, idadeElementar: true,
      causasEspecificas: ['cp-226-I', 'cp-226-II', 'cp-226-IV'],
      observacoes: 'Violência presumida: para o art. 44 conta como crime com violência (STJ). Multa acrescida pela Lei 15.280/25.' }),
  t({ id: 'cp-217-A-4', rotulo: 'Art. 217-A', nome: 'Estupro de vulnerável com resultado morte', especie: 'RECLUSAO', penaMinDias: d(20), penaMaxDias: d(40) },
    { forma: '§ 4º', multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, hediondo: 'HEDIONDO', resultadoMorte: true, dignidadeSexual: true, idadeElementar: true,
      causasEspecificas: ['cp-226-I', 'cp-226-II', 'cp-226-IV'] }),

  /* ---- Títulos VIII a XI — incolumidade, paz pública, fé pública, administração ---- */
  t({ id: 'cp-250', rotulo: 'Art. 250', nome: 'Incêndio', especie: 'RECLUSAO', penaMinDias: d(3), penaMaxDias: d(6) },
    { forma: 'caput', multa: 'CUMULATIVA', causasEspecificas: ['cp-250-1'] }),
  t({ id: 'cp-288', rotulo: 'Art. 288', nome: 'Associação criminosa', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(3) },
    { vigenciaDe: '2013-09-19', causasEspecificas: ['cp-288-1'] }),
  t({ id: 'cp-297', rotulo: 'Art. 297', nome: 'Falsificação de documento público', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(6) },
    { multa: 'CUMULATIVA', causasEspecificas: ['cp-297-1'] }),
  t({ id: 'cp-298', rotulo: 'Art. 298', nome: 'Falsificação de documento particular', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(5) },
    { multa: 'CUMULATIVA' }),
  t({ id: 'cp-299', rotulo: 'Art. 299', nome: 'Falsidade ideológica (documento público)', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(5) },
    { forma: 'documento público', multa: 'CUMULATIVA', causasEspecificas: ['cp-299-pu'] }),
  t({ id: 'cp-299-particular', rotulo: 'Art. 299', nome: 'Falsidade ideológica (documento particular)', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(3) },
    { forma: 'documento particular', multa: 'CUMULATIVA', causasEspecificas: ['cp-299-pu'] }),
  t({ id: 'cp-311', rotulo: 'Art. 311', nome: 'Adulteração de sinal identificador de veículo', especie: 'RECLUSAO', penaMinDias: d(3), penaMaxDias: d(6) },
    { forma: 'caput', multa: 'CUMULATIVA', causasEspecificas: ['cp-311-1'] }),
  t({ id: 'cp-312', rotulo: 'Art. 312', nome: 'Peculato', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(12) },
    { forma: 'caput', multa: 'CUMULATIVA', contraAdministracao: true }),
  t({ id: 'cp-312-2', rotulo: 'Art. 312', nome: 'Peculato culposo', especie: 'DETENCAO', penaMinDias: d(0, 3), penaMaxDias: d(1) },
    { forma: '§ 2º', elemento: 'CULPOSO', contraAdministracao: true, causasEspecificas: ['cp-312-3'] }),
  t({ id: 'cp-316', rotulo: 'Art. 316', nome: 'Concussão', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(12) },
    { forma: 'caput', multa: 'CUMULATIVA', contraAdministracao: true, vigenciaDe: '2019-12-25' }),
  t({ id: 'cp-317', rotulo: 'Art. 317', nome: 'Corrupção passiva', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(12) },
    { forma: 'caput', multa: 'CUMULATIVA', contraAdministracao: true, causasEspecificas: ['cp-317-1'] }),
  t({ id: 'cp-319', rotulo: 'Art. 319', nome: 'Prevaricação', especie: 'DETENCAO', penaMinDias: d(0, 3), penaMaxDias: d(1) },
    { multa: 'CUMULATIVA', contraAdministracao: true }),
  t({ id: 'cp-329', rotulo: 'Art. 329', nome: 'Resistência', especie: 'DETENCAO', penaMinDias: d(0, 2), penaMaxDias: d(2) },
    { forma: 'caput', violenciaOuGraveAmeaca: true }),
  t({ id: 'cp-330', rotulo: 'Art. 330', nome: 'Desobediência', especie: 'DETENCAO', penaMinDias: 15, penaMaxDias: d(0, 6) },
    { multa: 'CUMULATIVA' }),
  t({ id: 'cp-331', rotulo: 'Art. 331', nome: 'Desacato', especie: 'DETENCAO', penaMinDias: d(0, 6), penaMaxDias: d(2) },
    { multa: 'ALTERNATIVA' }),
  t({ id: 'cp-333', rotulo: 'Art. 333', nome: 'Corrupção ativa', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(12) },
    { multa: 'CUMULATIVA', contraAdministracao: true, causasEspecificas: ['cp-333-pu'] }),
  t({ id: 'cp-339', rotulo: 'Art. 339', nome: 'Denunciação caluniosa', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(8) },
    { multa: 'CUMULATIVA', causasEspecificas: ['cp-339-1', 'cp-339-2'] }),
  t({ id: 'cp-342', rotulo: 'Art. 342', nome: 'Falso testemunho ou falsa perícia', especie: 'RECLUSAO', penaMinDias: d(2), penaMaxDias: d(4) },
    { multa: 'CUMULATIVA', causasEspecificas: ['cp-342-1'] }),
  t({ id: 'cp-344', rotulo: 'Art. 344', nome: 'Coação no curso do processo', especie: 'RECLUSAO', penaMinDias: d(1), penaMaxDias: d(4) },
    { multa: 'CUMULATIVA', violenciaOuGraveAmeaca: true, causasEspecificas: ['cp-344-pu'] }),
];
