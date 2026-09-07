/**
 * O catálogo inteiro, com as consultas que o motor e a tela fazem.
 *
 * `conferidoEm` é a data em que as penas foram lidas do acervo. Vai para
 * o cálculo salvo (`calculo_pena.versao_catalogo`) e para a tela: um
 * cálculo feito com o catálogo de setembro de 2026 continua dizendo que
 * foi feito com ele quando a lei mudar de novo.
 */

import type { Causa, TipoPenal } from '../tipos.ts';
import { TIPOS_CP, CAUSAS_CP } from './cp.ts';
import { TIPOS_LEIS, CAUSAS_LEIS } from './leis.ts';
import { CAUSAS_GERAIS } from './gerais.ts';

export { AGRAVANTES, ATENUANTES, CAUSAS_GERAIS, circunstancia } from './gerais.ts';

export const CATALOGO_CONFERIDO_EM = '2026-09-03';

export const TIPOS: TipoPenal[] = [...TIPOS_CP, ...TIPOS_LEIS];
export const CAUSAS: Causa[] = [...CAUSAS_GERAIS, ...CAUSAS_CP, ...CAUSAS_LEIS];

export const NORMAS_DO_CATALOGO: { slug: string; nome: string; sigla: string }[] = [
  { slug: 'cp', nome: 'Código Penal', sigla: 'CP' },
  { slug: 'drogas', nome: 'Lei de Drogas (11.343/06)', sigla: 'L. 11.343/06' },
  { slug: 'maria-da-penha', nome: 'Lei Maria da Penha (11.340/06)', sigla: 'L. 11.340/06' },
  { slug: 'racismo', nome: 'Lei do Racismo (7.716/89)', sigla: 'L. 7.716/89' },
];

function vigente<T extends { vigenciaDe?: string; vigenciaAte?: string }>(v: T, data: string): boolean {
  if (v.vigenciaDe && data < v.vigenciaDe) return false;
  if (v.vigenciaAte && data >= v.vigenciaAte) return false;
  return true;
}

/**
 * A versão do tipo vigente na data do fato. Sem versão para a data (fato
 * anterior à criação do crime), devolve `null` — não existe pena a
 * calcular para um crime que ainda não era crime.
 */
export function tipoPorId(id: string, dataFato?: string): TipoPenal | null {
  const versoes = TIPOS.filter((t) => t.id === id);
  if (versoes.length === 0) return null;
  if (!dataFato) return versaoAtual(versoes);
  return versoes.find((v) => vigente(v, dataFato)) ?? null;
}

function versaoAtual(versoes: TipoPenal[]): TipoPenal {
  return versoes.find((v) => !v.vigenciaAte) ?? versoes[versoes.length - 1];
}

/** Um tipo por id, na redação atual — para a lista de escolha. */
export function tiposParaEscolha(): TipoPenal[] {
  const vistos = new Set<string>();
  const lista: TipoPenal[] = [];
  for (const t of TIPOS) {
    if (vistos.has(t.id)) continue;
    vistos.add(t.id);
    lista.push(versaoAtual(TIPOS.filter((x) => x.id === t.id)));
  }
  return lista;
}

export function causaPorId(id: string): Causa | undefined {
  return CAUSAS.find((c) => c.id === id);
}

/** As causas que cabem a um tipo numa data: as gerais compatíveis mais as específicas dele. */
export function causasDoTipo(tipo: TipoPenal, dataFato: string): Causa[] {
  const gerais = CAUSAS_GERAIS.filter((c) => {
    if (!vigente(c, dataFato)) return false;
    if (c.condicao === 'DOLOSO' && tipo.elemento === 'CULPOSO') return false;
    if (c.condicao === 'SEM_VIOLENCIA' && tipo.violenciaOuGraveAmeaca) return false;
    return true;
  });
  const especificas = tipo.causasEspecificas
    .map((id) => causaPorId(id))
    .filter((c): c is Causa => Boolean(c) && vigente(c!, dataFato));
  return [...gerais, ...especificas];
}

/** 'CP, art. 157, § 2º' */
export function rotuloCompleto(t: TipoPenal): string {
  const norma = NORMAS_DO_CATALOGO.find((n) => n.slug === t.norma)?.sigla ?? t.norma;
  const artigo = t.rotulo.replace(/^Art\.\s*/, 'art. ');
  return t.forma && t.forma !== 'caput' ? `${norma}, ${artigo}, ${t.forma}` : `${norma}, ${artigo}`;
}

/** Todas as referências (norma, rótulo) que o catálogo cita — para o teste contra o acervo. */
export function referenciasDoCatalogo(): { norma: string; rotulo: string }[] {
  const chaves = new Set<string>();
  for (const t of TIPOS) chaves.add(`${t.norma}|${t.rotulo}`);
  for (const c of CAUSAS) chaves.add(`${c.base.norma}|${c.base.rotulo}`);
  return [...chaves].map((k) => { const [norma, rotulo] = k.split('|'); return { norma, rotulo }; });
}

/** Os tipos catalogados a partir de um artigo do acervo — para o botão "Calcular a pena" do vade-mécum. */
export function tiposPorReferencia(norma: string, rotulo: string): TipoPenal[] {
  return tiposParaEscolha().filter((t) => t.norma === norma && t.rotulo === rotulo);
}
