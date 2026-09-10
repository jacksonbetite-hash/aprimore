/**
 * A projeção da matéria — parte pura, sem `next/cache`.
 *
 * `catalogo.ts` embrulha as consultas no cache do Next, e por isso não
 * pode ser importado por teste em Node puro. O que é só SQL e tipo mora
 * aqui, para o catálogo E a vitrine compartilhada (`vitrine.ts`) lerem a
 * matéria com as mesmas colunas — uma projeção só, uma verdade só.
 */

export interface Materia {
  id: number; slug: string; nome: string; ementa: string;
  onda: number | null; status: string; professor: string | null;
  areaSlug: string; areaNome: string;
  /** Capa do cartão: `/api/imagem/<id>`, ou nulo — aí entra o desenho da área. */
  capa: string | null;
  aulasPublicadas: number; questoes: number; duracaoTotal: number;
  /**
   * Quantas aulas publicadas estão abertas a quem ainda não assinou. É o
   * que sustenta o selo "aula aberta para experimentar" no cartão grande
   * da vitrine — sem a contagem, o selo seria promessa escrita à mão, e
   * apareceria também no curso que não tem amostra nenhuma.
   */
  amostras: number;
  /** De quem é o curso (§5.10.2, etapa 5) e se ele está na nossa vitrine. */
  portalId: number; naVitrinePlataforma: boolean;
  /** O curso que abre o catálogo, no banner grande (db/043). */
  destaque: boolean;
  /** A quem o curso se dirige — o filtro "níveis" da barra de busca. */
  nivel: string | null;
  /**
   * A aula que o cartão do catálogo roda ao passar o mouse
   * (docs/plano-catalogo-streaming.md). É SEMPRE uma amostra gratuita
   * publicada — a única aula que §6.1 abre a quem não assinou. Curso sem
   * amostra vem com os três nulos, e o cartão fica sem prévia.
   */
  previaProvedor: string | null;
  previaVideo: string | null;
  previaSlug: string | null;
  /** Quando a última aula publicada foi ao ar — "atualizado em" do banner. */
  atualizadaEm: Date | null;
}

export const MATERIA_CAMPOS = `
  m.id, m.slug, m.nome, m.ementa, m.onda, m.status, m.professor, m.capa,
  m.portal_id::int AS "portalId", m.na_vitrine_plataforma AS "naVitrinePlataforma",
  a.slug AS "areaSlug", a.nome AS "areaNome",
  (SELECT count(*)::int FROM aula au JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado') AS "aulasPublicadas",
  (SELECT count(*)::int FROM questao q
     JOIN exercicio e ON e.id = q.exercicio_id
     JOIN aula au ON au.id = e.aula_id
     JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado') AS "questoes",
  (SELECT coalesce(sum(au.duracao_segundos), 0)::int FROM aula au
     JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado') AS "duracaoTotal",
  (SELECT count(*)::int FROM aula au JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado'
      AND au.amostra_gratuita) AS "amostras",
  m.destaque, m.nivel,
  /* A prévia do cartão: a PRIMEIRA amostra gratuita publicada com vídeo,
     na ordem em que o aluno a encontraria (assunto, depois aula). Três
     subconsultas com o mesmo ORDER BY, e não uma com tupla, porque o
     projeto não usa tipo composto em lugar nenhum e uma tupla aqui
     obrigaria quem lê a desempacotá-la em toda tela. São correlatas e
     custam pouco: a projeção inteira do catálogo vive em cache. */
  (SELECT au.video_provedor FROM aula au JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado' AND au.amostra_gratuita
      AND au.video_id IS NOT NULL
    ORDER BY s.ordem, au.ordem LIMIT 1) AS "previaProvedor",
  (SELECT au.video_id FROM aula au JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado' AND au.amostra_gratuita
      AND au.video_id IS NOT NULL
    ORDER BY s.ordem, au.ordem LIMIT 1) AS "previaVideo",
  (SELECT au.slug FROM aula au JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado' AND au.amostra_gratuita
      AND au.video_id IS NOT NULL
    ORDER BY s.ordem, au.ordem LIMIT 1) AS "previaSlug",
  (SELECT max(au.atualizada_em) FROM aula au JOIN assunto s ON s.id = au.assunto_id
    WHERE s.materia_id = m.id AND au.status = 'publicado') AS "atualizadaEm"
`;
