import { cookies } from 'next/headers';
import { query, queryOne } from './db.ts';
import { usuarioPorToken, COOKIE_SESSAO, type UsuarioSessao } from './auth.ts';
import { portalIdAtual } from './portal-consultas.ts';
import { pode, type Permissao } from './permissoes.ts';
import type { Espectador, Licenca, StatusConta } from './licenca.ts';

/**
 * Sessão do aluno, resolvida pelo cookie assinado (ver lib/auth.ts).
 *
 * `ALUNO_DEMO` ainda existe como atalho de desenvolvimento: quando
 * definido E não houver cookie, resolve aquele e-mail. Em produção
 * (NODE_ENV=production) o atalho é ignorado — nunca queremos uma
 * variável de ambiente abrindo a conta de alguém.
 */
export interface Aluno {
  id: number; nome: string; email: string;
  papel: UsuarioSessao['papel'];
  statusConta: StatusConta;
}

export async function alunoAtual(): Promise<Aluno | null> {
  // §5.10: quem é o aluno depende de em qual portal a pergunta foi feita.
  const portalId = await portalIdAtual();
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (token) {
    const u = await usuarioPorToken(token, portalId);
    if (u) return u as Aluno;
  }

  const demo = process.env.ALUNO_DEMO;
  if (demo && process.env.NODE_ENV !== 'production') {
    return queryOne<Aluno>(
      `SELECT id, nome, email, papel, status_conta AS "statusConta"
         FROM usuario WHERE portal_id = $1 AND lower(email) = lower($2)`,
      [portalId, demo],
    );
  }
  return null;
}

/**
 * Só o administrador — o que sobrou para ele com exclusividade é a
 * equipe (criar admin, financeiro, suporte). Para tudo o mais a pergunta
 * certa é `exigirPermissao`, que lê a tabela de lib/permissoes.ts.
 */
export async function exigirAdmin(): Promise<Aluno | null> {
  const u = await alunoAtual();
  return u && u.papel === 'admin' ? u : null;
}

/**
 * A guarda da retaguarda: quem está logado E tem esta permissão. Devolve
 * `null` nos dois casos — quem chama decide entre "entre" e "sem acesso".
 *
 * Fora do portal 0 ninguém é da equipe: o papel vive na conta da
 * plataforma, e no endereço de um portal a base é outra.
 */
export async function exigirPermissao(permissao: Permissao): Promise<Aluno | null> {
  const u = await alunoAtual();
  if (!u || !pode(u.papel, permissao)) return null;
  if ((await portalIdAtual()) !== 0) return null;
  return u;
}

/** Qualquer papel de operação — a porta de /admin. */
export function exigirEquipe() {
  return exigirPermissao('retaguarda.entrar');
}

interface LinhaLicenca {
  id: number; escopo: Licenca['escopo']; materiaId: number | null;
  origem: Licenca['origem']; status: Licenca['status'];
  inicioEm: Date; fimEm: Date; cota: Licenca['cota'];
  materiaNome: string | null; campanhaNome: string | null;
}

export function licencasDo(usuarioId: number) {
  return query<LinhaLicenca>(
    `SELECT l.id, l.escopo, l.materia_id AS "materiaId", l.origem, l.status,
            l.inicio_em AS "inicioEm", l.fim_em AS "fimEm", l.cota,
            m.nome AS "materiaNome", c.nome AS "campanhaNome"
       FROM licenca l
       LEFT JOIN materia m ON m.id = l.materia_id
       LEFT JOIN campanha_promocional c ON c.id = l.campanha_id
      WHERE l.usuario_id = $1
      ORDER BY l.fim_em DESC`,
    [usuarioId],
  );
}

/** Monta o espectador que o motor de licenças (§6.3) consome. */
export async function espectadorAtual(): Promise<Espectador> {
  const aluno = await alunoAtual();
  if (!aluno) return { licencas: [] };
  const licencas = await licencasDo(aluno.id);
  return { usuarioId: aluno.id, statusConta: aluno.statusConta, licencas };
}

export interface ProgressoMateria {
  materiaSlug: string; materiaNome: string;
  aulasConcluidas: number; aulasTotal: number; percentual: number;
  /** '' no próprio portal; '/parceiros/<mascara>' quando o curso é de parceiro. */
  base: string;
}

/** Prefixo dos links de curso/aula quando o curso é de outro portal (§5.10.2, etapa 5). */
const BASE_DO_CURSO = `CASE WHEN m.portal_id = u.portal_id THEN ''
                            ELSE '/parceiros/' || pt.mascara END AS base`;

export function progressoPorMateria(usuarioId: number) {
  return query<ProgressoMateria>(
    `SELECT m.slug AS "materiaSlug", m.nome AS "materiaNome",
            count(*) FILTER (WHERE p.concluida)::int AS "aulasConcluidas",
            count(au.id)::int AS "aulasTotal",
            CASE WHEN count(au.id) = 0 THEN 0
                 ELSE round(100.0 * count(*) FILTER (WHERE p.concluida) / count(au.id))::int
            END AS percentual,
            ${BASE_DO_CURSO}
       FROM materia m
       JOIN portal pt ON pt.id = m.portal_id
       JOIN usuario u ON u.id = $1
       JOIN assunto s ON s.materia_id = m.id
       JOIN aula au ON au.assunto_id = s.id AND au.status = 'publicado'
       LEFT JOIN progresso_aula p ON p.aula_id = au.id AND p.usuario_id = $1
      -- O passe CATALOGO cobre "todas as matérias" de UM portal: o da
      -- licença (que é o do aluno). Curso de parceiro (§5.10.2, etapa 5)
      -- só entra por licença da própria matéria.
      WHERE EXISTS (SELECT 1 FROM licenca l WHERE l.usuario_id = $1
                      AND (l.materia_id = m.id
                           OR (l.escopo = 'CATALOGO' AND m.portal_id = l.portal_id)))
      GROUP BY m.slug, m.nome, m.ordem, m.portal_id, u.portal_id, pt.mascara
      ORDER BY m.ordem`,
    [usuarioId],
  );
}

/**
 * Onde o aluno parou nesta aula — o que o player usa para retomar.
 * Ausente (null) é aula nunca aberta.
 */
export function progressoDaAula(usuarioId: number, aulaId: number) {
  return queryOne<{ segundosAssistidos: number; concluida: boolean }>(
    `SELECT segundos_assistidos AS "segundosAssistidos", concluida
       FROM progresso_aula WHERE usuario_id = $1 AND aula_id = $2`,
    [usuarioId, aulaId],
  );
}

/**
 * Grava o avanço. Duas decisões que evitam surpresa no painel:
 *
 *  - `segundos` nunca anda para trás. Quem volta a barra para rever um
 *    trecho não deve perder a marca de onde já tinha chegado.
 *  - `concluida` é porta de mão única: uma vez concluída, rever a aula
 *    não a desmarca.
 */
export async function registrarProgresso(
  usuarioId: number, aulaId: number, segundos: number, concluida: boolean,
): Promise<void> {
  await query(
    `INSERT INTO progresso_aula (usuario_id, aula_id, segundos_assistidos, concluida)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id, aula_id) DO UPDATE
        SET segundos_assistidos = greatest(progresso_aula.segundos_assistidos, EXCLUDED.segundos_assistidos),
            concluida           = progresso_aula.concluida OR EXCLUDED.concluida,
            atualizado_em       = now()`,
    [usuarioId, aulaId, segundos, concluida],
  );
}

export function continuarDeOndeParou(usuarioId: number) {
  return queryOne<{
    slug: string; titulo: string; materiaNome: string;
    segundosAssistidos: number; duracaoSegundos: number; base: string;
  }>(
    `SELECT au.slug, au.titulo, m.nome AS "materiaNome",
            p.segundos_assistidos AS "segundosAssistidos",
            au.duracao_segundos AS "duracaoSegundos",
            ${BASE_DO_CURSO}
       FROM progresso_aula p
       JOIN aula au ON au.id = p.aula_id
       JOIN assunto s ON s.id = au.assunto_id
       JOIN materia m ON m.id = s.materia_id
       JOIN portal pt ON pt.id = m.portal_id
       JOIN usuario u ON u.id = p.usuario_id
      WHERE p.usuario_id = $1 AND NOT p.concluida
      ORDER BY p.atualizado_em DESC LIMIT 1`,
    [usuarioId],
  );
}

export async function estatisticas(usuarioId: number) {
  const linha = await queryOne<{ respondidas: number; acertos: number }>(
    `SELECT count(*)::int AS respondidas,
            count(*) FILTER (WHERE acertou)::int AS acertos
       FROM resposta WHERE usuario_id = $1`,
    [usuarioId],
  );
  const respondidas = linha?.respondidas ?? 0;
  const acertos = linha?.acertos ?? 0;
  return {
    respondidas, acertos,
    percentual: respondidas ? Math.round((acertos / respondidas) * 100) : 0,
  };
}

/** Caderno de erros (§5.2): questões erradas que ainda não foram refeitas. */
export function cadernoDeErros(usuarioId: number) {
  return query<{ questaoId: number; enunciado: string; aulaSlug: string; aulaTitulo: string; base: string }>(
    `SELECT DISTINCT ON (q.id) q.id AS "questaoId", q.enunciado,
            au.slug AS "aulaSlug", au.titulo AS "aulaTitulo",
            ${BASE_DO_CURSO}
       FROM resposta r
       JOIN questao q ON q.id = r.questao_id
       JOIN exercicio e ON e.id = q.exercicio_id
       JOIN aula au ON au.id = e.aula_id
       JOIN assunto s ON s.id = au.assunto_id
       JOIN materia m ON m.id = s.materia_id
       JOIN portal pt ON pt.id = m.portal_id
       JOIN usuario u ON u.id = r.usuario_id
      WHERE r.usuario_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM resposta r2
           WHERE r2.usuario_id = r.usuario_id AND r2.questao_id = r.questao_id
             AND r2.acertou AND r2.respondida_em > r.respondida_em)
        AND NOT r.acertou
      ORDER BY q.id, r.respondida_em DESC`,
    [usuarioId],
  );
}
