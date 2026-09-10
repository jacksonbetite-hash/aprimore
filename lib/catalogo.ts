import { query, queryOne } from './db.ts';
import { emCache } from './cache.ts';
import type { ProvedorVideo } from './video.ts';
import { MATERIA_CAMPOS, type Materia } from './catalogo-campos.ts';

export interface Area { id: number; slug: string; nome: string }
export type { Materia } from './catalogo-campos.ts';
export { listarMateriasCompartilhadas, type MateriaCompartilhada } from './vitrine.ts';
export interface AulaResumo {
  id: number; slug: string; titulo: string; duracaoSegundos: number;
  amostraGratuita: boolean; noTrial: boolean; status: string;
  assuntoNome: string; assuntoSlug: string; questoes: number;
}


/**
 * Toda consulta daqui recebe `portalId` como primeiro argumento — §5.10.
 *
 * É explícito de propósito, sem valor padrão: um padrão silencioso
 * transformaria o esquecimento de escopo num vazamento (§15.14), enquanto
 * um argumento obrigatório o transforma em erro de compilação. O portal da
 * requisição sai de `portalIdAtual()`, em `portal-consultas.ts`.
 */
export function listarAreas(portalId: number) {
  return query<Area>(
    'SELECT id, slug, nome FROM area WHERE portal_id = $1 ORDER BY ordem',
    [portalId],
  );
}

/**
 * O catálogo lista curso não publicado como "em breve" — é a onda de
 * lançamento da casa (§4). O curso de um professor do catálogo (db/046)
 * NÃO entra nessa regra: rascunho e "em revisão" são dele, e só aparecem
 * quando a plataforma publica. Sem isto, criar o curso já o exporia.
 */
const SO_PUBLICADO_SE_DE_PROFESSOR = `(m.professor_id IS NULL OR m.status = 'publicado')`;

export function listarMaterias(portalId: number) {
  return query<Materia>(
    `SELECT ${MATERIA_CAMPOS} FROM materia m JOIN area a ON a.id = m.area_id
     WHERE m.portal_id = $1 AND ${SO_PUBLICADO_SE_DE_PROFESSOR}
     ORDER BY a.ordem, m.ordem`,
    [portalId],
  );
}

export function buscarMateria(portalId: number, slug: string) {
  return queryOne<Materia>(
    `SELECT ${MATERIA_CAMPOS} FROM materia m JOIN area a ON a.id = m.area_id
     WHERE m.portal_id = $1 AND m.slug = $2 AND ${SO_PUBLICADO_SE_DE_PROFESSOR}`,
    [portalId, slug],
  );
}

export function listarAulasDaMateria(portalId: number, materiaId: number) {
  return query<AulaExpandida>(
    `SELECT au.id, au.slug, au.titulo, au.duracao_segundos AS "duracaoSegundos",
            au.amostra_gratuita AS "amostraGratuita", au.no_trial AS "noTrial",
            au.status, s.nome AS "assuntoNome", s.slug AS "assuntoSlug",
            (SELECT count(*)::int FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
              WHERE e.aula_id = au.id) AS questoes
       FROM aula au JOIN assunto s ON s.id = au.assunto_id
      WHERE au.portal_id = $1 AND s.materia_id = $2
      ORDER BY s.ordem, au.ordem`,
    [portalId, materiaId],
  );
}
type AulaExpandida = AulaResumo;

export interface AulaCompleta extends AulaResumo {
  resumo: string;
  materiaId: number; materiaSlug: string; materiaNome: string; professor: string | null;
  atualizadaEm: Date;
  /* Onde o vídeo mora. Nunca é um endereço — é (provedor, id), e o
     endereço sai assinado de lib/video.ts a cada carregamento. Nulo em
     aula ainda sem gravação: a página mostra o resumo do mesmo jeito. */
  videoProvedor: ProvedorVideo | null;
  videoId: string | null;
}

export function buscarAula(portalId: number, slug: string) {
  return queryOne<AulaCompleta>(
    `SELECT au.id, au.slug, au.titulo, au.duracao_segundos AS "duracaoSegundos",
            au.resumo, au.amostra_gratuita AS "amostraGratuita", au.no_trial AS "noTrial",
            au.status, au.atualizada_em AS "atualizadaEm",
            au.video_provedor AS "videoProvedor", au.video_id AS "videoId",
            s.nome AS "assuntoNome", s.slug AS "assuntoSlug",
            m.id AS "materiaId", m.slug AS "materiaSlug", m.nome AS "materiaNome", m.professor,
            (SELECT count(*)::int FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
              WHERE e.aula_id = au.id) AS questoes
       FROM aula au
       JOIN assunto s ON s.id = au.assunto_id
       JOIN materia m ON m.id = s.materia_id
      WHERE au.portal_id = $1 AND au.slug = $2`,
    [portalId, slug],
  );
}

export function materiaisDaAula(aulaId: number) {
  return query<{ id: number; titulo: string; arquivo: string; bytes: number }>(
    'SELECT id, titulo, arquivo, bytes FROM material_apoio WHERE aula_id = $1 ORDER BY id',
    [aulaId],
  );
}

/** Aula anterior e próxima dentro da mesma matéria, para navegação. */
export async function vizinhas(portalId: number, aula: AulaCompleta) {
  const todas = await listarAulasDaMateria(portalId, aula.materiaId);
  const publicadas = todas.filter((a) => a.status === 'publicado');
  const i = publicadas.findIndex((a) => a.id === aula.id);
  return { anterior: publicadas[i - 1] ?? null, proxima: publicadas[i + 1] ?? null };
}

export function formatarDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}min${seg ? String(seg).padStart(2, '0') : ''}`;
}

// ---- Versões em cache, usadas pelas páginas públicas ----
//
// O `portalId` entra como argumento e, por isso, faz parte da chave do
// cache: o catálogo de um portal nunca é servido a partir do cache de
// outro. Não é sutileza — é a diferença entre isolar e parecer isolar.
export const listarAreasEmCache = emCache(listarAreas, ['areas']);
export const listarMateriasEmCache = emCache(listarMaterias, ['materias']);
