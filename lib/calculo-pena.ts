import { query, queryOne } from './db.ts';
import type { Caso, Resultado } from './penas/tipos.ts';
import { CATALOGO_CONFERIDO_EM } from './penas/catalogo/index.ts';
import { serializarCaso } from './penas/url.ts';
import { formatarPena } from './penas/tempo.ts';

/**
 * Histórico da Calculadora Penal (§5.12) — a única parte da ferramenta
 * que toca o banco. A conta é feita em `lib/penas`, sem banco; aqui só se
 * guarda o que o aluno pediu para guardar.
 */

export interface CalculoSalvo {
  id: number;
  titulo: string;
  criadoEm: Date;
  versaoCatalogo: string;
  /** O caso, pronto para a URL: `/calculadora-penal?c=<param>`. */
  param: string;
  /** "Roubo — 5 anos e 4 meses, semiaberto" */
  resumo: string;
  desatualizado: boolean;
}

const LIMITE_POR_ALUNO = 50;

export async function salvarCalculo(
  usuarioId: number, portalId: number, titulo: string, caso: Caso, resultado: Resultado,
): Promise<number> {
  const limpo = titulo.trim().slice(0, 120) || resumoDe(resultado);
  const { id } = (await queryOne<{ id: number }>(
    `INSERT INTO calculo_pena (usuario_id, portal_id, titulo, entrada, resultado, versao_catalogo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [usuarioId, portalId, limpo, JSON.stringify(caso), JSON.stringify(resultado), CATALOGO_CONFERIDO_EM],
  ))!;
  /* Sem teto, a lista vira lixo: fica com os cinquenta mais recentes. */
  await query(
    `DELETE FROM calculo_pena WHERE usuario_id = $1 AND portal_id = $2 AND id NOT IN (
       SELECT id FROM calculo_pena WHERE usuario_id = $1 AND portal_id = $2 ORDER BY criado_em DESC LIMIT $3)`,
    [usuarioId, portalId, LIMITE_POR_ALUNO],
  );
  return id;
}

export async function listarCalculos(usuarioId: number, portalId: number, limite = 20): Promise<CalculoSalvo[]> {
  const linhas = await query<{ id: number; titulo: string; criadoEm: Date; versaoCatalogo: string; entrada: Caso; resultado: Resultado }>(
    `SELECT id, titulo, criado_em AS "criadoEm", versao_catalogo AS "versaoCatalogo", entrada, resultado
       FROM calculo_pena WHERE usuario_id = $1 AND portal_id = $2
      ORDER BY criado_em DESC LIMIT $3`,
    [usuarioId, portalId, limite],
  );
  return linhas.map((l) => ({
    id: l.id, titulo: l.titulo, criadoEm: l.criadoEm, versaoCatalogo: l.versaoCatalogo,
    param: serializarCaso(l.entrada), resumo: resumoDe(l.resultado),
    desatualizado: l.versaoCatalogo !== CATALOGO_CONFERIDO_EM,
  }));
}

export async function apagarCalculo(id: number, usuarioId: number): Promise<boolean> {
  const r = await query(`DELETE FROM calculo_pena WHERE id = $1 AND usuario_id = $2 RETURNING id`, [id, usuarioId]);
  return r.length > 0;
}

export function resumoDe(r: Resultado): string {
  const nomes = r.crimes.map((c) => c.nome).join(' + ');
  const regime = { FECHADO: 'fechado', SEMIABERTO: 'semiaberto', ABERTO: 'aberto' }[r.consequencias.regime.inicial];
  return `${nomes} — ${formatarPena(r.unificacao.totalDias)}, regime ${regime}`;
}
