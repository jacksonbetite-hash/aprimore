import { query, queryOne } from './db.ts';

/**
 * O progresso do aluno DENTRO de um curso — o que a página do curso e a
 * da aula precisam para deixar de ser um folheto de vendas para quem já
 * comprou.
 *
 * O painel (`lib/sessao.ts`) já respondia "quanto falta em cada curso"
 * para a lista de cursos do aluno. O que faltava era o recorte fino: que
 * aulas ESTE aluno já concluiu neste curso, onde ele parou e como foi no
 * exercício — sem isso, a página do curso mostrava a ementa igual para
 * quem nunca entrou e para quem já assistiu tudo.
 *
 * Sobre contar questão: a resposta é histórico, não estado — a mesma
 * questão pode ser refeita, e é assim que o caderno de erros (§5.2)
 * limpa o que foi corrigido. Por isso conta-se a ÚLTIMA resposta de cada
 * questão, que é exatamente o critério do caderno.
 */

export interface AulaAssistida {
  aulaId: number;
  segundos: number;
  concluida: boolean;
}

export interface ProgressoDoCurso {
  /** Só as aulas que o aluno abriu; ausente = nunca aberta. */
  porAula: Map<number, AulaAssistida>;
  aulasConcluidas: number;
  /** Questões das aulas publicadas do curso. */
  questoesTotal: number;
  questoesRespondidas: number;
  acertos: number;
}

const VAZIO: ProgressoDoCurso = {
  porAula: new Map(), aulasConcluidas: 0,
  questoesTotal: 0, questoesRespondidas: 0, acertos: 0,
};

export async function progressoDoCurso(
  usuarioId: number | undefined, materiaId: number,
): Promise<ProgressoDoCurso> {
  if (!usuarioId) return { ...VAZIO, porAula: new Map() };

  const [aulas, exercicio] = await Promise.all([
    query<AulaAssistida>(
      `SELECT p.aula_id::int AS "aulaId", p.segundos_assistidos::int AS segundos, p.concluida
         FROM progresso_aula p
         JOIN aula a ON a.id = p.aula_id
         JOIN assunto s ON s.id = a.assunto_id
        WHERE p.usuario_id = $1 AND s.materia_id = $2`,
      [usuarioId, materiaId],
    ),
    queryOne<{ total: number; respondidas: number; acertos: number }>(
      `WITH questoes AS (
         SELECT q.id
           FROM questao q
           JOIN exercicio e ON e.id = q.exercicio_id
           JOIN aula a ON a.id = e.aula_id
           JOIN assunto s ON s.id = a.assunto_id
          WHERE s.materia_id = $2 AND a.status = 'publicado'
       ), ultima AS (
         SELECT DISTINCT ON (r.questao_id) r.questao_id, r.acertou
           FROM resposta r
          WHERE r.usuario_id = $1 AND r.questao_id IN (SELECT id FROM questoes)
          ORDER BY r.questao_id, r.respondida_em DESC
       )
       SELECT (SELECT count(*)::int FROM questoes) AS total,
              (SELECT count(*)::int FROM ultima) AS respondidas,
              (SELECT count(*)::int FROM ultima WHERE acertou) AS acertos`,
      [usuarioId, materiaId],
    ),
  ]);

  return {
    porAula: new Map(aulas.map((a) => [Number(a.aulaId), a])),
    aulasConcluidas: aulas.filter((a) => a.concluida).length,
    questoesTotal: exercicio?.total ?? 0,
    questoesRespondidas: exercicio?.respondidas ?? 0,
    acertos: exercicio?.acertos ?? 0,
  };
}

/** Percentual inteiro, com o 0/0 respondido como 0 e não como NaN. */
export function percentual(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/**
 * De onde retomar: a primeira aula ainda não concluída, na ordem do
 * curso. Curso inteiro concluído devolve a primeira — quem terminou vai
 * rever, e mandá-lo para a última aula seria mandá-lo para o fim.
 */
export function proximaAula<T extends { id: number }>(
  aulas: readonly T[], progresso: ProgressoDoCurso,
): T | null {
  if (aulas.length === 0) return null;
  return aulas.find((a) => !progresso.porAula.get(Number(a.id))?.concluida) ?? aulas[0];
}
