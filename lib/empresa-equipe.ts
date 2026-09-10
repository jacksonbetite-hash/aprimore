import { createHash, randomBytes } from 'node:crypto';
import { query, queryOne } from './db.ts';
import { emTransacao, auditar, type Exec } from './auditoria.ts';
import { revogarSessoesDo, garantirConta } from './auth.ts';
import { exigirVaga } from './empresa.ts';

/**
 * A equipe do Portal da Empresa — §5.11, etapa 4: setores, colaboradores,
 * convites por link e a ATRIBUIÇÃO de trilhas.
 *
 * A distinção que sustenta o módulo: a atribuição é a INTENÇÃO do RH
 * ("o setor Vendas faz a trilha de LGPD até 30/10"); a licença B2B é a
 * MATERIALIZAÇÃO por pessoa. O motor de acesso (§6.3) não muda — para
 * ele, licença de origem B2B é licença plena da matéria, como uma compra.
 * Tudo o que este arquivo faz é manter as duas coisas em sincronia:
 * pessoa nova no setor recebe as atribuições do setor; atribuição
 * removida cancela as licenças que ela criou (e só elas — `licenca.
 * atribuicao_id`, db/038).
 *
 * Quem é colaborador: `usuario` com papel 'aluno' DENTRO do portal da
 * empresa. Não há papel novo — as consultas de progresso, sessão e
 * licença já filtram por aluno e por portal.
 */

// ---------------------------------------------------------------------
// Setores
// ---------------------------------------------------------------------

export interface Setor { id: number; nome: string; ordem: number; pessoas: number }

export function listarSetores(portalId: number) {
  return query<Setor>(
    `SELECT s.id::int AS id, s.nome, s.ordem,
            (SELECT count(*)::int FROM usuario u
              WHERE u.setor_id = s.id AND u.status_conta <> 'ENCERRADA') AS pessoas
       FROM setor s WHERE s.portal_id = $1 ORDER BY s.ordem, s.nome`,
    [portalId],
  );
}

export async function salvarSetor(
  ator: string, portalId: number, id: number | null, nome: string, ordem: number,
) {
  const limpo = nome.trim();
  if (limpo.length < 2) throw new Error('dê um nome ao setor');
  return emTransacao(async (exec) => {
    if (id) {
      const [s] = await exec<{ id: number }>(
        `UPDATE setor SET nome = $3, ordem = $4 WHERE id = $1 AND portal_id = $2 RETURNING id`,
        [id, portalId, limpo, ordem],
      );
      if (!s) throw new Error('setor não encontrado');
      await auditar(exec, ator, 'empresa.setor.editado', 'setor', id, { portalId, nome: limpo });
      return id;
    }
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO setor (portal_id, nome, ordem) VALUES ($1, $2, $3)
       ON CONFLICT (portal_id, nome) DO NOTHING RETURNING id::int AS id`,
      [portalId, limpo, ordem],
    );
    if (!novo) throw new Error(`já existe um setor chamado ${limpo}`);
    await auditar(exec, ator, 'empresa.setor.criado', 'setor', novo.id, { portalId, nome: limpo });
    return novo.id;
  });
}

export async function excluirSetor(ator: string, portalId: number, id: number) {
  await emTransacao(async (exec) => {
    const [s] = await exec<{ nome: string; pessoas: number; atribuicoes: number }>(
      `SELECT nome,
              (SELECT count(*)::int FROM usuario WHERE setor_id = $1) AS pessoas,
              (SELECT count(*)::int FROM atribuicao WHERE alvo_setor_id = $1) AS atribuicoes
         FROM setor WHERE id = $1 AND portal_id = $2`,
      [id, portalId],
    );
    if (!s) throw new Error('setor não encontrado');
    if (s.pessoas > 0) throw new Error(`${s.pessoas} pessoa(s) estão no setor ${s.nome} — mova antes`);
    if (s.atribuicoes > 0) throw new Error(`o setor ${s.nome} tem trilha atribuída — remova a atribuição antes`);
    await exec('DELETE FROM setor WHERE id = $1 AND portal_id = $2', [id, portalId]);
    await auditar(exec, ator, 'empresa.setor.excluido', 'setor', id, { portalId, nome: s.nome });
  });
}

// ---------------------------------------------------------------------
// A materialização: atribuição → licença B2B por pessoa
// ---------------------------------------------------------------------

/** Até quando vale a licença B2B: o contrato é mensal e renovável, então dois anos, e a atribuição removida cancela. */
const VIGENCIA_B2B = '2 years';

/**
 * Cria a licença de UMA atribuição para as pessoas que ela alcança —
 * a pessoa-alvo, ou todo mundo ativo do setor-alvo. Idempotente: o índice
 * `licenca_b2b_por_atribuicao` faz o INSERT repetido virar nada.
 */
async function materializarAtribuicao(exec: Exec, portalId: number, atribuicaoId: number) {
  const [r] = await exec<{ n: number }>(
    `WITH alvo AS (
       SELECT u.id AS usuario_id, at.materia_id, at.id AS atribuicao_id
         FROM atribuicao at
         JOIN usuario u ON u.portal_id = at.portal_id AND u.papel = 'aluno'
                       AND u.status_conta <> 'ENCERRADA'
                       AND (u.id = at.alvo_usuario_id OR u.setor_id = at.alvo_setor_id)
        WHERE at.id = $2 AND at.portal_id = $1),
     inseridas AS (
       INSERT INTO licenca (usuario_id, portal_id, escopo, materia_id, origem, status,
                            inicio_em, fim_em, materia_portal_id, atribuicao_id)
       SELECT usuario_id, $1, 'MATERIA', materia_id, 'B2B', 'ATIVA',
              now(), now() + interval '${VIGENCIA_B2B}', $1, atribuicao_id
         FROM alvo
       ON CONFLICT DO NOTHING
       RETURNING id)
     SELECT count(*)::int AS n FROM inseridas`,
    [portalId, atribuicaoId],
  );
  return r.n;
}

/**
 * O caminho inverso: uma PESSOA acabou de chegar (cadastro, convite,
 * autocadastro, troca de setor) e recebe tudo o que já estava atribuído a
 * ela ou ao setor dela.
 */
async function materializarParaPessoa(exec: Exec, portalId: number, usuarioId: number) {
  const [r] = await exec<{ n: number }>(
    `WITH alvo AS (
       SELECT u.id AS usuario_id, at.materia_id, at.id AS atribuicao_id
         FROM usuario u
         JOIN atribuicao at ON at.portal_id = u.portal_id
                           AND (at.alvo_usuario_id = u.id OR at.alvo_setor_id = u.setor_id)
        WHERE u.id = $2 AND u.portal_id = $1 AND u.status_conta <> 'ENCERRADA'),
     inseridas AS (
       INSERT INTO licenca (usuario_id, portal_id, escopo, materia_id, origem, status,
                            inicio_em, fim_em, materia_portal_id, atribuicao_id)
       SELECT usuario_id, $1, 'MATERIA', materia_id, 'B2B', 'ATIVA',
              now(), now() + interval '${VIGENCIA_B2B}', $1, atribuicao_id
         FROM alvo
       ON CONFLICT DO NOTHING
       RETURNING id)
     SELECT count(*)::int AS n FROM inseridas`,
    [portalId, usuarioId],
  );
  return r.n;
}

// ---------------------------------------------------------------------
// Colaboradores
// ---------------------------------------------------------------------

export interface Colaborador {
  id: number; nome: string; email: string; matricula: string | null;
  setorId: number | null; setorNome: string | null;
  statusConta: string; criadoEm: Date; ultimoLoginEm: Date | null;
  /** Trilhas liberadas (licenças B2B vivas) e trilhas concluídas. */
  trilhas: number; concluidas: number;
}

const CAMPOS_COLABORADOR = `
  u.id::int AS id, u.nome, u.email, u.matricula,
  u.setor_id::int AS "setorId", s.nome AS "setorNome",
  u.status_conta AS "statusConta", u.criado_em AS "criadoEm",
  u.ultimo_login_em AS "ultimoLoginEm",
  (SELECT count(DISTINCT l.materia_id)::int FROM licenca l
    WHERE l.usuario_id = u.id AND l.origem = 'B2B' AND l.status = 'ATIVA') AS trilhas,
  (SELECT count(*)::int FROM conclusao c WHERE c.usuario_id = u.id) AS concluidas
`;

export function listarColaboradores(portalId: number, busca = '', setorId: number | null = null) {
  return query<Colaborador>(
    `SELECT ${CAMPOS_COLABORADOR}
       FROM usuario u LEFT JOIN setor s ON s.id = u.setor_id
      WHERE u.portal_id = $1 AND u.papel = 'aluno'
        AND ($2 = '' OR u.nome ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%'
             OR coalesce(u.matricula, '') ILIKE '%' || $2 || '%')
        AND ($3::bigint IS NULL OR u.setor_id = $3)
      ORDER BY (u.status_conta = 'ENCERRADA'), u.nome
      LIMIT 500`,
    [portalId, busca.trim(), setorId],
  );
}

export function buscarColaborador(portalId: number, id: number) {
  return queryOne<Colaborador>(
    `SELECT ${CAMPOS_COLABORADOR}
       FROM usuario u LEFT JOIN setor s ON s.id = u.setor_id
      WHERE u.portal_id = $1 AND u.papel = 'aluno' AND u.id = $2`,
    [portalId, id],
  );
}

export interface DadosColaborador {
  nome: string; email: string; setorId: number | null; matricula: string;
}

async function conferirSetor(exec: Exec, portalId: number, setorId: number | null) {
  if (setorId === null) return;
  const [s] = await exec('SELECT 1 FROM setor WHERE id = $1 AND portal_id = $2', [setorId, portalId]);
  if (!s) throw new Error('esse setor não é deste portal');
}

/**
 * Cadastro individual (nome, e-mail, setor, matrícula) com senha
 * provisória — o mesmo compromisso honesto do gestor (FormGestor):
 * enquanto o sistema não envia e-mail, quem cadastra vê a senha e a
 * passa por um canal seguro. O convite por link é a alternativa em que a
 * própria pessoa escolhe a senha.
 *
 * A conta nasce DENTRO do portal da empresa (portal_id = portal), o que
 * a isola da plataforma: o mesmo e-mail pode ser aluno lá e colaborador
 * aqui, sem que um veja o outro (§5.10).
 */
export async function cadastrarColaborador(
  ator: string, portalId: number, d: DadosColaborador, senhaHash: string,
) {
  const nome = d.nome.trim().slice(0, 120);
  const email = d.email.trim().toLowerCase();
  if (nome.length < 2) throw new Error('diga o nome da pessoa');
  return emTransacao(async (exec) => {
    await exigirVaga(portalId);
    await conferirSetor(exec, portalId, d.setorId);
    // A credencial é global (db/045): e-mail que já tem conta em outro
    // portal ganha só o PERFIL aqui, e entra com a senha que já usa — a
    // provisória informada é ignorada. A tela diz isso ao RH.
    const conta = await garantirConta(exec, { nome, email, senhaHash });
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel, setor_id, matricula)
       VALUES ($1, $2, $3, $4, 'aluno', $5, $6)
       ON CONFLICT (portal_id, lower(email)) DO NOTHING
       RETURNING id::int AS id`,
      [portalId, conta.id, nome, email, d.setorId, d.matricula.trim() || null],
    );
    if (!novo) throw new Error(`${email} já tem conta neste portal`);
    const trilhas = await materializarParaPessoa(exec, portalId, novo.id);
    await auditar(exec, ator, 'empresa.colaborador.cadastrado', 'usuario', novo.id,
      { portalId, email, setorId: d.setorId, trilhasLiberadas: trilhas, ligadoAExistente: conta.existia });
    return { id: novo.id, trilhas, ligadoAExistente: conta.existia };
  });
}

/**
 * Editar nome, setor e matrícula. Trocar de setor troca as trilhas:
 * as do setor antigo saem (só as que vieram DELE — a atribuição nominal
 * fica), as do setor novo entram.
 */
export async function editarColaborador(
  ator: string, portalId: number, id: number, d: Omit<DadosColaborador, 'email'>,
) {
  const nome = d.nome.trim().slice(0, 120);
  if (nome.length < 2) throw new Error('diga o nome da pessoa');
  await emTransacao(async (exec) => {
    await conferirSetor(exec, portalId, d.setorId);
    const [antes] = await exec<{ setorId: number | null }>(
      `SELECT setor_id::int AS "setorId" FROM usuario
        WHERE id = $1 AND portal_id = $2 AND papel = 'aluno' FOR UPDATE`, [id, portalId],
    );
    if (!antes) throw new Error('colaborador não encontrado');
    await exec(
      `UPDATE usuario SET nome = $3, setor_id = $4, matricula = $5 WHERE id = $1 AND portal_id = $2`,
      [id, portalId, nome, d.setorId, d.matricula.trim() || null],
    );
    if (antes.setorId !== d.setorId) {
      // Licenças que vieram do setor antigo caem; as nominais ficam.
      await exec(
        `UPDATE licenca SET status = 'CANCELADA', atualizada_em = now()
          WHERE usuario_id = $1 AND status = 'ATIVA'
            AND atribuicao_id IN (SELECT id FROM atribuicao WHERE alvo_setor_id = $2)`,
        [id, antes.setorId],
      );
      await materializarParaPessoa(exec, portalId, id);
    }
    await auditar(exec, ator, 'empresa.colaborador.editado', 'usuario', id,
      { portalId, setorId: d.setorId, setorAnterior: antes.setorId });
  });
}

/**
 * Desativar libera a vaga no teto e fecha a porta na hora: a sessão cai
 * e o login passa a recusar (status ENCERRADA — o mesmo que o §6.4 usa
 * para conta encerrada). O progresso fica: quem volta, volta de onde
 * parou. Reativar passa pelo teto de novo, para que "desativa e reativa"
 * não seja um jeito de furar o plano.
 */
export async function desativarColaborador(ator: string, portalId: number, id: number) {
  await emTransacao(async (exec) => {
    const [u] = await exec<{ id: number }>(
      `UPDATE usuario SET status_conta = 'ENCERRADA'
        WHERE id = $1 AND portal_id = $2 AND papel = 'aluno' RETURNING id`, [id, portalId],
    );
    if (!u) throw new Error('colaborador não encontrado');
    await auditar(exec, ator, 'empresa.colaborador.desativado', 'usuario', id, { portalId });
  });
  await revogarSessoesDo(id);
}

export async function reativarColaborador(ator: string, portalId: number, id: number) {
  await emTransacao(async (exec) => {
    await exigirVaga(portalId);
    const [u] = await exec<{ id: number }>(
      `UPDATE usuario SET status_conta = 'ATIVA'
        WHERE id = $1 AND portal_id = $2 AND papel = 'aluno' AND status_conta = 'ENCERRADA'
        RETURNING id`, [id, portalId],
    );
    if (!u) throw new Error('colaborador não encontrado, ou já está ativo');
    await materializarParaPessoa(exec, portalId, id);
    await auditar(exec, ator, 'empresa.colaborador.reativado', 'usuario', id, { portalId });
  });
}

// ---------------------------------------------------------------------
// Atribuições
// ---------------------------------------------------------------------

export interface Atribuicao {
  id: number; materiaId: number; materiaNome: string;
  alvoUsuarioId: number | null; alvoNome: string | null;
  alvoSetorId: number | null; setorNome: string | null;
  obrigatoria: boolean; prazoEm: Date | null; criadaEm: Date; criadaPor: string;
  /** Quantas pessoas têm licença viva por esta atribuição. */
  pessoas: number;
}

export function listarAtribuicoes(portalId: number) {
  return query<Atribuicao>(
    `SELECT at.id::int AS id, at.materia_id::int AS "materiaId", m.nome AS "materiaNome",
            at.alvo_usuario_id::int AS "alvoUsuarioId", u.nome AS "alvoNome",
            at.alvo_setor_id::int AS "alvoSetorId", s.nome AS "setorNome",
            at.obrigatoria, at.prazo_em AS "prazoEm", at.criada_em AS "criadaEm",
            at.criada_por AS "criadaPor",
            (SELECT count(*)::int FROM licenca l
              WHERE l.atribuicao_id = at.id AND l.status = 'ATIVA') AS pessoas
       FROM atribuicao at
       JOIN materia m ON m.id = at.materia_id
       LEFT JOIN usuario u ON u.id = at.alvo_usuario_id
       LEFT JOIN setor s ON s.id = at.alvo_setor_id
      WHERE at.portal_id = $1
      ORDER BY at.criada_em DESC`,
    [portalId],
  );
}

export interface DadosAtribuicao {
  materiaId: number;
  usuarioId: number | null;
  setorId: number | null;
  obrigatoria: boolean;
  /** AAAA-MM-DD ou vazio. */
  prazoEm: string;
}

export async function atribuirTrilha(ator: string, portalId: number, d: DadosAtribuicao) {
  if ((d.usuarioId === null) === (d.setorId === null)) {
    throw new Error('escolha UM alvo: uma pessoa ou um setor');
  }
  const prazo = d.prazoEm.trim();
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) throw new Error('prazo inválido');
  return emTransacao(async (exec) => {
    const [m] = await exec<{ id: number; status: string }>(
      'SELECT id, status FROM materia WHERE id = $1 AND portal_id = $2', [d.materiaId, portalId],
    );
    if (!m) throw new Error('essa trilha não é deste portal');
    if (d.usuarioId !== null) {
      const [u] = await exec(
        `SELECT 1 FROM usuario WHERE id = $1 AND portal_id = $2 AND papel = 'aluno'`,
        [d.usuarioId, portalId]);
      if (!u) throw new Error('essa pessoa não é colaboradora deste portal');
    }
    await conferirSetor(exec, portalId, d.setorId);

    const [nova] = await exec<{ id: number }>(
      `INSERT INTO atribuicao (portal_id, materia_id, alvo_usuario_id, alvo_setor_id,
                               obrigatoria, prazo_em, criada_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING RETURNING id::int AS id`,
      [portalId, d.materiaId, d.usuarioId, d.setorId, d.obrigatoria, prazo || null, ator],
    );
    if (!nova) throw new Error('essa trilha já está atribuída a esse alvo');
    const pessoas = await materializarAtribuicao(exec, portalId, nova.id);
    await auditar(exec, ator, 'empresa.atribuicao.criada', 'atribuicao', nova.id,
      { portalId, materiaId: d.materiaId, usuarioId: d.usuarioId, setorId: d.setorId, pessoas });
    return { id: nova.id, pessoas, trilhaPublicada: m.status === 'publicado' };
  });
}

/** Remover a atribuição cancela as licenças que ELA criou — e só elas. */
export async function removerAtribuicao(ator: string, portalId: number, id: number) {
  await emTransacao(async (exec) => {
    const [at] = await exec<{ id: number }>(
      'SELECT id FROM atribuicao WHERE id = $1 AND portal_id = $2', [id, portalId],
    );
    if (!at) throw new Error('atribuição não encontrada');
    const [n] = await exec<{ n: number }>(
      `WITH c AS (UPDATE licenca SET status = 'CANCELADA', atualizada_em = now()
                   WHERE atribuicao_id = $1 AND status = 'ATIVA' RETURNING id)
       SELECT count(*)::int AS n FROM c`, [id],
    );
    await exec('DELETE FROM atribuicao WHERE id = $1', [id]);
    await auditar(exec, ator, 'empresa.atribuicao.removida', 'atribuicao', id,
      { portalId, licencasCanceladas: n.n });
  });
}

// ---------------------------------------------------------------------
// Convites por link
// ---------------------------------------------------------------------

export const DIAS_CONVITE = 7;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface Convite {
  id: number; email: string; nome: string | null; setorNome: string | null;
  trilhas: number; prazoDias: number | null; criadoEm: Date; expiraEm: Date;
  aceitoEm: Date | null; canceladoEm: Date | null; criadoPor: string;
  situacao: 'pendente' | 'aceito' | 'expirado' | 'cancelado';
}

export function listarConvites(portalId: number) {
  return query<Convite>(
    `SELECT c.id::int AS id, c.email, c.nome, s.nome AS "setorNome",
            cardinality(c.trilhas) AS trilhas, c.prazo_dias AS "prazoDias",
            c.criado_em AS "criadoEm", c.expira_em AS "expiraEm", c.aceito_em AS "aceitoEm",
            c.cancelado_em AS "canceladoEm", c.criado_por AS "criadoPor",
            CASE WHEN c.aceito_em IS NOT NULL THEN 'aceito'
                 WHEN c.cancelado_em IS NOT NULL THEN 'cancelado'
                 WHEN c.expira_em < now() THEN 'expirado'
                 ELSE 'pendente' END AS situacao
       FROM convite c LEFT JOIN setor s ON s.id = c.setor_id
      WHERE c.portal_id = $1
      ORDER BY c.criado_em DESC LIMIT 300`,
    [portalId],
  );
}

export interface DadosConvite {
  email: string; nome: string; setorId: number | null; trilhas: number[]; prazoDias: number | null;
}

/**
 * O convite é um LINK com token: o banco guarda só o hash (como a
 * sessão, §10), e o token inteiro só existe no momento em que o gestor
 * copia o link. Perdeu? Cancela e faz outro. Conta contra o teto desde
 * já: convite pendente que não cabe no plano é frustração agendada.
 */
export async function criarConvite(ator: string, portalId: number, d: DadosConvite) {
  const email = d.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('e-mail inválido');
  if (d.prazoDias !== null && (!Number.isInteger(d.prazoDias) || d.prazoDias < 1)) {
    throw new Error('prazo em dias inválido');
  }
  return emTransacao(async (exec) => {
    const pendentes = await exec<{ n: number }>(
      `SELECT count(*)::int AS n FROM convite
        WHERE portal_id = $1 AND aceito_em IS NULL AND cancelado_em IS NULL AND expira_em > now()`,
      [portalId],
    );
    await exigirVaga(portalId, pendentes[0].n + 1);
    await conferirSetor(exec, portalId, d.setorId);
    const [ja] = await exec(
      `SELECT 1 FROM usuario WHERE portal_id = $1 AND lower(email) = $2`, [portalId, email]);
    if (ja) throw new Error(`${email} já tem conta neste portal`);
    if (d.trilhas.length) {
      const [ok] = await exec<{ n: number }>(
        `SELECT count(*)::int AS n FROM materia WHERE portal_id = $1 AND id = ANY($2::bigint[])`,
        [portalId, d.trilhas]);
      if (ok.n !== d.trilhas.length) throw new Error('uma das trilhas não é deste portal');
    }

    const token = randomBytes(24).toString('base64url');
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO convite (portal_id, email, nome, setor_id, token_hash, trilhas, prazo_dias,
                            criado_por, expira_em)
       VALUES ($1, $2, $3, $4, $5, $6::bigint[], $7, $8, now() + interval '${DIAS_CONVITE} days')
       ON CONFLICT DO NOTHING RETURNING id::int AS id`,
      [portalId, email, d.nome.trim() || null, d.setorId, hashToken(token), d.trilhas,
       d.prazoDias, ator],
    );
    if (!novo) throw new Error(`já existe um convite pendente para ${email}`);
    await auditar(exec, ator, 'empresa.convite.criado', 'convite', novo.id,
      { portalId, email, trilhas: d.trilhas.length });
    return { id: novo.id, token };
  });
}

export async function cancelarConvite(ator: string, portalId: number, id: number) {
  await emTransacao(async (exec) => {
    const [c] = await exec<{ id: number }>(
      `UPDATE convite SET cancelado_em = now()
        WHERE id = $1 AND portal_id = $2 AND aceito_em IS NULL AND cancelado_em IS NULL
        RETURNING id`, [id, portalId],
    );
    if (!c) throw new Error('convite não encontrado, ou já aceito');
    await auditar(exec, ator, 'empresa.convite.cancelado', 'convite', id, { portalId });
  });
}

export interface ConviteAberto {
  id: number; email: string; nome: string | null; setorNome: string | null;
  empresaNome: string; trilhas: string[];
  situacao: 'pendente' | 'aceito' | 'expirado' | 'cancelado';
}

/** O que a página /convite/[token] mostra — sem aceitar nada ainda. */
export function lerConvite(portalId: number, token: string) {
  return queryOne<ConviteAberto>(
    `SELECT c.id::int AS id, c.email, c.nome, s.nome AS "setorNome",
            p.nome_exibicao AS "empresaNome",
            coalesce((SELECT array_agg(m.nome ORDER BY m.nome) FROM materia m
                       WHERE m.id = ANY(c.trilhas)), '{}') AS trilhas,
            CASE WHEN c.aceito_em IS NOT NULL THEN 'aceito'
                 WHEN c.cancelado_em IS NOT NULL THEN 'cancelado'
                 WHEN c.expira_em < now() THEN 'expirado'
                 ELSE 'pendente' END AS situacao
       FROM convite c
       JOIN portal p ON p.id = c.portal_id
       LEFT JOIN setor s ON s.id = c.setor_id
      WHERE c.portal_id = $1 AND c.token_hash = $2`,
    [portalId, hashToken(token)],
  );
}

/**
 * Aceitar: cria a conta NAQUELE e-mail (o convite é nominal — o token
 * compartilhado com quem não devia não vira conta de outro), marca o
 * convite, e libera as trilhas: as do setor, por materialização, e as do
 * próprio convite, como atribuições nominais com o prazo pedido.
 */
export async function aceitarConvite(
  portalId: number, token: string, nome: string, senhaHash: string,
) {
  const limpo = nome.trim().slice(0, 120);
  if (limpo.length < 2) throw new Error('diga como podemos te chamar');
  return emTransacao(async (exec) => {
    const [c] = await exec<{
      id: number; email: string; setorId: number | null; trilhas: number[];
      prazoDias: number | null; aceitoEm: Date | null; canceladoEm: Date | null; expirado: boolean;
    }>(
      `SELECT id::int AS id, email, setor_id::int AS "setorId", trilhas,
              prazo_dias AS "prazoDias", aceito_em AS "aceitoEm",
              cancelado_em AS "canceladoEm", expira_em < now() AS expirado
         FROM convite WHERE portal_id = $1 AND token_hash = $2 FOR UPDATE`,
      [portalId, hashToken(token)],
    );
    if (!c) throw new Error('convite não encontrado neste portal');
    if (c.aceitoEm) throw new Error('este convite já foi usado — entre com a sua senha');
    if (c.canceladoEm) throw new Error('este convite foi cancelado pela empresa');
    if (c.expirado) throw new Error('este convite expirou — peça um novo ao RH');
    await exigirVaga(portalId);

    // Conta global (db/045): quem já tem conta com este e-mail ganha o
    // perfil e continua com a senha que já usa; a que escolheu aqui só
    // vale quando a conta é nova (ou ainda não tinha senha).
    const conta = await garantirConta(exec, { nome: limpo, email: c.email, senhaHash });
    const [u] = await exec<{ id: number }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel, setor_id)
       VALUES ($1, $2, $3, $4, 'aluno', $5)
       ON CONFLICT (portal_id, lower(email)) DO NOTHING RETURNING id::int AS id`,
      [portalId, conta.id, limpo, c.email, c.setorId],
    );
    if (!u) throw new Error(`${c.email} já tem conta neste portal — entre com a sua senha`);
    await exec(`UPDATE convite SET aceito_em = now(), usuario_id = $2 WHERE id = $1`, [c.id, u.id]);

    for (const materiaId of c.trilhas) {
      await exec(
        `INSERT INTO atribuicao (portal_id, materia_id, alvo_usuario_id, obrigatoria, prazo_em, criada_por)
         VALUES ($1, $2, $3, true,
                 CASE WHEN $4::int IS NULL THEN NULL ELSE current_date + $4::int END, $5)
         ON CONFLICT DO NOTHING`,
        [portalId, materiaId, u.id, c.prazoDias, `convite:${c.email}`],
      );
    }
    const trilhas = await materializarParaPessoa(exec, portalId, u.id);
    await auditar(exec, `convite:${c.email}`, 'empresa.convite.aceito', 'usuario', u.id,
      { portalId, conviteId: c.id, trilhasLiberadas: trilhas, ligadoAExistente: conta.existia });
    return { usuarioId: u.id, trilhas, ligadoAExistente: conta.existia && conta.temSenha };
  });
}

// ---------------------------------------------------------------------
// Importação em lote (CSV → convites)
// ---------------------------------------------------------------------

export interface LinhaImportada {
  linha: number; nome: string; email: string; setor: string;
  erro?: string; token?: string;
}

/**
 * Lê "nome;email;setor" (ou com vírgula/tab; cabeçalho opcional). É
 * função pura: quem chama decide o que fazer com as linhas boas.
 */
export function lerCsvDeColaboradores(texto: string): LinhaImportada[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const saida: LinhaImportada[] = [];
  linhas.forEach((bruta, i) => {
    const partes = bruta.split(/[;,\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
    const [nome = '', email = '', setor = ''] = partes;
    if (i === 0 && /^nome$/i.test(nome) && /^e-?mail$/i.test(email)) return; // cabeçalho
    const item: LinhaImportada = { linha: i + 1, nome, email: email.toLowerCase(), setor };
    if (nome.length < 2) item.erro = 'nome em branco';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(item.email)) item.erro = 'e-mail inválido';
    saida.push(item);
  });
  const vistos = new Set<string>();
  for (const l of saida) {
    if (l.erro) continue;
    if (vistos.has(l.email)) l.erro = 'e-mail repetido no arquivo';
    vistos.add(l.email);
  }
  return saida;
}

/**
 * Importar é convidar em lote: cada linha boa vira um convite por link,
 * e a pessoa escolhe a própria senha. Linha com erro é reportada e
 * pulada — a importação nunca para no meio por causa de uma linha.
 */
export async function importarConvites(
  ator: string, portalId: number, texto: string, trilhas: number[], prazoDias: number | null,
) {
  const linhas = lerCsvDeColaboradores(texto);
  if (linhas.length === 0) throw new Error('nenhuma linha para importar');
  if (linhas.length > 200) throw new Error('no máximo 200 linhas por vez');
  const setores = await listarSetores(portalId);
  const porNome = new Map(setores.map((s) => [s.nome.toLowerCase(), s.id]));
  for (const l of linhas) {
    if (l.erro) continue;
    const setorId = l.setor ? porNome.get(l.setor.toLowerCase()) ?? null : null;
    if (l.setor && setorId === null) { l.erro = `setor "${l.setor}" não existe`; continue; }
    try {
      const { token } = await criarConvite(ator, portalId,
        { email: l.email, nome: l.nome, setorId, trilhas, prazoDias });
      l.token = token;
    } catch (err) {
      l.erro = (err as Error).message;
    }
  }
  return linhas;
}

// ---------------------------------------------------------------------
// Autocadastro por domínio de e-mail (etapa 4)
// ---------------------------------------------------------------------

/**
 * A conta que a pessoa criou sozinha, por ter e-mail do domínio da
 * empresa. Sem setor: quem a encaixa é o RH, e é aí que as trilhas do
 * setor chegam. Passa pelo teto como qualquer outra.
 */
export async function autocadastrar(
  portalId: number, nome: string, email: string, senhaHash: string | null,
) {
  const limpo = email.trim().toLowerCase();
  return emTransacao(async (exec) => {
    await exigirVaga(portalId);
    // `senhaHash` nulo é o caso do login com conta que já existe (db/045):
    // a senha é a de sempre, e só o perfil neste portal nasce agora.
    const conta = await garantirConta(exec, { nome, email: limpo, senhaHash });
    if (!conta.temSenha) throw new Error('escolha uma senha para criar a conta');
    const [u] = await exec<{ id: number }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
       SELECT $1, $2, coalesce(nullif($3, ''), c.nome), $4, 'aluno' FROM conta c WHERE c.id = $2
       ON CONFLICT (portal_id, lower(email)) DO NOTHING RETURNING id::int AS id`,
      [portalId, conta.id, nome.trim().slice(0, 120), limpo],
    );
    if (!u) return null;
    await materializarParaPessoa(exec, portalId, u.id);
    await auditar(exec, limpo, 'empresa.colaborador.autocadastro', 'usuario', u.id, { portalId });
    return u.id;
  });
}
