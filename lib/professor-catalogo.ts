import { query, queryOne } from './db.ts';
import { emTransacao, auditar, type Exec } from './auditoria.ts';
import {
  garantirConta, gerarHashSenha, conferirSenha, validarEmail, validarSenha,
} from './auth.ts';
import { PORTAL_PLATAFORMA, validarCpf, validarCnpj, somenteDigitos } from './portal.ts';

/**
 * O professor SEM página própria — docs/plano-perfis-e-acessos.md, etapa 5.
 *
 * Ele não tem portal: publica os cursos dele no catálogo da plataforma
 * (portal 0), a venda é nossa, e ele recebe a comissão do contrato pela
 * apuração mensal (§5.6.1, lib/apuracao.ts, com `professor_id` como
 * dono). Três regras que este módulo sustenta:
 *
 *  1. AUTORIA: o professor só alcança curso, assunto, aula e questão que
 *     descendem de uma matéria com `professor_id` = ele. Toda ação do
 *     painel passa por `posseDaMateria`/`materiaDe` antes de tocar no
 *     banco — o `portalId` das funções de admin-cursos é sempre 0 aqui.
 *  2. PUBLICAÇÃO COM REVISÃO: ao contrário do portal (publicação direta,
 *     §5.10), no catálogo da casa o professor leva o curso até
 *     `em_revisao`; quem publica é `conteudo.agir`. As aulas ele publica
 *     — o curso só aparece quando a matéria for publicada.
 *  3. COMISSÃO GRAVADA NA VENDA: `abrirPedido` (lib/checkout.ts) carimba
 *     `pedido.professor_id` e `comissao_professor_pp` pelo contrato
 *     vigente no ato — auditar uma venda antiga não pode depender do
 *     contrato de hoje.
 */

/** Decisão pendente 3 do plano, aprovada em 10/09/2026. */
export const COMISSAO_PADRAO_PP = 40;

// ---------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------

export interface DadosCadastroProfessor {
  nome: string; email: string; senha: string;
  /** CPF ou CNPJ (decisão 4 do plano: os dois valem; CNPJ só para subconta). */
  documento: string;
  aceitouContrato: boolean;
  ip?: string;
}

/**
 * Autosserviço em /para-professores/catalogo. E-mail que já tem conta
 * (credencial global, db/045) só vira professor com a SENHA dessa conta:
 * é o que impede alguém de promover a conta alheia por um formulário
 * público. Conta de gestor, equipe ou professor de portal não passa por
 * aqui — fala com o suporte.
 */
export async function cadastrarProfessorDoCatalogo(d: DadosCadastroProfessor) {
  const nome = d.nome.trim().slice(0, 120);
  const email = d.email.trim().toLowerCase();
  if (nome.length < 2) throw new Error('Diga o seu nome.');
  const erroEmail = validarEmail(email);
  if (erroEmail) throw new Error(erroEmail);
  const erroSenha = validarSenha(d.senha);
  if (erroSenha) throw new Error(erroSenha);
  const documento = somenteDigitos(d.documento);
  if (!(validarCpf(documento) || validarCnpj(d.documento))) {
    throw new Error('Informe um CPF ou CNPJ válido — é para o contrato e para a nota do repasse.');
  }
  if (!d.aceitouContrato) throw new Error('É preciso aceitar o contrato de professor.');

  const hash = await gerarHashSenha(d.senha);
  return emTransacao(async (exec) => {
    const [existente] = await exec<{ id: number; senhaHash: string | null; documento: string | null }>(
      `SELECT id::int AS id, senha_hash AS "senhaHash", documento FROM conta WHERE lower(email) = $1`, [email],
    );
    if (existente?.senhaHash && !(await conferirSenha(d.senha, existente.senhaHash))) {
      throw new Error('Esse e-mail já tem conta. Informe a senha dela para virar professor — '
        + 'ou use outro e-mail.');
    }
    const conta = await garantirConta(exec, { nome, email, senhaHash: hash, documento });

    const [perfil] = await exec<{ id: number; papel: string }>(
      `SELECT id::int AS id, papel FROM usuario WHERE conta_id = $1 AND portal_id = ${PORTAL_PLATAFORMA}`,
      [conta.id],
    );
    let usuarioId: number;
    if (perfil) {
      if (perfil.papel === 'professor') {
        const [comPortal] = await exec('SELECT 1 FROM portal WHERE professor_id = $1 AND status <> $2', [perfil.id, 'ENCERRADO']);
        if (comPortal) throw new Error('Você já tem um portal: os cursos do catálogo se cadastram por ele.');
        const [comContrato] = await exec('SELECT 1 FROM contrato_professor WHERE usuario_id = $1 AND vigente_ate IS NULL', [perfil.id]);
        if (comContrato) throw new Error('Você já é professor do catálogo. Entre com a sua senha.');
      } else if (perfil.papel !== 'aluno') {
        throw new Error(`Esse e-mail é conta de ${perfil.papel} na plataforma. Fale com o suporte.`);
      }
      usuarioId = perfil.id;
      await exec(`UPDATE usuario SET papel = 'professor' WHERE id = $1`, [usuarioId]);
    } else {
      const [novo] = await exec<{ id: number }>(
        `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
         VALUES (${PORTAL_PLATAFORMA}, $1, $2, $3, 'professor') RETURNING id::int AS id`,
        [conta.id, nome, email],
      );
      usuarioId = novo.id;
    }

    await exec(
      `INSERT INTO contrato_professor (usuario_id, comissao_pp, vigente_de, aceito_em, aceito_ip, registrado_por)
       VALUES ($1, $2, current_date, now(), $3, $4)`,
      [usuarioId, COMISSAO_PADRAO_PP, d.ip || null, email],
    );
    await auditar(exec, email, 'professor_catalogo.cadastrado', 'usuario', usuarioId,
      { comissaoPp: COMISSAO_PADRAO_PP, contaExistia: conta.existia, promovido: Boolean(perfil) });
    return usuarioId;
  });
}

// ---------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------

export interface ContratoProfessor {
  id: number; usuarioId: number; comissaoPp: string; chavePix: string | null;
  vigenteDe: Date; vigenteAte: Date | null; aceitoEm: Date | null; registradoPor: string;
}

const CAMPOS_CONTRATO = `
  c.id::int AS id, c.usuario_id::int AS "usuarioId", c.comissao_pp AS "comissaoPp",
  c.chave_pix AS "chavePix", c.vigente_de AS "vigenteDe", c.vigente_ate AS "vigenteAte",
  c.aceito_em AS "aceitoEm", c.registrado_por AS "registradoPor"`;

export function contratoVigente(usuarioId: number) {
  return queryOne<ContratoProfessor>(
    `SELECT ${CAMPOS_CONTRATO} FROM contrato_professor c
      WHERE c.usuario_id = $1 AND c.vigente_ate IS NULL`, [usuarioId]);
}

export function historicoDeContratosDoProfessor(usuarioId: number) {
  return query<ContratoProfessor>(
    `SELECT ${CAMPOS_CONTRATO} FROM contrato_professor c
      WHERE c.usuario_id = $1 ORDER BY c.vigente_de DESC, c.id DESC`, [usuarioId]);
}

/** É professor do catálogo: conta da plataforma com contrato vigente e sem portal. */
export async function ehProfessorDoCatalogo(usuarioId: number): Promise<boolean> {
  const c = await queryOne(
    `SELECT 1 FROM contrato_professor WHERE usuario_id = $1 AND vigente_ate IS NULL`, [usuarioId]);
  return Boolean(c);
}

/**
 * Novo contrato pela retaguarda (`financeiro.agir`): encerra o vigente na
 * véspera e abre o novo — como o do portal, nunca sobrescreve. A chave
 * Pix passa para o contrato novo, porque é dado da pessoa, não do acordo.
 */
export async function registrarContratoProfessor(
  ator: string, usuarioId: number, d: { comissaoPp: number; vigenteDe: string },
) {
  if (!Number.isFinite(d.comissaoPp) || d.comissaoPp < 0 || d.comissaoPp > 100) throw new Error('percentual inválido');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.vigenteDe)) throw new Error('data de vigência inválida');
  return emTransacao(async (exec) => {
    const [u] = await exec<{ papel: string }>(
      `SELECT papel FROM usuario WHERE id = $1 AND portal_id = ${PORTAL_PLATAFORMA}`, [usuarioId]);
    if (!u) throw new Error('conta não encontrada na plataforma');
    if (u.papel !== 'professor') throw new Error('o contrato de catálogo é de conta com papel de professor');
    const [atual] = await exec<{ id: number; vigenteDe: string; chavePix: string | null }>(
      `SELECT id, to_char(vigente_de, 'YYYY-MM-DD') AS "vigenteDe", chave_pix AS "chavePix"
         FROM contrato_professor WHERE usuario_id = $1 AND vigente_ate IS NULL`, [usuarioId]);
    if (atual && d.vigenteDe <= atual.vigenteDe) {
      throw new Error(`o contrato vigente começou em ${atual.vigenteDe}; o novo precisa começar depois`);
    }
    if (atual) await exec('UPDATE contrato_professor SET vigente_ate = $2 WHERE id = $1', [atual.id, d.vigenteDe]);
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO contrato_professor (usuario_id, comissao_pp, chave_pix, vigente_de, aceito_em, registrado_por)
       VALUES ($1, $2, $3, $4, now(), $5) RETURNING id::int AS id`,
      [usuarioId, d.comissaoPp, atual?.chavePix ?? null, d.vigenteDe, ator]);
    await auditar(exec, ator, 'professor_catalogo.contrato', 'contrato_professor', novo.id,
      { usuarioId, comissaoPp: d.comissaoPp, vigenteDe: d.vigenteDe, anterior: atual?.id ?? null });
    return novo.id;
  });
}

/** O professor diz para onde o repasse manual vai. */
export async function definirChavePix(usuarioId: number, chave: string) {
  const limpa = chave.trim();
  if (limpa.length < 5 || limpa.length > 120) throw new Error('informe a chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)');
  const r = await query(
    `UPDATE contrato_professor SET chave_pix = $2 WHERE usuario_id = $1 AND vigente_ate IS NULL RETURNING id`,
    [usuarioId, limpa]);
  if (r.length === 0) throw new Error('sem contrato vigente');
}

// ---------------------------------------------------------------------
// Autoria: de quem é o curso
// ---------------------------------------------------------------------

/** O curso é deste professor? Lança se não for — é a trava de toda ação. */
export async function posseDaMateria(exec: Exec | typeof query, usuarioId: number, materiaId: number) {
  const [m] = await exec<{ id: number }>(
    `SELECT id FROM materia WHERE id = $1 AND portal_id = ${PORTAL_PLATAFORMA} AND professor_id = $2`,
    [materiaId, usuarioId]);
  if (!m) throw new Error('este curso não é seu');
}

/** Sobe da aula ou do assunto até a matéria, para conferir a posse. */
export async function materiaDe(alvo: { assuntoId?: number; aulaId?: number }): Promise<number | null> {
  if (alvo.aulaId !== undefined) {
    const r = await queryOne<{ id: number }>(
      `SELECT s.materia_id::int AS id FROM aula au JOIN assunto s ON s.id = au.assunto_id WHERE au.id = $1`,
      [alvo.aulaId]);
    return r?.id ?? null;
  }
  if (alvo.assuntoId !== undefined) {
    const r = await queryOne<{ id: number }>('SELECT materia_id::int AS id FROM assunto WHERE id = $1', [alvo.assuntoId]);
    return r?.id ?? null;
  }
  return null;
}

/** Marca o curso recém-criado como deste professor — na mesma transação do painel. */
export async function assinarMateria(usuarioId: number, materiaId: number, nome: string) {
  await query(
    `UPDATE materia SET professor_id = $2, professor = $3, na_vitrine_plataforma = false, destaque = false
      WHERE id = $1 AND portal_id = ${PORTAL_PLATAFORMA} AND professor_id IS NULL`,
    [materiaId, usuarioId, nome]);
}

/** As situações que o professor do catálogo pode dar ao curso dele. Publicar é da revisão. */
export const SITUACOES_DO_PROFESSOR = ['rascunho', 'em_revisao', 'arquivado'] as const;

export function situacaoPermitidaAoProfessor(status: string, atual: string): boolean {
  // Curso já publicado pela revisão: o professor pode tirá-lo do ar
  // (arquivar) ou mandá-lo de volta a rascunho; não pode republicar.
  if ((SITUACOES_DO_PROFESSOR as readonly string[]).includes(status)) return true;
  return status === atual;   // manter o que já está (ex.: publicado) não é mudar
}

// ---------------------------------------------------------------------
// O painel: números e extrato
// ---------------------------------------------------------------------

export interface ResumoDoProfessor {
  cursos: number; publicados: number; emRevisao: number; aulasPublicadas: number;
  aulasComVideo: number; alunos: number; vendido: number; aReceber: number;
}

export async function resumoDoProfessor(usuarioId: number): Promise<ResumoDoProfessor> {
  const r = await queryOne<ResumoDoProfessor>(
    `SELECT
       (SELECT count(*)::int FROM materia WHERE professor_id = $1) AS cursos,
       (SELECT count(*)::int FROM materia WHERE professor_id = $1 AND status = 'publicado') AS publicados,
       (SELECT count(*)::int FROM materia WHERE professor_id = $1 AND status = 'em_revisao') AS "emRevisao",
       (SELECT count(*)::int FROM aula au JOIN assunto s ON s.id = au.assunto_id JOIN materia m ON m.id = s.materia_id
         WHERE m.professor_id = $1 AND au.status = 'publicado') AS "aulasPublicadas",
       (SELECT count(*)::int FROM aula au JOIN assunto s ON s.id = au.assunto_id JOIN materia m ON m.id = s.materia_id
         WHERE m.professor_id = $1 AND au.status = 'publicado' AND au.video_id IS NOT NULL) AS "aulasComVideo",
       (SELECT count(DISTINCT p.usuario_id)::int FROM pedido p WHERE p.professor_id = $1 AND p.status = 'PAGO') AS alunos,
       (SELECT coalesce(sum(p.centavos), 0)::int FROM pedido p WHERE p.professor_id = $1 AND p.status = 'PAGO') AS vendido,
       (SELECT coalesce(sum(round(p.centavos * coalesce(p.comissao_professor_pp, 0) / 100)), 0)::int
          FROM pedido p WHERE p.professor_id = $1 AND p.status = 'PAGO') AS "aReceber"`,
    [usuarioId]);
  return r!;
}

export interface VendaDoProfessor {
  referencia: string; pagoEm: Date | null; status: string; materiaNome: string | null;
  centavos: number; comissao: string | null; aReceber: number;
}

/** Venda a venda dos cursos dele no catálogo — o extrato que sustenta a apuração. */
export function vendasDoProfessor(usuarioId: number, limite = 200) {
  return query<VendaDoProfessor>(
    `SELECT p.referencia, p.pago_em AS "pagoEm", p.status, m.nome AS "materiaNome",
            p.centavos, p.comissao_professor_pp AS comissao,
            round(p.centavos * coalesce(p.comissao_professor_pp, 0) / 100)::int AS "aReceber"
       FROM pedido p LEFT JOIN materia m ON m.id = p.materia_id
      WHERE p.professor_id = $1 AND p.status IN ('PAGO', 'REEMBOLSADO')
      ORDER BY p.pago_em DESC NULLS LAST, p.id DESC LIMIT $2`,
    [usuarioId, limite]);
}

/** Para a retaguarda: quem vende no catálogo, com o que está em revisão. */
export function listarProfessoresDoCatalogo() {
  return query<{ id: number; nome: string; email: string; comissaoPp: string; cursos: number; emRevisao: number; publicados: number }>(
    `SELECT u.id::int AS id, u.nome, u.email, c.comissao_pp AS "comissaoPp",
            (SELECT count(*)::int FROM materia m WHERE m.professor_id = u.id) AS cursos,
            (SELECT count(*)::int FROM materia m WHERE m.professor_id = u.id AND m.status = 'em_revisao') AS "emRevisao",
            (SELECT count(*)::int FROM materia m WHERE m.professor_id = u.id AND m.status = 'publicado') AS publicados
       FROM contrato_professor c JOIN usuario u ON u.id = c.usuario_id
      WHERE c.vigente_ate IS NULL ORDER BY u.nome`);
}
