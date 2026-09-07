/**
 * Todas as referências (norma, rótulo) que um resultado cita — para a
 * página buscar os textos no acervo de uma vez só (§5.12).
 */

import type { Ref, Resultado } from './tipos.ts';

export function referenciasDoResultado(r: Resultado): Ref[] {
  const vistas = new Map<string, Ref>();
  const add = (ref?: Ref | null) => { if (ref) vistas.set(`${ref.norma}|${ref.rotulo}`, ref); };
  for (const c of r.crimes) for (const p of c.memoria) add(p.base);
  for (const p of r.unificacao.passos) add(p.base);
  const q = r.consequencias;
  add(q.regime.base); add(q.substituicao.base); add(q.sursis.base);
  for (const d of q.despenalizadores) add(d.base);
  add(q.execucao.progressao.base); add(q.execucao.livramento.base);
  for (const p of r.prescricao) for (const z of p.prazos) for (const b of z.base) add(b);
  for (const b of r.decadencia.base) add(b);
  for (const b of r.perempcao.base) add(b);
  for (const f of r.ficha) add(f.base);
  return [...vistas.values()];
}

export const chaveRef = (ref: Ref) => `${ref.norma}|${ref.rotulo}`;
