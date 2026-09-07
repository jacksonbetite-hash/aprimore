import { randomBytes } from 'node:crypto';
import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import type { StatusPublicacao } from './admin-cursos.ts';

/**
 * Avaliação final da trilha, conclusão e certificado — §5.11, etapas 3 e 5.
 *
 * A avaliação é a prova que fecha a trilha: nota mínima, número de
 * tentativas, embaralhamento. A conclusão é o FATO que o certificado
 * atesta — linha própria, congelada no dia (nota e carga horária de
 * então), porque republicar a trilha com mais aulas não reescreve
 * certificado emitido. O código do certificado é público e verificável
 * em /certificado/<codigo>; único no sistema inteiro, não por portal.
 */

// ---------------------------------------------------------------------
// Retaguarda (painel da empresa)
// ---------------------------------------------------------------------

export interface AvaliacaoAdmin {
  id: number; materiaId: number; titulo: string; descricao: string | null;
  notaMinima: number; maxTentativas: number | null; embaralhar: boolean;
  status: StatusPublicacao; questoes: number;
}

export function avaliacaoDaTrilha(portalId: number, materiaId: number) {
  return queryOne<AvaliacaoAdmin>(
    `SELECT av.id::int AS id, av.materia_id::int AS "materiaId", av.titulo, av.descricao,
            av.nota_minima AS "notaMinima", av.max_tentativas AS "maxTentativas",
            av.embaralhar, av.status,
            (SELECT count(*)::int FROM questao q WHERE q.avaliacao_id = av.id) AS questoes
       FROM avaliacao av WHERE av.portal_id = $1 AND av.materia_id = $2`,
    [portalId, materiaId],
  );
}

export interface DadosAvaliacao {
  titulo: string; descricao: string; notaMinima: number;
  maxTentativas: number | null; embaralhar: boolean; status: StatusPublicacao;
}

export async function salvarAvaliacao(
  ator: string, portalId: number, materiaId: number, d: DadosAvaliacao,
) {
  const titulo = d.titulo.trim();
  if (titulo.length < 3) throw new Error('dê um título à avaliação');
  if (!Number.isInteger(d.notaMinima) || d.notaMinima < 0 || d.notaMinima > 100) {
    throw new Error('a nota mínima vai de 0 a 100');
  }
  if (d.maxTentativas !== null && (!Number.isInteger(d.maxTentativas) || d.maxTentativas < 1)) {
    throw new Error('tentativas: um número a partir de 1, ou em branco para ilimitado');
  }
  return emTransacao(async (exec) => {
    const [m] = await exec('SELECT 1 FROM materia WHERE id = $1 AND portal_id = $2', [materiaId, portalId]);
    if (!m) throw new Error('trilha não encontrada neste portal');
    if (d.status === 'publicado') {
      const [n] = await exec<{ n: number }>(
        `SELECT count(*)::int AS n FROM questao q JOIN avaliacao av ON av.id = q.avaliacao_id
          WHERE av.materia_id = $1 AND av.portal_id = $2`, [materiaId, portalId]);
      if (n.n === 0) {
        throw new Error('a avaliação não pode ser publicada sem questão: salve como rascunho, '
          + 'cadastre as questões e publique depois');
      }
    }
    const [av] = await exec<{ id: number }>(
      `INSERT INTO avaliacao (portal_id, materia_id, titulo, descricao, nota_minima,
                              max_tentativas, embaralhar, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (materia_id) DO UPDATE
         SET titulo = EXCLUDED.titulo, descricao = EXCLUDED.descricao,
             nota_minima = EXCLUDED.nota_minima, max_tentativas = EXCLUDED.max_tentativas,
             embaralhar = EXCLUDED.embaralhar, status = EXCLUDED.status,
             atualizada_em = now()
       RETURNING id::int AS id`,
      [portalId, materiaId, titulo, d.descricao.trim() || null, d.notaMinima,
       d.maxTentativas, d.embaralhar, d.status],
    );
    await auditar(exec, ator, 'avaliacao.salva', 'avaliacao', av.id,
      { portalId, materiaId, status: d.status });
    return av.id;
  });
}

// ---------------------------------------------------------------------
// O colaborador faz a prova
// ---------------------------------------------------------------------

export interface QuestaoDaProva {
  id: number; tipo: 'multipla_escolha' | 'certo_errado'; enunciado: string;
  alternativas: { id: number; texto: string }[];
}

export interface ProvaParaAluno {
  id: number; titulo: string; descricao: string | null;
  notaMinima: number; maxTentativas: number | null; embaralhar: boolean;
  materiaId: number; materiaNome: string; materiaSlug: string;
  /** Tentativas já entregues, e a melhor nota entre elas. */
  tentativas: number; melhorNota: number | null; aprovada: boolean;
  codigoCertificado: string | null;
  /** Aulas publicadas da trilha e quantas o aluno concluiu. */
  aulasTotal: number; aulasConcluidas: number;
}

export function provaDaTrilha(portalId: number, materiaSlug: string, usuarioId: number) {
  return queryOne<ProvaParaAluno>(
    `SELECT av.id::int AS id, av.titulo, av.descricao, av.nota_minima AS "notaMinima",
            av.max_tentativas AS "maxTentativas", av.embaralhar,
            m.id::int AS "materiaId", m.nome AS "materiaNome", m.slug AS "materiaSlug",
            (SELECT count(*)::int FROM tentativa_avaliacao t
              WHERE t.avaliacao_id = av.id AND t.usuario_id = $3 AND t.entregue_em IS NOT NULL) AS tentativas,
            (SELECT max(t.nota) FROM tentativa_avaliacao t
              WHERE t.avaliacao_id = av.id AND t.usuario_id = $3) AS "melhorNota",
            EXISTS (SELECT 1 FROM conclusao c WHERE c.usuario_id = $3 AND c.materia_id = m.id) AS aprovada,
            (SELECT c.codigo_certificado FROM conclusao c
              WHERE c.usuario_id = $3 AND c.materia_id = m.id) AS "codigoCertificado",
            (SELECT count(*)::int FROM aula a JOIN assunto s ON s.id = a.assunto_id
              WHERE s.materia_id = m.id AND a.status = 'publicado') AS "aulasTotal",
            (SELECT count(*)::int FROM progresso_aula p
               JOIN aula a ON a.id = p.aula_id JOIN assunto s ON s.id = a.assunto_id
              WHERE s.materia_id = m.id AND a.status = 'publicado'
                AND p.usuario_id = $3 AND p.concluida) AS "aulasConcluidas"
       FROM avaliacao av JOIN materia m ON m.id = av.materia_id
      WHERE av.portal_id = $1 AND m.slug = $2 AND av.status = 'publicado'`,
    [portalId, materiaSlug, usuarioId],
  );
}

/** Embaralha sem depender de ordem do banco — Fisher–Yates. */
function embaralhar<T>(itens: T[]): T[] {
  const a = [...itens];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** As questões SEM gabarito nem comentário: o que vai para a tela da prova. */
export async function questoesDaProva(avaliacaoId: number, misturar: boolean) {
  const linhas = await query<{
    questaoId: number; tipo: QuestaoDaProva['tipo']; enunciado: string;
    altId: number; texto: string;
  }>(
    // ::int nos dois ids, e não por estilo: o driver devolve BIGINT como
    // TEXTO, e a correção compara o id marcado (número, vindo do
    // formulário) com o id da alternativa. Sem o cast, `5 === '5'` é
    // falso e toda prova sai zerada — com o gabarito certo no banco.
    `SELECT q.id::int AS "questaoId", q.tipo, q.enunciado, a.id::int AS "altId", a.texto
       FROM questao q JOIN alternativa a ON a.questao_id = q.id
      WHERE q.avaliacao_id = $1 ORDER BY q.ordem, q.id, a.ordem, a.id`,
    [avaliacaoId],
  );
  const mapa = new Map<number, QuestaoDaProva>();
  for (const l of linhas) {
    let q = mapa.get(l.questaoId);
    if (!q) { q = { id: l.questaoId, tipo: l.tipo, enunciado: l.enunciado, alternativas: [] }; mapa.set(l.questaoId, q); }
    q.alternativas.push({ id: l.altId, texto: l.texto });
  }
  let questoes = [...mapa.values()];
  if (misturar) {
    questoes = embaralhar(questoes).map((q) =>
      // Certo/errado não se embaralha: "Errado" antes de "Certo" só confunde.
      q.tipo === 'certo_errado' ? q : { ...q, alternativas: embaralhar(q.alternativas) });
  }
  return questoes;
}

/**
 * Abre (ou retoma) a tentativa. Uma aberta por vez — `tentativa_aberta_
 * unica` no banco —, e só enquanto couber no máximo de tentativas.
 */
export async function iniciarTentativa(portalId: number, usuarioId: number, avaliacaoId: number) {
  return emTransacao(async (exec) => {
    const [av] = await exec<{ max: number | null; feitas: number; aberta: number | null }>(
      `SELECT av.max_tentativas AS max,
              (SELECT count(*)::int FROM tentativa_avaliacao t
                WHERE t.avaliacao_id = av.id AND t.usuario_id = $2 AND t.entregue_em IS NOT NULL) AS feitas,
              (SELECT t.id::int FROM tentativa_avaliacao t
                WHERE t.avaliacao_id = av.id AND t.usuario_id = $2 AND t.entregue_em IS NULL) AS aberta
         FROM avaliacao av WHERE av.id = $3 AND av.portal_id = $1 AND av.status = 'publicado'`,
      [portalId, usuarioId, avaliacaoId],
    );
    if (!av) throw new Error('avaliação não encontrada');
    if (av.aberta) return av.aberta;
    if (av.max !== null && av.feitas >= av.max) {
      throw new Error(`você já usou as ${av.max} tentativas desta avaliação`);
    }
    const [t] = await exec<{ id: number }>(
      `INSERT INTO tentativa_avaliacao (portal_id, usuario_id, avaliacao_id)
       VALUES ($1, $2, $3) RETURNING id::int AS id`,
      [portalId, usuarioId, avaliacaoId],
    );
    return t.id;
  });
}

export interface ResultadoProva {
  nota: number; aprovada: boolean; notaMinima: number; acertos: number; total: number;
  codigoCertificado: string | null;
  /** Por questão: o que marcou, o que era, e o comentário da correta. */
  correcao: { questaoId: number; marcada: number | null; correta: number; acertou: boolean; comentario: string }[];
}

function gerarCodigo() {
  // 10 caracteres sem ambiguidade (sem 0/O, 1/I): fácil de digitar do papel.
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i++) s += alfabeto[bytes[i] % alfabeto.length];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/**
 * Entrega e corrige no servidor — o gabarito nunca vai ao navegador
 * antes da entrega. Aprovada, a trilha ganha a conclusão (com o código
 * do certificado) na mesma transação. As respostas ficam gravadas
 * inteiras na tentativa: a prova pode mudar depois e o resultado tem de
 * continuar explicável.
 */
export async function entregarTentativa(
  portalId: number, usuarioId: number, avaliacaoId: number, respostas: Record<string, number>,
): Promise<ResultadoProva> {
  return emTransacao(async (exec) => {
    const [t] = await exec<{ id: number; notaMinima: number; materiaId: number }>(
      `SELECT t.id::int AS id, av.nota_minima AS "notaMinima", av.materia_id::int AS "materiaId"
         FROM tentativa_avaliacao t JOIN avaliacao av ON av.id = t.avaliacao_id
        WHERE t.avaliacao_id = $3 AND t.usuario_id = $2 AND t.portal_id = $1
          AND t.entregue_em IS NULL FOR UPDATE OF t`,
      [portalId, usuarioId, avaliacaoId],
    );
    if (!t) throw new Error('não há tentativa aberta — comece a avaliação de novo');

    const gabarito = await exec<{ questaoId: number; altId: number; comentario: string }>(
      // ::int pelo mesmo motivo de `questoesDaProva`: aqui é onde a
      // comparação acontece.
      `SELECT q.id::int AS "questaoId", a.id::int AS "altId", a.comentario
         FROM questao q JOIN alternativa a ON a.questao_id = q.id AND a.correta
        WHERE q.avaliacao_id = $1 ORDER BY q.ordem, q.id`,
      [avaliacaoId],
    );
    if (gabarito.length === 0) throw new Error('a avaliação está sem questões');

    const correcao = gabarito.map((g) => {
      const marcada = Number(respostas[String(g.questaoId)]) || null;
      return {
        questaoId: g.questaoId, marcada, correta: g.altId,
        acertou: marcada === g.altId, comentario: g.comentario,
      };
    });
    const acertos = correcao.filter((c) => c.acertou).length;
    const nota = Math.round((acertos / gabarito.length) * 100);
    const aprovada = nota >= t.notaMinima;

    await exec(
      `UPDATE tentativa_avaliacao SET entregue_em = now(), nota = $2, aprovada = $3, respostas = $4
        WHERE id = $1`,
      [t.id, nota, aprovada, JSON.stringify(respostas)],
    );

    let codigo: string | null = null;
    if (aprovada) {
      const [existente] = await exec<{ codigo: string }>(
        'SELECT codigo_certificado AS codigo FROM conclusao WHERE usuario_id = $1 AND materia_id = $2',
        [usuarioId, t.materiaId],
      );
      if (existente) {
        codigo = existente.codigo;
      } else {
        const [carga] = await exec<{ min: number }>(
          `SELECT coalesce(ceil(sum(a.duracao_segundos) / 60.0), 0)::int AS min
             FROM aula a JOIN assunto s ON s.id = a.assunto_id
            WHERE s.materia_id = $1 AND a.status = 'publicado'`, [t.materiaId]);
        codigo = gerarCodigo();
        await exec(
          `INSERT INTO conclusao (portal_id, usuario_id, materia_id, nota, carga_horaria_min, codigo_certificado)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [portalId, usuarioId, t.materiaId, nota, carga.min, codigo],
        );
        await auditar(exec, `usuario:${usuarioId}`, 'trilha.concluida', 'conclusao', 0,
          { portalId, materiaId: t.materiaId, nota, codigo });
      }
    }
    return { nota, aprovada, notaMinima: t.notaMinima, acertos, total: gabarito.length, codigoCertificado: codigo, correcao };
  });
}

// ---------------------------------------------------------------------
// Certificado
// ---------------------------------------------------------------------

export interface Certificado {
  codigo: string; nome: string; trilha: string; concluidaEm: Date; nota: number | null;
  cargaHorariaMin: number; empresaNome: string; empresaFoto: string | null;
  responsavelNome: string | null; responsavelDoc: string | null;
}

/** Público: quem tem o código confere. Não sabe de que empresa é — por isso o código é único global. */
export function certificadoPorCodigo(codigo: string) {
  return queryOne<Certificado>(
    `SELECT c.codigo_certificado AS codigo, u.nome, m.nome AS trilha,
            c.concluida_em AS "concluidaEm", c.nota, c.carga_horaria_min AS "cargaHorariaMin",
            p.nome_exibicao AS "empresaNome", p.personalizacao->>'foto' AS "empresaFoto",
            p.responsavel_nome AS "responsavelNome", p.responsavel_doc AS "responsavelDoc"
       FROM conclusao c
       JOIN usuario u ON u.id = c.usuario_id
       JOIN materia m ON m.id = c.materia_id
       JOIN portal p ON p.id = c.portal_id
      WHERE upper(c.codigo_certificado) = upper($1)`,
    [codigo.trim()],
  );
}
