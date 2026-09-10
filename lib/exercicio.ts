import { query } from './db.ts';

export interface Alternativa {
  id: number; texto: string; correta: boolean; comentario: string;
}
export interface Questao {
  id: number; tipo: 'multipla_escolha' | 'certo_errado';
  enunciado: string; origem: string; alternativas: Alternativa[];
}

/**
 * Carrega o exercício de uma aula com TODOS os comentários (§5.3).
 * Os comentários vão para o cliente junto com as alternativas: o
 * discovery quer correção imediata, e esconder o gabarito atrás de outra
 * requisição só adicionaria latência a um conteúdo que o aluno já pagou.
 */
export async function exercicioDaAula(aulaId: number): Promise<Questao[]> {
  const linhas = await query<{
    questaoId: number; tipo: Questao['tipo']; enunciado: string; origem: string;
    altId: number; texto: string; correta: boolean; comentario: string;
  }>(
    /* `::int` nos dois ids não é enfeite: BIGINT chega do driver como
       TEXTO, e a tela compara o id da alternativa marcada com o id de
       cada alternativa. Com uma ponta em texto e a outra em número, a
       comparação estrita dá `false` sempre — o exercício respondido
       voltava do banco como "0 acertos", com o gabarito certo do lado.

       O id entra no ORDER BY como desempate, e não só a ordem manual: as
       questões de uma aula vêm quase sempre com a MESMA ordem (o seed
       grava 10 em todas), e sem desempate o Postgres pode devolvê-las em
       sequência diferente a cada consulta. Com o exercício mostrando uma
       questão por vez, isso fica visível — recarregar a página no meio
       embaralha a prova e a pessoa perde o fio. Ordenação estável é de
       graça, e este defeito é silencioso. */
    `SELECT q.id::int AS "questaoId", q.tipo, q.enunciado, q.origem,
            a.id::int AS "altId", a.texto, a.correta, a.comentario
       FROM questao q
       JOIN exercicio e ON e.id = q.exercicio_id
       JOIN alternativa a ON a.questao_id = q.id
      WHERE e.aula_id = $1
      ORDER BY q.ordem, q.id, a.ordem, a.id`,
    [aulaId],
  );

  const porQuestao = new Map<number, Questao>();
  for (const l of linhas) {
    let q = porQuestao.get(l.questaoId);
    if (!q) {
      q = { id: l.questaoId, tipo: l.tipo, enunciado: l.enunciado, origem: l.origem, alternativas: [] };
      porQuestao.set(l.questaoId, q);
    }
    q.alternativas.push({ id: l.altId, texto: l.texto, correta: l.correta, comentario: l.comentario });
  }
  return [...porQuestao.values()];
}

/**
 * O que este aluno já respondeu nesta aula — a última resposta de cada
 * questão, que é o critério do caderno de erros (§5.2).
 *
 * Sem isto, o exercício voltava em branco a cada visita: o aluno não via
 * o que tinha marcado, nem o comentário da alternativa, e respondia de
 * novo sem querer. A resposta continua sendo HISTÓRICO — refazer é
 * permitido, e é assim que a questão errada sai do caderno.
 */
export interface RespostaDada {
  questaoId: number; alternativaId: number; acertou: boolean; respondidaEm: Date;
}

export function respostasDaAula(usuarioId: number, aulaId: number) {
  return query<RespostaDada>(
    `SELECT DISTINCT ON (r.questao_id)
            r.questao_id::int AS "questaoId", r.alternativa_id::int AS "alternativaId",
            r.acertou, r.respondida_em AS "respondidaEm"
       FROM resposta r
       JOIN questao q ON q.id = r.questao_id
       JOIN exercicio e ON e.id = q.exercicio_id
      WHERE r.usuario_id = $1 AND e.aula_id = $2
      ORDER BY r.questao_id, r.respondida_em DESC`,
    [usuarioId, aulaId],
  );
}

export async function registrarResposta(
  usuarioId: number, questaoId: number, alternativaId: number,
): Promise<{ acertou: boolean }> {
  const [alt] = await query<{ correta: boolean }>(
    'SELECT correta FROM alternativa WHERE id = $1 AND questao_id = $2',
    [alternativaId, questaoId],
  );
  if (!alt) throw new Error('alternativa não pertence à questão');

  await query(
    `INSERT INTO resposta (usuario_id, questao_id, alternativa_id, acertou)
     VALUES ($1, $2, $3, $4)`,
    [usuarioId, questaoId, alternativaId, alt.correta],
  );
  return { acertou: alt.correta };
}
