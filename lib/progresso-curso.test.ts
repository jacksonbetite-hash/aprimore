import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * O progresso do aluno dentro de um curso — contra banco real.
 *
 * O que estes testes travam é o que a página do curso passou a mostrar
 * no lugar do preço para quem já comprou. Dois pontos que erram fácil e
 * calado: contar aula concluída de OUTRO curso, e contar resposta de
 * questão refeita duas vezes. A regra é a mesma do caderno de erros
 * (§5.2) — vale a ÚLTIMA resposta de cada questão.
 */
const { pool, query } = await import('./db.ts');
const { progressoDoCurso, proximaAula, percentual } = await import('./progresso-curso.ts');

let temBanco = true;
try { await pool.query('SELECT 1 FROM progresso_aula LIMIT 1'); } catch { temBanco = false; }
const talvez = { skip: temBanco ? false : 'banco não disponível' };

let n = 0;
async function cenario() {
  const sufixo = `prog-${Date.now()}-${++n}`;
  const [area] = await query<{ id: number }>(
    `INSERT INTO area (portal_id, slug, nome, ordem) VALUES (0, $1, 'Área', 99) RETURNING id`,
    [sufixo]);
  const [mat] = await query<{ id: number }>(
    `INSERT INTO materia (portal_id, area_id, slug, nome, ementa, status)
     VALUES (0, $1, $2, 'Curso do teste', 'ementa', 'publicado') RETURNING id`,
    [area.id, sufixo]);
  const [outro] = await query<{ id: number }>(
    `INSERT INTO materia (portal_id, area_id, slug, nome, ementa, status)
     VALUES (0, $1, $2, 'Outro curso', 'ementa', 'publicado') RETURNING id`,
    [area.id, `${sufixo}-outro`]);
  const [ass] = await query<{ id: number }>(
    `INSERT INTO assunto (portal_id, materia_id, slug, nome) VALUES (0, $1, $2, 'Assunto') RETURNING id`,
    [mat.id, sufixo]);
  const [assOutro] = await query<{ id: number }>(
    `INSERT INTO assunto (portal_id, materia_id, slug, nome) VALUES (0, $1, $2, 'Assunto') RETURNING id`,
    [outro.id, `${sufixo}-outro`]);
  const aula = async (assuntoId: number, slug: string, ordem: number) => {
    const [a] = await query<{ id: number }>(
      `INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, status, ordem)
       VALUES (0, $1, $2, $2, 600, 'resumo com mais de vinte caracteres', 'publicado', $3)
       RETURNING id`, [assuntoId, slug, ordem]);
    return Number(a.id);
  };
  const a1 = await aula(ass.id, `${sufixo}-a1`, 1);
  const a2 = await aula(ass.id, `${sufixo}-a2`, 2);
  const alheia = await aula(assOutro.id, `${sufixo}-alheia`, 1);

  const [u] = await query<{ id: number }>(
    `INSERT INTO usuario (portal_id, nome, email, papel)
     VALUES (0, 'Aluno Progresso', $1, 'aluno') RETURNING id`, [`${sufixo}@exemplo.com`]);

  /** Uma questão com duas alternativas; devolve os ids. */
  const questao = async (aulaId: number) => {
    const [e] = await query<{ id: number }>(
      'INSERT INTO exercicio (aula_id) VALUES ($1) RETURNING id', [aulaId]);
    const [q] = await query<{ id: number }>(
      `INSERT INTO questao (exercicio_id, tipo, enunciado, ordem)
       VALUES ($1, 'certo_errado', 'Enunciado?', 1) RETURNING id`, [e.id]);
    const [certa] = await query<{ id: number }>(
      `INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
       VALUES ($1, 'Certo', true, 'c', 1) RETURNING id`, [q.id]);
    const [errada] = await query<{ id: number }>(
      `INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
       VALUES ($1, 'Errado', false, 'c', 2) RETURNING id`, [q.id]);
    return { questaoId: Number(q.id), certa: Number(certa.id), errada: Number(errada.id) };
  };

  return {
    materiaId: Number(mat.id), outroId: Number(outro.id), usuarioId: Number(u.id),
    a1, a2, alheia, questao, sufixo,
    limpar: async () => {
      await query('DELETE FROM usuario WHERE id = $1', [u.id]);
      await query('DELETE FROM materia WHERE id IN ($1, $2)', [mat.id, outro.id]);
      await query('DELETE FROM area WHERE id = $1', [area.id]);
    },
  };
}

test('sem aluno (visitante), o progresso é vazio e não consulta nada', async () => {
  const p = await progressoDoCurso(undefined, 1);
  assert.equal(p.aulasConcluidas, 0);
  assert.equal(p.porAula.size, 0);
  assert.equal(p.questoesRespondidas, 0);
});

test('aula concluída conta; aula de outro curso não', talvez, async () => {
  const c = await cenario();
  try {
    await query(
      `INSERT INTO progresso_aula (usuario_id, aula_id, segundos_assistidos, concluida)
       VALUES ($1, $2, 600, true), ($1, $3, 120, false), ($1, $4, 600, true)`,
      [c.usuarioId, c.a1, c.a2, c.alheia]);

    const p = await progressoDoCurso(c.usuarioId, c.materiaId);
    assert.equal(p.aulasConcluidas, 1, 'só a aula concluída DESTE curso');
    assert.equal(p.porAula.size, 2, 'a aula do outro curso não entra no mapa');
    assert.equal(p.porAula.get(c.a2)?.segundos, 120, 'aula começada guarda onde parou');
    assert.equal(p.porAula.get(c.alheia), undefined);
  } finally { await c.limpar(); }
});

test('questão refeita conta uma vez, e vale a última resposta', talvez, async () => {
  const c = await cenario();
  try {
    const q1 = await c.questao(c.a1);
    const q2 = await c.questao(c.a2);
    const responde = (q: { questaoId: number }, alternativaId: number, acertou: boolean, quando: string) =>
      query(
        `INSERT INTO resposta (usuario_id, questao_id, alternativa_id, acertou, respondida_em)
         VALUES ($1, $2, $3, $4, $5)`,
        [c.usuarioId, q.questaoId, alternativaId, acertou, quando]);

    // Errou, voltou e acertou: uma questão respondida, um acerto.
    await responde(q1, q1.errada, false, '2026-09-01T10:00:00Z');
    await responde(q1, q1.certa, true, '2026-09-02T10:00:00Z');
    // Acertou e depois errou ao refazer: a última é a que vale.
    await responde(q2, q2.certa, true, '2026-09-01T10:00:00Z');
    await responde(q2, q2.errada, false, '2026-09-03T10:00:00Z');

    const p = await progressoDoCurso(c.usuarioId, c.materiaId);
    assert.equal(p.questoesTotal, 2);
    assert.equal(p.questoesRespondidas, 2, 'refazer não cria questão nova');
    assert.equal(p.acertos, 1, 'vale a última resposta de cada questão');
  } finally { await c.limpar(); }
});

test('percentual não divide por zero', () => {
  assert.equal(percentual(0, 0), 0);
  assert.equal(percentual(1, 3), 33);
  assert.equal(percentual(2, 2), 100);
});

test('retomar é a primeira aula não concluída; curso terminado volta à primeira', () => {
  const aulas = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const vazio = { porAula: new Map(), aulasConcluidas: 0, questoesTotal: 0, questoesRespondidas: 0, acertos: 0 };
  assert.equal(proximaAula(aulas, vazio)?.id, 1);

  const meio = {
    ...vazio,
    porAula: new Map([[1, { aulaId: 1, segundos: 600, concluida: true }]]),
  };
  assert.equal(proximaAula(aulas, meio)?.id, 2);

  const tudo = {
    ...vazio,
    porAula: new Map(aulas.map((a) => [a.id, { aulaId: a.id, segundos: 600, concluida: true }])),
  };
  assert.equal(proximaAula(aulas, tudo)?.id, 1, 'quem terminou vai rever, e revê do começo');
  assert.equal(proximaAula([], vazio), null);
});

test.after(() => pool.end());
