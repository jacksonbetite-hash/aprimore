import { query, queryOne } from './db.ts';
import { emTransacao, auditar, type Exec } from './auditoria.ts';
import { slugificar, slugLivre, normalizarParagrafos } from './texto.ts';
import { PORTAL_PLATAFORMA } from './portal.ts';

/**
 * Catálogo na retaguarda — §4 (Área → Matéria → Assunto → Aula) e §5.3.
 *
 * Era o maior buraco da administração: as doze matérias, seis assuntos,
 * nove aulas e vinte e cinco questões existiam só como `INSERT` em
 * `db/002`–`db/006`. Criar uma aula exigia escrever SQL, criar migração e
 * reconstruir a imagem — o que, na prática, significa que o catálogo não
 * crescia sem um desenvolvedor.
 *
 * TODA função aqui recebe `portalId` (§5.10). Não é preciosismo: com o
 * catálogo multi-tenant, uma consulta sem escopo é vazamento de acervo de
 * um professor no site de outro — o risco 14, classificado como crítico.
 * O padrão é `PORTAL_PLATAFORMA` (0) porque é o acervo da casa; o portal
 * do professor passa o próprio identificador e enxerga apenas o dele.
 *
 * As chaves compostas de `db/018_portal.sql` fazem o banco recusar
 * pendurar assunto de um portal em matéria de outro. Este módulo confere
 * antes, para devolver uma frase em português em vez de um erro de FK.
 */

export type StatusPublicacao = 'rascunho' | 'em_revisao' | 'aprovado' | 'publicado' | 'arquivado';
export type TipoQuestao = 'multipla_escolha' | 'certo_errado';

/**
 * Onde o vídeo mora. `db/013_video.sql` trocou a antiga `video_url` por
 * este par: guardar a URL crua significava reescrever o banco a cada troca
 * de fornecedor, e um endereço fixo não pode ser assinado com prazo de
 * validade — que é o que `lib/video.ts` faz para o §10 valer.
 */
export type ProvedorVideo = 'LOCAL' | 'BUNNY' | 'CLOUDFLARE';
export const PROVEDORES: ProvedorVideo[] = ['LOCAL', 'BUNNY', 'CLOUDFLARE'];

export const SITUACOES: { valor: StatusPublicacao; rotulo: string }[] = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'em_revisao', rotulo: 'Em revisão' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'publicado', rotulo: 'Publicado' },
  { valor: 'arquivado', rotulo: 'Arquivado' },
];

// ---------------------------------------------------------------------
// Áreas
// ---------------------------------------------------------------------

export interface AreaAdmin { id: number; slug: string; nome: string; ordem: number; materias: number }

export function listarAreas(portalId = PORTAL_PLATAFORMA) {
  return query<AreaAdmin>(
    `SELECT a.id, a.slug, a.nome, a.ordem,
            (SELECT count(*)::int FROM materia m
              WHERE m.area_id = a.id AND m.portal_id = a.portal_id) AS materias
       FROM area a WHERE a.portal_id = $1 ORDER BY a.ordem, a.nome`,
    [portalId],
  );
}

export async function salvarArea(
  ator: string, portalId: number, id: number | null, nome: string, ordem: number,
) {
  if (!nome.trim()) throw new Error('o nome da área é obrigatório');
  return emTransacao(async (exec) => {
    if (id) {
      // O `WHERE portal_id` no UPDATE não é redundante: sem ele, um id de
      // outro portal chegado pela URL editaria acervo alheio.
      const [linha] = await exec<{ id: number }>(
        'UPDATE area SET nome = $3, ordem = $4 WHERE id = $1 AND portal_id = $2 RETURNING id',
        [id, portalId, nome.trim(), ordem],
      );
      if (!linha) throw new Error('área não encontrada neste portal');
      await auditar(exec, ator, 'area.editada', 'area', id, { portalId, nome, ordem });
      return id;
    }
    const base = slugificar(nome);
    if (!base) throw new Error('o nome precisa ter ao menos uma letra ou número');
    const usados = await exec<{ slug: string }>(
      'SELECT slug FROM area WHERE portal_id = $1', [portalId],
    );
    const slug = slugLivre(base, usados.map((u) => u.slug));
    const [nova] = await exec<{ id: number }>(
      'INSERT INTO area (portal_id, slug, nome, ordem) VALUES ($1,$2,$3,$4) RETURNING id',
      [portalId, slug, nome.trim(), ordem],
    );
    await auditar(exec, ator, 'area.criada', 'area', nova.id, { portalId, slug, nome });
    return nova.id;
  });
}

export async function excluirArea(ator: string, portalId: number, id: number) {
  return emTransacao(async (exec) => {
    const [a] = await exec<{ nome: string; materias: number }>(
      `SELECT nome, (SELECT count(*)::int FROM materia WHERE area_id = $1) AS materias
         FROM area WHERE id = $1 AND portal_id = $2`, [id, portalId],
    );
    if (!a) throw new Error('área não encontrada neste portal');
    if (a.materias > 0) throw new Error(`a área tem ${a.materias} matéria(s) — mova-as antes`);
    await exec('DELETE FROM area WHERE id = $1 AND portal_id = $2', [id, portalId]);
    await auditar(exec, ator, 'area.excluida', 'area', id, { portalId, nome: a.nome });
  });
}

// ---------------------------------------------------------------------
// Matérias
// ---------------------------------------------------------------------

export interface MateriaAdmin {
  id: number; slug: string; nome: string; ementa: string;
  areaId: number; areaNome: string; onda: number | null;
  status: StatusPublicacao; professor: string | null; ordem: number;
  naVitrinePlataforma: boolean;
  assuntos: number; aulas: number; aulasPublicadas: number;
  /** §5.11: a trilha de empresa tem avaliação final; o curso da plataforma, não. */
  avaliacaoPublicada: boolean;
}

export interface DadosMateria {
  areaId: number; nome: string; ementa: string; onda?: number | null;
  status: StatusPublicacao; professor?: string | null; ordem: number;
  naVitrinePlataforma: boolean;
}

const CAMPOS_MATERIA = `
  m.id, m.slug, m.nome, m.ementa, m.area_id AS "areaId", a.nome AS "areaNome",
  m.onda, m.status, m.professor, m.ordem,
  m.na_vitrine_plataforma AS "naVitrinePlataforma",
  (SELECT count(*)::int FROM assunto s WHERE s.materia_id = m.id) AS assuntos,
  (SELECT count(*)::int FROM aula au JOIN assunto s2 ON s2.id = au.assunto_id
    WHERE s2.materia_id = m.id) AS aulas,
  (SELECT count(*)::int FROM aula au JOIN assunto s3 ON s3.id = au.assunto_id
    WHERE s3.materia_id = m.id AND au.status = 'publicado') AS "aulasPublicadas",
  EXISTS (SELECT 1 FROM avaliacao av
           WHERE av.materia_id = m.id AND av.status = 'publicado') AS "avaliacaoPublicada"
`;

export function listarMaterias(portalId = PORTAL_PLATAFORMA, busca = '') {
  return query<MateriaAdmin>(
    `SELECT ${CAMPOS_MATERIA}
       FROM materia m JOIN area a ON a.id = m.area_id
      WHERE m.portal_id = $1
        AND ($2 = '' OR m.nome ILIKE '%' || $2 || '%')
      ORDER BY a.ordem, m.ordem, m.nome`,
    [portalId, busca.trim()],
  );
}

export function buscarMateria(portalId: number, id: number) {
  return queryOne<MateriaAdmin>(
    `SELECT ${CAMPOS_MATERIA}
       FROM materia m JOIN area a ON a.id = m.area_id
      WHERE m.id = $2 AND m.portal_id = $1`,
    [portalId, id],
  );
}

function validarMateria(d: DadosMateria) {
  if (!d.nome.trim()) throw new Error('o nome da matéria é obrigatório');
  if (d.ementa.trim().length < 60) {
    throw new Error('a ementa precisa de pelo menos 60 caracteres — ela é o que vende o curso');
  }
  if (!Number.isInteger(d.areaId)) throw new Error('escolha a área');
}

export async function criarMateria(ator: string, portalId: number, d: DadosMateria) {
  validarMateria(d);
  return emTransacao(async (exec) => {
    await conferirArea(exec, portalId, d.areaId);
    const usados = await exec<{ slug: string }>(
      'SELECT slug FROM materia WHERE portal_id = $1', [portalId],
    );
    const slug = slugLivre(slugificar(d.nome), usados.map((u) => u.slug));
    const [nova] = await exec<{ id: number }>(
      `INSERT INTO materia
         (portal_id, area_id, slug, nome, ementa, onda, status, professor, ordem,
          na_vitrine_plataforma)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [portalId, d.areaId, slug, d.nome.trim(), normalizarParagrafos(d.ementa),
       d.onda ?? null, d.status, d.professor?.trim() || null, d.ordem, d.naVitrinePlataforma],
    );
    await auditar(exec, ator, 'materia.criada', 'materia', nova.id,
      { portalId, slug, nome: d.nome.trim(), status: d.status });
    return { id: nova.id, slug };
  });
}

export async function editarMateria(
  ator: string, portalId: number, id: number, d: DadosMateria,
) {
  validarMateria(d);
  return emTransacao(async (exec) => {
    await conferirArea(exec, portalId, d.areaId);
    const [antes] = await exec<{ status: string }>(
      'SELECT status FROM materia WHERE id = $1 AND portal_id = $2', [id, portalId],
    );
    if (!antes) throw new Error('matéria não encontrada neste portal');
    await exec(
      `UPDATE materia SET area_id=$3, nome=$4, ementa=$5, onda=$6, status=$7,
              professor=$8, ordem=$9, na_vitrine_plataforma=$10, atualizada_em = now()
        WHERE id = $1 AND portal_id = $2`,
      [id, portalId, d.areaId, d.nome.trim(), normalizarParagrafos(d.ementa),
       d.onda ?? null, d.status, d.professor?.trim() || null, d.ordem, d.naVitrinePlataforma],
    );
    await auditar(exec, ator, 'materia.editada', 'materia', id, {
      portalId, nome: d.nome.trim(),
      status: antes.status === d.status ? d.status : `${antes.status} → ${d.status}`,
    });
    return id;
  });
}

/**
 * A área precisa ser do mesmo portal. O banco recusaria pela chave
 * composta `materia_area_mesmo_portal`; conferir antes troca um erro de
 * integridade indecifrável por uma frase que diz o que fazer.
 */
async function conferirArea(exec: Exec, portalId: number, areaId: number) {
  const [a] = await exec<{ id: number }>(
    'SELECT id FROM area WHERE id = $1 AND portal_id = $2', [areaId, portalId],
  );
  if (!a) throw new Error('a área escolhida não pertence a este portal');
}

export async function mudarStatusMateria(
  ator: string, portalId: number, id: number, status: StatusPublicacao,
) {
  return emTransacao(async (exec) => {
    const [linha] = await exec<{ id: number }>(
      `UPDATE materia SET status = $3, atualizada_em = now()
        WHERE id = $1 AND portal_id = $2 RETURNING id`,
      [id, portalId, status],
    );
    if (!linha) throw new Error('matéria não encontrada neste portal');
    await auditar(exec, ator, 'materia.status', 'materia', id, { portalId, para: status });
  });
}

// ---------------------------------------------------------------------
// Assuntos
// ---------------------------------------------------------------------

export interface AssuntoAdmin {
  id: number; slug: string; nome: string; ordem: number; materiaId: number; aulas: number;
}

export function listarAssuntos(portalId: number, materiaId: number) {
  return query<AssuntoAdmin>(
    `SELECT s.id, s.slug, s.nome, s.ordem, s.materia_id AS "materiaId",
            (SELECT count(*)::int FROM aula a WHERE a.assunto_id = s.id) AS aulas
       FROM assunto s
      WHERE s.materia_id = $2 AND s.portal_id = $1
      ORDER BY s.ordem, s.nome`,
    [portalId, materiaId],
  );
}

export async function salvarAssunto(
  ator: string, portalId: number, materiaId: number,
  id: number | null, nome: string, ordem: number,
) {
  if (!nome.trim()) throw new Error('o nome do assunto é obrigatório');
  return emTransacao(async (exec) => {
    if (id) {
      const [linha] = await exec<{ id: number }>(
        `UPDATE assunto SET nome = $4, ordem = $5, atualizado_em = now()
          WHERE id = $1 AND portal_id = $2 AND materia_id = $3 RETURNING id`,
        [id, portalId, materiaId, nome.trim(), ordem],
      );
      if (!linha) throw new Error('assunto não encontrado nesta matéria');
      await auditar(exec, ator, 'assunto.editado', 'assunto', id, { portalId, materiaId, nome });
      return id;
    }
    const [m] = await exec<{ id: number }>(
      'SELECT id FROM materia WHERE id = $1 AND portal_id = $2', [materiaId, portalId],
    );
    if (!m) throw new Error('matéria não encontrada neste portal');

    const base = slugificar(nome);
    if (!base) throw new Error('o nome precisa ter ao menos uma letra ou número');
    // `assunto.slug` é único por matéria (db/001), não por portal.
    const usados = await exec<{ slug: string }>(
      'SELECT slug FROM assunto WHERE materia_id = $1', [materiaId],
    );
    const slug = slugLivre(base, usados.map((u) => u.slug));
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO assunto (portal_id, materia_id, slug, nome, ordem)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [portalId, materiaId, slug, nome.trim(), ordem],
    );
    await auditar(exec, ator, 'assunto.criado', 'assunto', novo.id,
      { portalId, materiaId, slug, nome });
    return novo.id;
  });
}

/**
 * Assunto com aula não some. `ON DELETE CASCADE` levaria junto as aulas,
 * o progresso de quem assistiu e as respostas dos exercícios — perda
 * silenciosa de dado de aluno, que é o oposto do que o §12 promete.
 */
export async function excluirAssunto(ator: string, portalId: number, id: number) {
  return emTransacao(async (exec) => {
    const [s] = await exec<{ nome: string; aulas: number }>(
      `SELECT nome, (SELECT count(*)::int FROM aula WHERE assunto_id = $1) AS aulas
         FROM assunto WHERE id = $1 AND portal_id = $2`, [id, portalId],
    );
    if (!s) throw new Error('assunto não encontrado neste portal');
    if (s.aulas > 0) throw new Error(`o assunto tem ${s.aulas} aula(s) — mova ou arquive antes`);
    await exec('DELETE FROM assunto WHERE id = $1 AND portal_id = $2', [id, portalId]);
    await auditar(exec, ator, 'assunto.excluido', 'assunto', id, { portalId, nome: s.nome });
  });
}

// ---------------------------------------------------------------------
// Aulas
// ---------------------------------------------------------------------

export interface AulaAdmin {
  id: number; slug: string; titulo: string; resumo: string;
  duracaoSegundos: number;
  videoProvedor: ProvedorVideo | null; videoId: string | null;
  amostraGratuita: boolean; noTrial: boolean;
  status: StatusPublicacao; ordem: number;
  assuntoId: number; assuntoNome: string;
  materiaId: number; materiaNome: string;
  questoes: number; atualizadaEm: Date;
}

export interface DadosAula {
  assuntoId: number; titulo: string; resumo: string;
  duracaoSegundos: number;
  videoProvedor?: string | null; videoId?: string | null;
  amostraGratuita: boolean; noTrial: boolean;
  status: StatusPublicacao; ordem: number;
}

const CAMPOS_AULA = `
  a.id, a.slug, a.titulo, a.resumo, a.duracao_segundos AS "duracaoSegundos",
  a.video_provedor AS "videoProvedor", a.video_id AS "videoId",
  a.amostra_gratuita AS "amostraGratuita",
  a.no_trial AS "noTrial", a.status, a.ordem, a.atualizada_em AS "atualizadaEm",
  a.assunto_id AS "assuntoId", s.nome AS "assuntoNome",
  s.materia_id AS "materiaId", m.nome AS "materiaNome",
  (SELECT count(*)::int FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
    WHERE e.aula_id = a.id) AS questoes
`;

export function listarAulas(portalId: number, materiaId: number) {
  return query<AulaAdmin>(
    `SELECT ${CAMPOS_AULA}
       FROM aula a
       JOIN assunto s ON s.id = a.assunto_id
       JOIN materia m ON m.id = s.materia_id
      WHERE a.portal_id = $1 AND s.materia_id = $2
      ORDER BY s.ordem, a.ordem, a.titulo`,
    [portalId, materiaId],
  );
}

export function buscarAula(portalId: number, id: number) {
  return queryOne<AulaAdmin>(
    `SELECT ${CAMPOS_AULA}
       FROM aula a
       JOIN assunto s ON s.id = a.assunto_id
       JOIN materia m ON m.id = s.materia_id
      WHERE a.id = $2 AND a.portal_id = $1`,
    [portalId, id],
  );
}

function validarAula(d: DadosAula) {
  if (!d.titulo.trim()) throw new Error('o título da aula é obrigatório');
  // §5.3: o resumo é a meta description e o que o aluno lê antes do play.
  // A restrição `aula_publicada_tem_resumo` só cobra no publicado; aqui a
  // cobrança é sempre, porque rascunho sem resumo vira publicação travada.
  if (d.resumo.trim().length < 20) {
    throw new Error('o resumo precisa de pelo menos 20 caracteres — ele é obrigatório no §5.3');
  }
  if (!Number.isInteger(d.duracaoSegundos) || d.duracaoSegundos < 1) {
    throw new Error('informe a duração da aula');
  }
  if (!Number.isInteger(d.assuntoId)) throw new Error('escolha o assunto');

  // `aula_video_completo` exige os dois campos juntos ou nenhum: aula com
  // provedor e sem identificador é um player que não carrega nada.
  const provedor = d.videoProvedor?.trim() || null;
  const identificador = d.videoId?.trim() || null;
  if (Boolean(provedor) !== Boolean(identificador)) {
    throw new Error('informe o provedor E o identificador do vídeo, ou deixe os dois em branco');
  }
  if (provedor && !PROVEDORES.includes(provedor as ProvedorVideo)) {
    throw new Error('provedor de vídeo desconhecido');
  }
}

/** Provedor e identificador, normalizados para o par que o banco aceita. */
function video(d: DadosAula): [string | null, string | null] {
  const provedor = d.videoProvedor?.trim() || null;
  const identificador = d.videoId?.trim() || null;
  return provedor && identificador ? [provedor, identificador] : [null, null];
}

/**
 * §5.3, a regra de produto: "a aula sem exercício não é publicável".
 *
 * Vivia só em texto de tela ("sem pelo menos uma questão, a aula não vai
 * ao ar") e num UPDATE de seed — a aplicação publicava aula vazia sem
 * reclamar. Agora a conferência mora num lugar só e vale para os três
 * caminhos: criar já publicada, editar para publicada e o botão Publicar.
 */
async function exigirExercicio(exec: Exec, aulaId: number) {
  const [n] = await exec<{ questoes: number }>(
    `SELECT count(*)::int AS questoes FROM questao q
       JOIN exercicio e ON e.id = q.exercicio_id WHERE e.aula_id = $1`,
    [aulaId],
  );
  if (n.questoes === 0) {
    throw new Error(
      'a aula não pode ser publicada sem exercício (§5.3): cadastre pelo menos uma questão '
      + 'comentada e publique em seguida',
    );
  }
}

export async function criarAula(ator: string, portalId: number, d: DadosAula) {
  validarAula(d);
  if (d.status === 'publicado') {
    throw new Error(
      'uma aula nova ainda não tem exercício, e aula sem exercício não vai ao ar (§5.3): '
      + 'salve como rascunho, cadastre as questões e publique depois',
    );
  }
  return emTransacao(async (exec) => {
    const [s] = await exec<{ id: number }>(
      'SELECT id FROM assunto WHERE id = $1 AND portal_id = $2', [d.assuntoId, portalId],
    );
    if (!s) throw new Error('o assunto escolhido não pertence a este portal');

    // `aula.slug` é rota pública (/aula/[slug]) e único por portal.
    const usados = await exec<{ slug: string }>(
      'SELECT slug FROM aula WHERE portal_id = $1', [portalId],
    );
    const slug = slugLivre(slugificar(d.titulo), usados.map((u) => u.slug));
    const [nova] = await exec<{ id: number }>(
      `INSERT INTO aula
         (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo,
          video_provedor, video_id, amostra_gratuita, no_trial, status, ordem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [portalId, d.assuntoId, slug, d.titulo.trim(), d.duracaoSegundos,
       normalizarParagrafos(d.resumo), ...video(d),
       d.amostraGratuita, d.noTrial, d.status, d.ordem],
    );
    await auditar(exec, ator, 'aula.criada', 'aula', nova.id,
      { portalId, slug, titulo: d.titulo.trim() });
    return { id: nova.id, slug };
  });
}

export async function editarAula(ator: string, portalId: number, id: number, d: DadosAula) {
  validarAula(d);
  return emTransacao(async (exec) => {
    const [s] = await exec<{ id: number }>(
      'SELECT id FROM assunto WHERE id = $1 AND portal_id = $2', [d.assuntoId, portalId],
    );
    if (!s) throw new Error('o assunto escolhido não pertence a este portal');
    if (d.status === 'publicado') await exigirExercicio(exec, id);

    const [linha] = await exec<{ id: number }>(
      `UPDATE aula SET assunto_id=$3, titulo=$4, duracao_segundos=$5, resumo=$6,
              video_provedor=$7, video_id=$8, amostra_gratuita=$9, no_trial=$10,
              status=$11, ordem=$12, atualizada_em = now()
        WHERE id = $1 AND portal_id = $2 RETURNING id`,
      [id, portalId, d.assuntoId, d.titulo.trim(), d.duracaoSegundos,
       normalizarParagrafos(d.resumo), ...video(d),
       d.amostraGratuita, d.noTrial, d.status, d.ordem],
    );
    if (!linha) throw new Error('aula não encontrada neste portal');
    await auditar(exec, ator, 'aula.editada', 'aula', id,
      { portalId, titulo: d.titulo.trim(), status: d.status });
    return id;
  });
}

export async function mudarStatusAula(
  ator: string, portalId: number, id: number, status: StatusPublicacao,
) {
  return emTransacao(async (exec) => {
    if (status === 'publicado') await exigirExercicio(exec, id);
    const [linha] = await exec<{ id: number }>(
      `UPDATE aula SET status = $3, atualizada_em = now()
        WHERE id = $1 AND portal_id = $2 RETURNING id`,
      [id, portalId, status],
    );
    if (!linha) throw new Error('aula não encontrada neste portal');
    await auditar(exec, ator, 'aula.status', 'aula', id, { portalId, para: status });
  });
}

// ---------------------------------------------------------------------
// Exercício da aula (§5.3)
// ---------------------------------------------------------------------

export interface QuestaoAdmin {
  id: number; tipo: TipoQuestao; enunciado: string;
  origem: string; dificuldade: string; ordem: number;
  alternativas: { id: number; texto: string; correta: boolean; comentario: string; ordem: number }[];
}

export async function exercicioDaAula(portalId: number, aulaId: number) {
  const questoes = await query<Omit<QuestaoAdmin, 'alternativas'>>(
    `SELECT q.id, q.tipo, q.enunciado, q.origem, q.dificuldade, q.ordem
       FROM questao q
       JOIN exercicio e ON e.id = q.exercicio_id
       JOIN aula a ON a.id = e.aula_id
      WHERE e.aula_id = $2 AND a.portal_id = $1
      ORDER BY q.ordem, q.id`,
    [portalId, aulaId],
  );
  if (questoes.length === 0) return [];

  const alternativas = await query<{
    id: number; questaoId: number; texto: string; correta: boolean;
    comentario: string; ordem: number;
  }>(
    `SELECT id, questao_id AS "questaoId", texto, correta, comentario, ordem
       FROM alternativa WHERE questao_id = ANY($1::bigint[]) ORDER BY ordem, id`,
    [questoes.map((q) => q.id)],
  );

  return questoes.map((q) => ({
    ...q,
    alternativas: alternativas.filter((a) => a.questaoId === q.id),
  })) as QuestaoAdmin[];
}

export interface DadosQuestao {
  tipo: TipoQuestao; enunciado: string; origem: string; dificuldade: string; ordem: number;
  alternativas: { texto: string; correta: boolean; comentario: string }[];
}

function validarQuestao(d: DadosQuestao) {
  if (d.enunciado.trim().length < 15) throw new Error('o enunciado está curto demais');
  const uteis = d.alternativas.filter((a) => a.texto.trim());
  if (uteis.length < 2) throw new Error('a questão precisa de pelo menos duas alternativas');
  const corretas = uteis.filter((a) => a.correta).length;
  if (corretas !== 1) throw new Error('marque exatamente uma alternativa correta');
  // §5.3 é explícito: comentário em TODA alternativa, não só na correta.
  // É o que transforma o exercício em estudo em vez de acerto ou erro.
  const semComentario = uteis.filter((a) => a.comentario.trim().length < 10);
  if (semComentario.length) {
    throw new Error(
      `toda alternativa precisa de comentário (§5.3) — faltam ${semComentario.length}`,
    );
  }
}

/**
 * Salva a questão inteira: enunciado e alternativas, de uma vez.
 *
 * Alternativa não tem vida própria — ela só existe dentro de uma questão,
 * e "uma correta" é invariante do conjunto. Salvar em partes deixaria a
 * questão passar por estados inválidos (nenhuma correta, duas corretas)
 * que o aluno poderia ver se a página carregasse no meio.
 */
export async function salvarQuestao(
  ator: string, portalId: number, aulaId: number, questaoId: number | null, d: DadosQuestao,
) {
  return salvarQuestaoDe(ator, portalId, { aulaId }, questaoId, d);
}

/**
 * De quem é a questão: do exercício de uma aula (§5.3) ou da avaliação
 * final de uma trilha de empresa (§5.11). `questao_um_dono` no banco
 * garante que é um ou outro; aqui a diferença é só a coluna que se
 * preenche — o formulário, as alternativas e a regra do comentário são
 * os mesmos, e é por isso que não nasceu um segundo editor de questões.
 */
export type DonoQuestao = { aulaId: number } | { avaliacaoId: number };

async function resolverDono(exec: Exec, portalId: number, dono: DonoQuestao) {
  if ('aulaId' in dono) {
    const [a] = await exec<{ id: number }>(
      'SELECT id FROM aula WHERE id = $1 AND portal_id = $2', [dono.aulaId, portalId],
    );
    if (!a) throw new Error('aula não encontrada neste portal');
    // O exercício é criado sob demanda: uma aula sem questão não precisa
    // de linha em `exercicio`, e a chave única por aula garante uma só.
    const [ex] = await exec<{ id: number }>(
      `INSERT INTO exercicio (aula_id) VALUES ($1)
       ON CONFLICT (aula_id) DO UPDATE SET aula_id = EXCLUDED.aula_id
       RETURNING id`,
      [dono.aulaId],
    );
    return { coluna: 'exercicio_id', id: ex.id, rotulo: 'nesta aula' };
  }
  const [av] = await exec<{ id: number }>(
    'SELECT id FROM avaliacao WHERE id = $1 AND portal_id = $2', [dono.avaliacaoId, portalId],
  );
  if (!av) throw new Error('avaliação não encontrada neste portal');
  return { coluna: 'avaliacao_id', id: av.id, rotulo: 'nesta avaliação' };
}

export async function salvarQuestaoDe(
  ator: string, portalId: number, dono: DonoQuestao, questaoId: number | null, d: DadosQuestao,
) {
  validarQuestao(d);
  const uteis = d.alternativas.filter((a) => a.texto.trim());

  return emTransacao(async (exec) => {
    const alvo = await resolverDono(exec, portalId, dono);

    let id = questaoId;
    if (id) {
      const [q] = await exec<{ id: number }>(
        `UPDATE questao SET tipo=$3, enunciado=$4, origem=$5, dificuldade=$6, ordem=$7
          WHERE id = $1 AND ${alvo.coluna} = $2 RETURNING id`,
        [id, alvo.id, d.tipo, d.enunciado.trim(), d.origem.trim() || 'autoral',
         d.dificuldade.trim() || 'introdutorio', d.ordem],
      );
      if (!q) throw new Error(`questão não encontrada ${alvo.rotulo}`);
    } else {
      const [nova] = await exec<{ id: number }>(
        `INSERT INTO questao (${alvo.coluna}, tipo, enunciado, origem, dificuldade, ordem)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [alvo.id, d.tipo, d.enunciado.trim(), d.origem.trim() || 'autoral',
         d.dificuldade.trim() || 'introdutorio', d.ordem],
      );
      id = nova.id;
    }

    // As alternativas existentes são REAPROVEITADAS por posição, não
    // apagadas e recriadas. O motivo é uma seta do schema: `resposta`
    // aponta para `alternativa` SEM `ON DELETE CASCADE` (db/001). Apagar
    // o conjunto quebraria a edição de qualquer questão que algum aluno
    // já tenha respondido — e o erro apareceria como violação de chave
    // estrangeira, no dia em que a questão mais precisasse de correção.
    const existentes = await exec<{ id: number }>(
      'SELECT id FROM alternativa WHERE questao_id = $1 ORDER BY ordem, id', [id],
    );

    for (const [i, alt] of uteis.entries()) {
      const reaproveitar = existentes[i];
      if (reaproveitar) {
        await exec(
          `UPDATE alternativa SET texto=$2, correta=$3, comentario=$4, ordem=$5 WHERE id=$1`,
          [reaproveitar.id, alt.texto.trim(), alt.correta, alt.comentario.trim(), i],
        );
      } else {
        await exec(
          `INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
           VALUES ($1,$2,$3,$4,$5)`,
          [id, alt.texto.trim(), alt.correta, alt.comentario.trim(), i],
        );
      }
    }

    // Sobrou alternativa? Só sai a que ninguém escolheu. Quem já foi
    // respondida é histórico do aluno (§12) — a saída é editar o texto,
    // não apagar a linha por baixo de quem respondeu.
    const sobrando = existentes.slice(uteis.length).map((a) => a.id);
    if (sobrando.length) {
      const [uso] = await exec<{ total: number }>(
        'SELECT count(*)::int AS total FROM resposta WHERE alternativa_id = ANY($1::bigint[])',
        [sobrando],
      );
      if (uso.total > 0) {
        throw new Error(
          'não dá para remover alternativa que alunos já escolheram — edite o texto dela',
        );
      }
      await exec('DELETE FROM alternativa WHERE id = ANY($1::bigint[])', [sobrando]);
    }

    await auditar(exec, ator, questaoId ? 'questao.editada' : 'questao.criada', 'questao', id, {
      portalId, ...dono, alternativas: uteis.length,
    });
    return id;
  });
}

export async function excluirQuestao(ator: string, portalId: number, aulaId: number, id: number) {
  return excluirQuestaoDe(ator, portalId, { aulaId }, id);
}

export async function excluirQuestaoDe(
  ator: string, portalId: number, dono: DonoQuestao, id: number,
) {
  return emTransacao(async (exec) => {
    const [q] = 'aulaId' in dono
      ? await exec<{ id: number }>(
        `SELECT q.id FROM questao q
           JOIN exercicio e ON e.id = q.exercicio_id
           JOIN aula a ON a.id = e.aula_id
          WHERE q.id = $1 AND e.aula_id = $2 AND a.portal_id = $3`,
        [id, dono.aulaId, portalId],
      )
      : await exec<{ id: number }>(
        `SELECT q.id FROM questao q
           JOIN avaliacao av ON av.id = q.avaliacao_id
          WHERE q.id = $1 AND av.id = $2 AND av.portal_id = $3`,
        [id, dono.avaliacaoId, portalId],
      );
    if (!q) throw new Error('questão não encontrada aqui');

    // `resposta.questao_id` tem ON DELETE CASCADE: apagar a questão
    // levaria junto o histórico de quem a respondeu, e o caderno de erros
    // do aluno perderia linhas sem aviso. Questão respondida se arquiva
    // editando — excluir fica reservado ao engano recém-cometido.
    const [uso] = await exec<{ total: number }>(
      'SELECT count(*)::int AS total FROM resposta WHERE questao_id = $1', [id],
    );
    if (uso.total > 0) {
      throw new Error(
        `${uso.total} aluno(s) já responderam a esta questão — excluir apagaria o histórico deles`,
      );
    }
    await exec('DELETE FROM questao WHERE id = $1', [id]);
    await auditar(exec, ator, 'questao.excluida', 'questao', id, { portalId, ...dono });
  });
}

/** As questões de uma avaliação final (§5.11), na mesma forma das do exercício. */
export async function questoesDaAvaliacao(portalId: number, avaliacaoId: number) {
  const questoes = await query<Omit<QuestaoAdmin, 'alternativas'>>(
    `SELECT q.id, q.tipo, q.enunciado, q.origem, q.dificuldade, q.ordem
       FROM questao q JOIN avaliacao av ON av.id = q.avaliacao_id
      WHERE q.avaliacao_id = $2 AND av.portal_id = $1
      ORDER BY q.ordem, q.id`,
    [portalId, avaliacaoId],
  );
  if (questoes.length === 0) return [];
  const alternativas = await query<{
    id: number; questaoId: number; texto: string; correta: boolean;
    comentario: string; ordem: number;
  }>(
    `SELECT id, questao_id AS "questaoId", texto, correta, comentario, ordem
       FROM alternativa WHERE questao_id = ANY($1::bigint[]) ORDER BY ordem, id`,
    [questoes.map((q) => q.id)],
  );
  return questoes.map((q) => ({
    ...q, alternativas: alternativas.filter((a) => a.questaoId === q.id),
  })) as QuestaoAdmin[];
}
