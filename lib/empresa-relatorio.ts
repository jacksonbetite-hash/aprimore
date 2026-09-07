import { query } from './db.ts';

/**
 * Acompanhamento para o RH — §5.11, etapa 6 — e o painel do colaborador
 * (etapa 5). Só leitura, e tudo derivado das mesmas linhas: a licença
 * B2B diz quem foi ATRIBUÍDO, `progresso_aula` diz quem COMEÇOU,
 * `conclusao` diz quem TERMINOU. Não há contador paralelo para
 * desincronizar.
 */

export interface ResumoTrilha {
  materiaId: number; nome: string; slug: string; status: string;
  aulasPublicadas: number; temAvaliacao: boolean;
  atribuidos: number; iniciados: number; concluidos: number; atrasados: number;
}

export function resumoPorTrilha(portalId: number) {
  return query<ResumoTrilha>(
    `WITH pessoas AS (
       SELECT DISTINCT l.materia_id, l.usuario_id
         FROM licenca l JOIN usuario u ON u.id = l.usuario_id
        WHERE l.portal_id = $1 AND l.origem = 'B2B' AND l.status = 'ATIVA'
          AND u.status_conta <> 'ENCERRADA')
     SELECT m.id::int AS "materiaId", m.nome, m.slug, m.status,
            (SELECT count(*)::int FROM aula a JOIN assunto s ON s.id = a.assunto_id
              WHERE s.materia_id = m.id AND a.status = 'publicado') AS "aulasPublicadas",
            EXISTS (SELECT 1 FROM avaliacao av WHERE av.materia_id = m.id AND av.status = 'publicado') AS "temAvaliacao",
            (SELECT count(*)::int FROM pessoas p WHERE p.materia_id = m.id) AS atribuidos,
            (SELECT count(*)::int FROM pessoas p
              WHERE p.materia_id = m.id AND EXISTS (
                SELECT 1 FROM progresso_aula pa JOIN aula a ON a.id = pa.aula_id
                  JOIN assunto s ON s.id = a.assunto_id
                 WHERE s.materia_id = m.id AND pa.usuario_id = p.usuario_id)) AS iniciados,
            (SELECT count(*)::int FROM conclusao c WHERE c.materia_id = m.id) AS concluidos,
            (SELECT count(*)::int FROM pessoas p
              WHERE p.materia_id = m.id
                AND NOT EXISTS (SELECT 1 FROM conclusao c WHERE c.materia_id = m.id AND c.usuario_id = p.usuario_id)
                AND EXISTS (SELECT 1 FROM licenca l JOIN atribuicao at ON at.id = l.atribuicao_id
                             WHERE l.usuario_id = p.usuario_id AND l.materia_id = m.id
                               AND l.status = 'ATIVA' AND at.prazo_em < current_date)) AS atrasados
       FROM materia m
      WHERE m.portal_id = $1
      ORDER BY m.ordem, m.nome`,
    [portalId],
  );
}

export interface LinhaPessoa {
  usuarioId: number; nome: string; email: string; setorNome: string | null;
  materiaId: number; trilha: string; trilhaSlug: string;
  obrigatoria: boolean; prazoEm: Date | null;
  aulasTotal: number; aulasConcluidas: number; percentual: number;
  nota: number | null; tentativas: number;
  concluidaEm: Date | null; codigoCertificado: string | null;
  ultimoAcessoEm: Date | null;
  situacao: 'concluida' | 'atrasada' | 'em_andamento' | 'nao_iniciada';
}

const LINHAS_PESSOA = `
  WITH base AS (
    SELECT l.usuario_id, l.materia_id,
           bool_or(coalesce(at.obrigatoria, false)) AS obrigatoria,
           min(at.prazo_em) AS prazo_em
      FROM licenca l
      LEFT JOIN atribuicao at ON at.id = l.atribuicao_id
     WHERE l.portal_id = $1 AND l.origem = 'B2B' AND l.status = 'ATIVA'
     GROUP BY l.usuario_id, l.materia_id)
  SELECT u.id::int AS "usuarioId", u.nome, u.email, s.nome AS "setorNome",
         m.id::int AS "materiaId", m.nome AS trilha, m.slug AS "trilhaSlug",
         b.obrigatoria, b.prazo_em AS "prazoEm",
         (SELECT count(*)::int FROM aula a JOIN assunto ss ON ss.id = a.assunto_id
           WHERE ss.materia_id = m.id AND a.status = 'publicado') AS "aulasTotal",
         (SELECT count(*)::int FROM progresso_aula pa JOIN aula a ON a.id = pa.aula_id
            JOIN assunto ss ON ss.id = a.assunto_id
           WHERE ss.materia_id = m.id AND a.status = 'publicado' AND pa.usuario_id = u.id AND pa.concluida) AS "aulasConcluidas",
         (SELECT max(t.nota) FROM tentativa_avaliacao t JOIN avaliacao av ON av.id = t.avaliacao_id
           WHERE av.materia_id = m.id AND t.usuario_id = u.id) AS nota,
         (SELECT count(*)::int FROM tentativa_avaliacao t JOIN avaliacao av ON av.id = t.avaliacao_id
           WHERE av.materia_id = m.id AND t.usuario_id = u.id AND t.entregue_em IS NOT NULL) AS tentativas,
         c.concluida_em AS "concluidaEm", c.codigo_certificado AS "codigoCertificado",
         (SELECT max(pa.atualizado_em) FROM progresso_aula pa JOIN aula a ON a.id = pa.aula_id
            JOIN assunto ss ON ss.id = a.assunto_id
           WHERE ss.materia_id = m.id AND pa.usuario_id = u.id) AS "ultimoAcessoEm"
    FROM base b
    JOIN usuario u ON u.id = b.usuario_id
    JOIN materia m ON m.id = b.materia_id
    LEFT JOIN setor s ON s.id = u.setor_id
    LEFT JOIN conclusao c ON c.usuario_id = u.id AND c.materia_id = m.id
   WHERE u.status_conta <> 'ENCERRADA'
`;

function classificar(l: Omit<LinhaPessoa, 'situacao' | 'percentual'>): LinhaPessoa {
  const percentual = l.aulasTotal ? Math.round((100 * l.aulasConcluidas) / l.aulasTotal) : 0;
  const hoje = new Date();
  let situacao: LinhaPessoa['situacao'] = 'nao_iniciada';
  if (l.concluidaEm) situacao = 'concluida';
  else if (l.prazoEm && new Date(l.prazoEm) < hoje) situacao = 'atrasada';
  else if (l.aulasConcluidas > 0 || l.tentativas > 0 || l.ultimoAcessoEm) situacao = 'em_andamento';
  return { ...l, percentual, situacao };
}

/** Uma linha por (pessoa, trilha), com filtros opcionais por setor e trilha. */
export async function progressoPorPessoa(
  portalId: number, filtro: { setorId?: number | null; materiaId?: number | null; busca?: string } = {},
) {
  const linhas = await query<Omit<LinhaPessoa, 'situacao' | 'percentual'>>(
    `${LINHAS_PESSOA}
       AND ($2::bigint IS NULL OR u.setor_id = $2)
       AND ($3::bigint IS NULL OR m.id = $3)
       AND ($4 = '' OR u.nome ILIKE '%' || $4 || '%' OR u.email ILIKE '%' || $4 || '%')
     ORDER BY u.nome, m.ordem, m.nome`,
    [portalId, filtro.setorId ?? null, filtro.materiaId ?? null, (filtro.busca ?? '').trim()],
  );
  return linhas.map(classificar);
}

/** O que o colaborador vê em "Minhas trilhas": obrigatórias primeiro, prazo mais perto primeiro. */
export async function trilhasDoColaborador(portalId: number, usuarioId: number) {
  const linhas = await query<Omit<LinhaPessoa, 'situacao' | 'percentual'>>(
    `${LINHAS_PESSOA} AND u.id = $2
     ORDER BY b.obrigatoria DESC, b.prazo_em NULLS LAST, m.ordem, m.nome`,
    [portalId, usuarioId],
  );
  return linhas.map(classificar);
}

/** A próxima aula publicada da trilha que a pessoa ainda não concluiu (ou a primeira). */
export function proximaAula(usuarioId: number, materiaId: number) {
  return query<{ slug: string; titulo: string }>(
    `SELECT a.slug, a.titulo
       FROM aula a JOIN assunto s ON s.id = a.assunto_id
       LEFT JOIN progresso_aula p ON p.aula_id = a.id AND p.usuario_id = $1
      WHERE s.materia_id = $2 AND a.status = 'publicado'
      ORDER BY coalesce(p.concluida, false), s.ordem, a.ordem, a.id
      LIMIT 1`,
    [usuarioId, materiaId],
  ).then((r) => r[0] ?? null);
}

/** Exportação para o RH: CSV com separador ponto e vírgula (o Excel em pt-BR abre direto). */
export function paraCsv(linhas: LinhaPessoa[]): string {
  const escapar = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const data = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const cabecalho = ['nome', 'email', 'setor', 'trilha', 'obrigatoria', 'prazo', 'aulas_concluidas',
    'aulas_total', 'percentual', 'nota', 'tentativas', 'situacao', 'concluida_em', 'certificado'];
  const corpo = linhas.map((l) => [
    l.nome, l.email, l.setorNome, l.trilha, l.obrigatoria ? 'sim' : 'não', data(l.prazoEm),
    l.aulasConcluidas, l.aulasTotal, l.percentual, l.nota, l.tentativas, l.situacao,
    data(l.concluidaEm), l.codigoCertificado,
  ].map(escapar).join(';'));
  // BOM: sem ele o Excel abre o UTF-8 como Latin-1 e "concluída" vira lixo.
  return '﻿' + [cabecalho.join(';'), ...corpo].join('\r\n') + '\r\n';
}
