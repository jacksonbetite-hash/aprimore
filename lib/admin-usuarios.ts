import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import {
  gerarHashSenha, validarEmail, validarSenha, revogarSessoesDo, revogarSessoesDaConta,
  garantirConta,
} from './auth.ts';
import { PORTAL_PLATAFORMA, validarCpf, somenteDigitos } from './portal.ts';
import { cadastrarColaborador } from './empresa-equipe.ts';
import { adicionarGestor } from './empresa.ts';
import { criarProfessor } from './admin-portais.ts';
import { PAPEIS_DA_EQUIPE, daEquipe, type PapelDaEquipe } from './permissoes.ts';

/**
 * O cadastro de usuários da retaguarda — docs/plano-perfis-e-acessos.md,
 * §3 e etapa 2.
 *
 * Uma tela para TODOS os papéis e TODOS os portais: até aqui a retaguarda
 * só listava alunos do portal 0 (`/admin/alunos`) e os de um portal por
 * vez, sem abrir, editar ou criar ninguém; admin nascia por script e
 * financeiro/suporte não existiam.
 *
 * Nesta etapa a unidade ainda é o `usuario` (uma linha por pessoa POR
 * portal, §5.10). A ficha mostra "outros perfis com o mesmo e-mail" para
 * que o suporte enxergue, desde já, que a mesma pessoa pode existir em
 * mais de uma base — é o que a etapa 3 (credencial global) vai unir.
 *
 * Quem cria continua sendo o módulo dono da regra: colaborador de empresa
 * passa por `cadastrarColaborador` (teto de contas, atribuições do setor),
 * gestor por `adicionarGestor` (não promove conta alheia), professor por
 * `criarProfessor`. Aqui só o aluno comum e a equipe nascem direto.
 *
 * Toda mutação grava em `log_auditoria` na mesma transação (§5.9).
 */

// ---------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------

export interface FiltroUsuarios {
  busca?: string;
  papel?: string;
  /** null = qualquer portal; 0 = plataforma. */
  portalId?: number | null;
  status?: string;
  comLicenca?: boolean;
}

export interface LinhaUsuario {
  id: number; nome: string; email: string; papel: string;
  portalId: number; portalNome: string | null; portalTipo: string | null;
  statusConta: string; documentoMascarado: string | null;
  setorNome: string | null;
  criadoEm: Date; ultimoLoginEm: Date | null;
  licencasVigentes: number;
  /** Portais que esta pessoa opera (professor dono, gestor de empresa). */
  opera: string[];
}

const CAMPOS_LINHA = `
  u.id::int AS id, u.nome, u.email, u.papel,
  u.portal_id::int AS "portalId",
  CASE WHEN u.portal_id = 0 THEN NULL ELSE p.nome_exibicao END AS "portalNome",
  CASE WHEN u.portal_id = 0 THEN NULL ELSE p.tipo::text END AS "portalTipo",
  u.status_conta AS "statusConta",
  CASE WHEN c.documento IS NULL THEN NULL
       WHEN c.tipo_documento = 'CNPJ' THEN '**.***.***/' || substr(c.documento, 9, 4) || '-' || substr(c.documento, 13, 2)
       ELSE '***.***.' || substr(c.documento, 7, 3) || '-' || substr(c.documento, 10, 2) END AS "documentoMascarado",
  s.nome AS "setorNome",
  u.criado_em AS "criadoEm", u.ultimo_login_em AS "ultimoLoginEm",
  (SELECT count(*)::int FROM licenca l
    WHERE l.usuario_id = u.id AND l.status = 'ATIVA'
      AND now() BETWEEN l.inicio_em AND l.fim_em) AS "licencasVigentes",
  ARRAY(
    SELECT pp.nome_exibicao FROM portal pp WHERE pp.professor_id = u.id AND pp.status <> 'ENCERRADO'
    UNION ALL
    SELECT pg2.nome_exibicao FROM portal_gestor g JOIN portal pg2 ON pg2.id = g.portal_id
     WHERE g.usuario_id = u.id AND pg2.status <> 'ENCERRADO'
  ) AS opera`;

export function listarUsuarios(f: FiltroUsuarios = {}, limite = 100) {
  const termo = (f.busca ?? '').trim();
  const digitos = somenteDigitos(termo);
  return query<LinhaUsuario>(
    `SELECT ${CAMPOS_LINHA}
       FROM usuario u
       JOIN conta c ON c.id = u.conta_id
       JOIN portal p ON p.id = u.portal_id
       LEFT JOIN setor s ON s.id = u.setor_id
      WHERE ($1 = '' OR u.nome ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
             OR ($2 <> '' AND c.documento LIKE $2 || '%'))
        AND ($3::text IS NULL OR u.papel::text = $3)
        AND ($4::bigint IS NULL OR u.portal_id = $4)
        AND ($5::text IS NULL OR u.status_conta::text = $5)
        AND (NOT $6 OR EXISTS (SELECT 1 FROM licenca l WHERE l.usuario_id = u.id
                                 AND l.status = 'ATIVA' AND now() BETWEEN l.inicio_em AND l.fim_em))
      ORDER BY u.criado_em DESC
      LIMIT $7`,
    [termo, digitos.length >= 3 ? digitos : '', f.papel || null, f.portalId ?? null,
     f.status || null, Boolean(f.comLicenca), limite],
  );
}

export function contarPorPapel() {
  return query<{ papel: string; total: number }>(
    `SELECT papel::text AS papel, count(*)::int AS total FROM usuario GROUP BY papel ORDER BY papel`,
  );
}

// ---------------------------------------------------------------------
// A ficha
// ---------------------------------------------------------------------

export interface FichaUsuario {
  id: number; contaId: number; nome: string; email: string; papel: string;
  portalId: number; portalNome: string | null; portalTipo: string | null; portalMascara: string | null;
  statusConta: string; cpf: string | null; nascimento: Date | null;
  consentimentoResponsavelEm: Date | null;
  setorId: number | null; setorNome: string | null; matricula: string | null;
  criadoEm: Date; ultimoLoginEm: Date | null; temSenha: boolean;
  opera: { portalId: number; nome: string; tipo: string; como: string }[];
}

export function buscarUsuario(id: number) {
  return queryOne<FichaUsuario>(
    `SELECT u.id::int AS id, c.id::int AS "contaId", u.nome, u.email, u.papel,
            u.portal_id::int AS "portalId",
            CASE WHEN u.portal_id = 0 THEN NULL ELSE p.nome_exibicao END AS "portalNome",
            CASE WHEN u.portal_id = 0 THEN NULL ELSE p.tipo::text END AS "portalTipo",
            CASE WHEN u.portal_id = 0 THEN NULL ELSE p.mascara END AS "portalMascara",
            u.status_conta AS "statusConta", c.documento AS cpf, u.nascimento,
            u.consentimento_responsavel_em AS "consentimentoResponsavelEm",
            u.setor_id::int AS "setorId", s.nome AS "setorNome", u.matricula,
            u.criado_em AS "criadoEm", u.ultimo_login_em AS "ultimoLoginEm",
            (c.senha_hash IS NOT NULL) AS "temSenha",
            (SELECT coalesce(json_agg(json_build_object(
                'portalId', x.portal_id, 'nome', x.nome, 'tipo', x.tipo, 'como', x.como)), '[]'::json)
               FROM (
                 SELECT pp.id AS portal_id, pp.nome_exibicao AS nome, pp.tipo::text AS tipo, 'professor' AS como
                   FROM portal pp WHERE pp.professor_id = u.id AND pp.status <> 'ENCERRADO'
                 UNION ALL
                 SELECT pg2.id, pg2.nome_exibicao, pg2.tipo::text, lower(g.papel_no_portal::text)
                   FROM portal_gestor g JOIN portal pg2 ON pg2.id = g.portal_id
                  WHERE g.usuario_id = u.id AND pg2.status <> 'ENCERRADO'
               ) x) AS opera
       FROM usuario u
       JOIN conta c ON c.id = u.conta_id
       JOIN portal p ON p.id = u.portal_id
       LEFT JOIN setor s ON s.id = u.setor_id
      WHERE u.id = $1`,
    [id],
  );
}

/** A mesma CONTA (db/045) em outros portais: a mesma senha, outro perfil. */
export function outrosPerfis(id: number) {
  return query<{ id: number; papel: string; portalId: number; portalNome: string; portalTipo: string; statusConta: string }>(
    `SELECT o.id::int AS id, o.papel, o.portal_id::int AS "portalId",
            CASE WHEN o.portal_id = 0 THEN 'Plataforma' ELSE p.nome_exibicao END AS "portalNome",
            p.tipo::text AS "portalTipo", o.status_conta AS "statusConta"
       FROM usuario u
       JOIN usuario o ON o.conta_id = u.conta_id AND o.id <> u.id
       JOIN portal p ON p.id = o.portal_id
      WHERE u.id = $1
      ORDER BY o.portal_id`,
    [id],
  );
}

export interface LicencaDaFicha {
  id: number; escopo: string; origem: string; status: string;
  materiaNome: string | null; materiaPortalNome: string | null;
  campanhaNome: string | null; pedidoReferencia: string | null;
  atribuicaoObrigatoria: boolean | null;
  inicioEm: Date; fimEm: Date; vigente: boolean; cota: unknown;
}

export function licencasDaFicha(usuarioId: number) {
  return query<LicencaDaFicha>(
    `SELECT l.id::int AS id, l.escopo, l.origem, l.status,
            m.nome AS "materiaNome",
            CASE WHEN m.portal_id = 0 OR m.portal_id IS NULL THEN NULL ELSE mp.nome_exibicao END AS "materiaPortalNome",
            c.nome AS "campanhaNome", pd.referencia AS "pedidoReferencia",
            at.obrigatoria AS "atribuicaoObrigatoria",
            l.inicio_em AS "inicioEm", l.fim_em AS "fimEm",
            (l.status = 'ATIVA' AND now() BETWEEN l.inicio_em AND l.fim_em) AS vigente,
            l.cota
       FROM licenca l
       LEFT JOIN materia m ON m.id = l.materia_id
       LEFT JOIN portal mp ON mp.id = m.portal_id
       LEFT JOIN campanha_promocional c ON c.id = l.campanha_id
       LEFT JOIN pedido pd ON pd.id = l.pedido_id
       LEFT JOIN atribuicao at ON at.id = l.atribuicao_id
      WHERE l.usuario_id = $1
      ORDER BY (l.status = 'ATIVA' AND now() BETWEEN l.inicio_em AND l.fim_em) DESC, l.fim_em DESC`,
    [usuarioId],
  );
}

export interface PedidoDaFicha {
  id: number; referencia: string; centavos: number; status: string; meio: string;
  periodo: string; escopo: string; materiaNome: string | null;
  criadoEm: Date; pagoEm: Date | null; reembolsoProtocolo: string | null;
}

export function pedidosDaFicha(usuarioId: number) {
  return query<PedidoDaFicha>(
    `SELECT p.id::int AS id, p.referencia, p.centavos, p.status, p.meio, p.periodo, p.escopo,
            m.nome AS "materiaNome", p.criado_em AS "criadoEm", p.pago_em AS "pagoEm",
            (SELECT r.protocolo FROM reembolso r WHERE r.pedido_id = p.id ORDER BY r.id DESC LIMIT 1) AS "reembolsoProtocolo"
       FROM pedido p LEFT JOIN materia m ON m.id = p.materia_id
      WHERE p.usuario_id = $1 ORDER BY p.criado_em DESC`,
    [usuarioId],
  );
}

export function sessoesAbertas(usuarioId: number) {
  return query<{ id: number; criadaEm: Date; expiraEm: Date; userAgent: string | null }>(
    `SELECT id::int AS id, criada_em AS "criadaEm", expira_em AS "expiraEm", user_agent AS "userAgent"
       FROM sessao WHERE usuario_id = $1 AND revogada_em IS NULL AND expira_em > now()
      ORDER BY criada_em DESC`,
    [usuarioId],
  );
}

export function auditoriaDoUsuario(usuarioId: number, limite = 30) {
  return query<{ id: number; ator: string; acao: string; entidade: string; detalhe: unknown; criadoEm: Date }>(
    `SELECT id::int AS id, ator, acao, entidade, detalhe, criado_em AS "criadoEm"
       FROM log_auditoria
      WHERE (entidade = 'usuario' AND entidade_id = $1)
         OR (detalhe->>'usuarioId') = $1::text
         OR (entidade = 'licenca' AND entidade_id IN (SELECT id FROM licenca WHERE usuario_id = $1))
      ORDER BY criado_em DESC LIMIT $2`,
    [usuarioId, limite],
  );
}

// ---------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------

export type TipoDeCadastro = 'equipe' | 'aluno' | 'professor' | 'gestor';

export interface DadosNovoUsuario {
  tipo: TipoDeCadastro;
  nome: string; email: string; senha: string;
  /** Portal em que o perfil nasce (aluno) ou que a pessoa vai operar (gestor). */
  portalId: number;
  /** Só para `equipe`. */
  papel?: string;
  cpf?: string;
  /** Só para aluno em portal de empresa. */
  setorId?: number | null;
  matricula?: string;
}

export interface UsuarioCriado { id: number; ligadoAExistente: boolean; aviso?: string }

/**
 * Um formulário, quatro destinos — cada um com a regra do módulo dono.
 * Aqui só se confere o que é comum (nome, e-mail, senha, documento) e se
 * escolhe o caminho.
 */
export async function criarUsuario(ator: string, d: DadosNovoUsuario): Promise<UsuarioCriado> {
  const nome = d.nome.trim().slice(0, 120);
  const email = d.email.trim().toLowerCase();
  if (nome.length < 2) throw new Error('Diga o nome da pessoa.');
  const erroEmail = validarEmail(email);
  if (erroEmail) throw new Error(erroEmail);
  const erroSenha = validarSenha(d.senha);
  if (erroSenha) throw new Error(erroSenha);
  const cpf = normalizarCpf(d.cpf);

  switch (d.tipo) {
    case 'equipe': {
      if (!d.papel || !daEquipe(d.papel)) throw new Error('Escolha o papel: admin, financeiro ou suporte.');
      return criarDaEquipe(ator, nome, email, d.senha, d.papel, cpf);
    }
    case 'professor': {
      const id = await criarProfessor(ator, nome, email, d.senha);
      if (cpf) await gravarCpf(id, cpf);
      return { id, ligadoAExistente: false };
    }
    case 'gestor': {
      const portal = await tipoDoPortal(d.portalId);
      if (portal !== 'EMPRESA') throw new Error('Gestor só existe em portal de empresa.');
      const id = await adicionarGestor(ator, d.portalId, nome, email, await gerarHashSenha(d.senha));
      if (cpf) await gravarCpf(id, cpf);
      return { id, ligadoAExistente: false };
    }
    case 'aluno': {
      const tipo = await tipoDoPortal(d.portalId);
      if (tipo === 'EMPRESA') {
        const r = await cadastrarColaborador(ator, d.portalId,
          { nome, email, setorId: d.setorId ?? null, matricula: d.matricula ?? '' },
          await gerarHashSenha(d.senha));
        if (cpf) await gravarCpf(r.id, cpf);
        return {
          id: r.id, ligadoAExistente: false,
          aviso: r.trilhas > 0 ? `${r.trilhas} trilha(s) do setor já liberada(s).` : undefined,
        };
      }
      return criarAluno(ator, d.portalId, nome, email, d.senha, cpf);
    }
  }
}

async function tipoDoPortal(portalId: number): Promise<'PROFESSOR' | 'EMPRESA'> {
  if (!Number.isInteger(portalId) || portalId < 0) throw new Error('Escolha o portal.');
  const p = await queryOne<{ tipo: 'PROFESSOR' | 'EMPRESA'; status: string }>(
    'SELECT tipo, status FROM portal WHERE id = $1', [portalId]);
  if (!p) throw new Error('Portal não encontrado.');
  if (p.status === 'ENCERRADO') throw new Error('Esse portal está encerrado.');
  return p.tipo;
}

async function criarAluno(
  ator: string, portalId: number, nome: string, email: string, senha: string, cpf: string | null,
) {
  const hash = await gerarHashSenha(senha);
  return emTransacao(async (exec) => {
    // Conta global (db/045): e-mail que já tem conta ganha só o perfil
    // aqui e entra com a senha que já usa. Documento divergente é outra
    // pessoa, e `garantirConta` recusa.
    const conta = await garantirConta(exec, { nome, email, senhaHash: hash, documento: cpf });
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
       VALUES ($1, $2, $3, $4, 'aluno')
       ON CONFLICT (portal_id, lower(email)) DO NOTHING
       RETURNING id::int AS id`,
      [portalId, conta.id, nome, email],
    );
    if (!novo) {
      throw new Error(portalId === PORTAL_PLATAFORMA
        ? `${email} já tem conta na plataforma.`
        : `${email} já tem conta neste portal.`);
    }
    await auditar(exec, ator, 'usuario.criado', 'usuario', novo.id,
      { portalId, email, papel: 'aluno', comCpf: Boolean(cpf), ligadoAExistente: conta.existia });
    return {
      id: novo.id, ligadoAExistente: conta.existia,
      aviso: conta.existia ? 'A pessoa já tinha conta: entra com a senha que já usa.' : undefined,
    };
  });
}

/**
 * Equipe da plataforma: nasce no portal 0, ou PROMOVE uma conta de aluno
 * que já exista com aquele e-mail — nunca uma de professor ou gestor, que
 * têm painel próprio e outra relação com o sistema (é a mesma regra de
 * `adicionarGestor`). Promover troca a senha pela informada: quem dá o
 * papel entrega a chave, e a auditoria diz que foi troca.
 */
async function criarDaEquipe(
  ator: string, nome: string, email: string, senha: string, papel: PapelDaEquipe, cpf: string | null,
): Promise<UsuarioCriado> {
  const hash = await gerarHashSenha(senha);
  return emTransacao(async (exec) => {
    const [existente] = await exec<{ id: number; papel: string; contaId: number }>(
      `SELECT id::int AS id, papel, conta_id::int AS "contaId"
         FROM usuario WHERE portal_id = 0 AND lower(email) = $1`, [email],
    );
    if (existente) {
      if (existente.papel !== 'aluno' && !daEquipe(existente.papel)) {
        throw new Error(`${email} é conta de ${existente.papel}; não vira equipe por aqui.`);
      }
      await exec(
        `UPDATE usuario SET papel = $2::papel_usuario, nome = $3 WHERE id = $1`,
        [existente.id, papel, nome],
      );
      // A senha é da conta (db/045) e vale em todos os portais: quem dá
      // o papel entrega a chave, e as sessões antigas caem.
      await exec(
        `UPDATE conta SET senha_hash = $2, documento = coalesce(documento, $3),
                tipo_documento = coalesce(tipo_documento, CASE WHEN $3::text IS NULL THEN NULL ELSE 'CPF' END)
          WHERE id = $1`,
        [existente.contaId, hash, cpf],
      );
      await auditar(exec, ator, `usuario.promovido_${papel}`, 'usuario', existente.id,
        { email, de: existente.papel, senhaTrocada: true });
      return { id: existente.id, ligadoAExistente: true };
    }
    const conta = await garantirConta(exec, { nome, email, senhaHash: hash, documento: cpf });
    const [novo] = await exec<{ id: number }>(
      `INSERT INTO usuario (portal_id, conta_id, nome, email, papel)
       VALUES (0, $1, $2, $3, $4::papel_usuario) RETURNING id::int AS id`,
      [conta.id, nome, email, papel],
    );
    await auditar(exec, ator, 'usuario.criado', 'usuario', novo.id,
      { portalId: 0, email, papel, ligadoAExistente: conta.existia });
    return { id: novo.id, ligadoAExistente: conta.existia };
  });
}

// ---------------------------------------------------------------------
// Editar
// ---------------------------------------------------------------------

export interface DadosEdicao { nome: string; email: string; cpf: string; nascimento: string }

export async function editarUsuario(ator: string, id: number, d: DadosEdicao) {
  const nome = d.nome.trim().slice(0, 120);
  const email = d.email.trim().toLowerCase();
  if (nome.length < 2) throw new Error('Diga o nome da pessoa.');
  const erroEmail = validarEmail(email);
  if (erroEmail) throw new Error(erroEmail);
  const cpf = normalizarCpf(d.cpf);
  const nascimento = d.nascimento.trim();
  if (nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) throw new Error('Data de nascimento inválida.');

  await emTransacao(async (exec) => {
    const [antes] = await exec<{ nome: string; email: string; cpf: string | null; contaId: number }>(
      `SELECT u.nome, c.email, c.documento AS cpf, c.id::int AS "contaId"
         FROM usuario u JOIN conta c ON c.id = u.conta_id WHERE u.id = $1 FOR UPDATE OF u`, [id],
    );
    if (!antes) throw new Error('Usuário não encontrado.');
    // E-mail e documento são da CONTA e valem em todos os portais; o
    // e-mail novo se propaga aos perfis pelo gatilho de db/045.
    const [colisao] = await exec<{ id: number }>(
      `SELECT id FROM conta WHERE lower(email) = $1 AND id <> $2`, [email, antes.contaId],
    );
    if (colisao) throw new Error(`${email} já é de outra conta.`);
    await exec(
      `UPDATE usuario SET nome = $2, nascimento = $3 WHERE id = $1`,
      [id, nome, nascimento || null],
    );
    await exec(
      `UPDATE conta SET email = $2, documento = $3,
              tipo_documento = CASE WHEN $3::text IS NULL THEN NULL ELSE 'CPF' END
        WHERE id = $1`,
      [antes.contaId, email, cpf],
    );
    await auditar(exec, ator, 'usuario.editado', 'usuario', id, {
      nome: antes.nome !== nome ? { de: antes.nome, para: nome } : undefined,
      email: antes.email !== email ? { de: antes.email, para: email } : undefined,
      cpf: antes.cpf !== cpf ? 'alterado' : undefined,
    });
  });
}

/**
 * A senha provisória — o "esqueci a senha" enquanto o sistema não envia
 * e-mail (§16.22). Quem define vê a senha uma vez e a passa por canal
 * seguro; todas as sessões abertas caem, porque a chave antiga deixou de
 * valer e ninguém sabe em que máquina ela ficou.
 */
export async function definirSenhaProvisoria(ator: string, id: number, senha: string) {
  const erro = validarSenha(senha);
  if (erro) throw new Error(erro);
  const hash = await gerarHashSenha(senha);
  let contaId = 0;
  await emTransacao(async (exec) => {
    const [c] = await exec<{ id: number }>(
      `UPDATE conta SET senha_hash = $2
        WHERE id = (SELECT conta_id FROM usuario WHERE id = $1) RETURNING id::int AS id`, [id, hash]);
    if (!c) throw new Error('Usuário não encontrado.');
    contaId = c.id;
    await auditar(exec, ator, 'usuario.senha_provisoria', 'usuario', id, { contaId });
  });
  // A senha é da conta: as sessões dela caem em TODOS os portais.
  await revogarSessoesDaConta(contaId);
}

export const STATUS_CONTA = ['ATIVA', 'INATIVA_AVISO', 'BLOQUEADA_INATIVIDADE', 'ENCERRADA'] as const;
export type StatusConta = typeof STATUS_CONTA[number];

/** Estado da conta (§6.4, §6.5). Qualquer estado que não seja ATIVA derruba as sessões. */
export async function mudarStatusConta(ator: string, id: number, status: StatusConta) {
  if (!STATUS_CONTA.includes(status)) throw new Error('Estado inválido.');
  await emTransacao(async (exec) => {
    const [u] = await exec<{ anterior: string }>(
      `UPDATE usuario SET status_conta = $2
        WHERE id = $1 RETURNING (SELECT status_conta FROM usuario WHERE id = $1) AS anterior`,
      [id, status]);
    if (!u) throw new Error('Usuário não encontrado.');
    await auditar(exec, ator, 'usuario.status', 'usuario', id, { de: u.anterior, para: status });
  });
  if (status !== 'ATIVA') await revogarSessoesDo(id);
}

export async function derrubarSessoes(ator: string, id: number) {
  await revogarSessoesDo(id);
  await emTransacao((exec) => auditar(exec, ator, 'usuario.sessoes_revogadas', 'usuario', id, {}));
}

/**
 * Trocar o papel de alguém da plataforma entre aluno e equipe. Professor
 * e gestor não passam por aqui: o papel deles vem do portal que operam.
 */
export async function definirPapel(ator: string, id: number, papel: PapelDaEquipe | 'aluno') {
  if (papel !== 'aluno' && !daEquipe(papel)) throw new Error('Papel inválido.');
  await emTransacao(async (exec) => {
    const [u] = await exec<{ papel: string; portalId: number }>(
      `SELECT papel, portal_id::int AS "portalId" FROM usuario WHERE id = $1 FOR UPDATE`, [id]);
    if (!u) throw new Error('Usuário não encontrado.');
    if (u.portalId !== PORTAL_PLATAFORMA) throw new Error('Só contas da plataforma têm papel de equipe.');
    if (u.papel !== 'aluno' && !daEquipe(u.papel)) {
      throw new Error(`Esta conta é de ${u.papel}; o papel vem do portal que ela opera.`);
    }
    if (u.papel === papel) return;
    await exec('UPDATE usuario SET papel = $2::papel_usuario WHERE id = $1', [id, papel]);
    await auditar(exec, ator, 'usuario.papel', 'usuario', id, { de: u.papel, para: papel });
  });
  // Perdeu ou ganhou retaguarda: a sessão aberta não deve carregar o papel antigo.
  await revogarSessoesDo(id);
}

// ---------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------

function normalizarCpf(bruto?: string): string | null {
  const s = (bruto ?? '').trim();
  if (!s) return null;
  if (!validarCpf(s)) throw new Error('CPF inválido — confira os 11 dígitos.');
  return somenteDigitos(s);
}

async function gravarCpf(id: number, cpf: string) {
  await query(
    `UPDATE conta SET documento = coalesce(documento, $2),
            tipo_documento = coalesce(tipo_documento, 'CPF')
      WHERE id = (SELECT conta_id FROM usuario WHERE id = $1)`,
    [id, cpf]);
}

/** Para a tela: onde um perfil pode nascer. */
export function portaisParaCadastro() {
  return query<{ id: number; nome: string; mascara: string; tipo: 'PROFESSOR' | 'EMPRESA' }>(
    `SELECT id::int AS id, nome_exibicao AS nome, mascara, tipo
       FROM portal WHERE id <> 0 AND status <> 'ENCERRADO' ORDER BY tipo, nome_exibicao`,
  );
}

/** Setores de todos os portais de empresa, para o formulário escolher pelo portal. */
export function setoresPorPortal() {
  return query<{ portalId: number; id: number; nome: string }>(
    `SELECT portal_id::int AS "portalId", id::int AS id, nome FROM setor ORDER BY portal_id, ordem, nome`,
  );
}

export { PAPEIS_DA_EQUIPE };
