import { queryOne } from './db.ts';
import type { Personalizacao, StatusPortal } from './portal.ts';

/**
 * O portal de um professor — o que o painel dele (§5.10, "painel do
 * professor") precisa saber numa consulta só. Um professor tem um portal
 * vivo por vez; o mais recente não encerrado é o dele.
 */
export interface PortalDoProfessor {
  id: number; mascara: string; nomeExibicao: string; status: StatusPortal;
  personalizacao: Personalizacao;
  subcontaSituacao: string; escrowDias: number | null;
  publicadoEm: Date | null; suspensoEm: Date | null;
  planoNome: string | null;
  contrato: {
    licencaMensalCentavos: number; percentualBase: string; acrescimoIndicacaoPp: string;
    comissaoVitrinePp: string; aceitoEm: Date | null;
  } | null;
  faturasPendentes: number;
  materias: number; aulasPublicadas: number; alunos: number;
  /**
   * O que a checklist do painel precisa saber para dizer a verdade — e
   * não uma aproximação. Contar "cursos" e "aulas publicadas" solto
   * marcava passo como feito enquanto o portal continuava vazio: um
   * curso publicado SEM aula publicada não aparece na página do portal
   * (`PaginaPortal` filtra `aulasPublicadas > 0`), e uma aula sem
   * questão não cumpre a regra de "toda aula termina em exercício".
   */
  materiasPublicadas: number;
  /** Cursos que o visitante realmente vê: publicados e com aula no ar. */
  materiasNoAr: number;
  /** Publicados, mas sem nenhuma aula no ar — invisíveis no portal. */
  materiasVazias: number;
  aulasComExercicio: number;
  /**
   * Aulas publicadas que já têm gravação. Aula sem vídeo vai ao ar e
   * serve resumo e exercício — é comportamento correto —, mas a aula em
   * vídeo é o produto, e o painel precisa dizer quantas ainda faltam.
   */
  aulasComVideo: number;
}

export function portalDoProfessor(usuarioId: number) {
  return queryOne<PortalDoProfessor>(
    `SELECT p.id::int AS id, p.mascara, p.nome_exibicao AS "nomeExibicao", p.status,
            p.personalizacao, p.subconta_situacao AS "subcontaSituacao", p.escrow_dias AS "escrowDias",
            p.publicado_em AS "publicadoEm", p.suspenso_em AS "suspensoEm",
            pl.nome AS "planoNome",
            CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
              'licencaMensalCentavos', c.licenca_mensal_centavos,
              'percentualBase', c.percentual_base,
              'acrescimoIndicacaoPp', c.acrescimo_indicacao_pp,
              'comissaoVitrinePp', c.comissao_vitrine_pp,
              'aceitoEm', c.aceito_em) END AS contrato,
            (SELECT count(*)::int FROM portal_fatura f
              WHERE f.portal_id = p.id AND f.status IN ('FECHADA', 'EM_ATRASO')) AS "faturasPendentes",
            (SELECT count(*)::int FROM materia m WHERE m.portal_id = p.id) AS materias,
            (SELECT count(*)::int FROM materia m
              WHERE m.portal_id = p.id AND m.status = 'publicado') AS "materiasPublicadas",
            (SELECT count(*)::int FROM materia m
              WHERE m.portal_id = p.id AND m.status = 'publicado'
                AND EXISTS (SELECT 1 FROM aula a JOIN assunto s ON s.id = a.assunto_id
                             WHERE s.materia_id = m.id AND a.status = 'publicado')) AS "materiasNoAr",
            (SELECT count(*)::int FROM materia m
              WHERE m.portal_id = p.id AND m.status = 'publicado'
                AND NOT EXISTS (SELECT 1 FROM aula a JOIN assunto s ON s.id = a.assunto_id
                                 WHERE s.materia_id = m.id AND a.status = 'publicado')) AS "materiasVazias",
            (SELECT count(*)::int FROM aula a WHERE a.portal_id = p.id AND a.status = 'publicado') AS "aulasPublicadas",
            (SELECT count(*)::int FROM aula a
              WHERE a.portal_id = p.id AND a.status = 'publicado'
                AND EXISTS (SELECT 1 FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
                             WHERE e.aula_id = a.id)) AS "aulasComExercicio",
            (SELECT count(*)::int FROM aula a
              WHERE a.portal_id = p.id AND a.status = 'publicado' AND a.video_id IS NOT NULL) AS "aulasComVideo",
            (SELECT count(*)::int FROM usuario u WHERE u.portal_id = p.id AND u.papel = 'aluno') AS alunos
       FROM portal p
       LEFT JOIN portal_plano pl ON pl.id = p.plano_id
       LEFT JOIN portal_contrato c ON c.portal_id = p.id AND c.vigente_ate IS NULL
      WHERE p.professor_id = $1 AND p.tipo = 'PROFESSOR' AND p.status <> 'ENCERRADO'
      ORDER BY p.criado_em DESC LIMIT 1`,
    [usuarioId],
  );
}
