import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { PORTAL_PLATAFORMA, type Personalizacao, type StatusPortal } from './portal.ts';

/**
 * Portal da Empresa — §5.11 do discovery.
 *
 * A empresa opera o mesmo tenant do professor (§5.10) com outro regime de
 * acesso. O que este arquivo guarda é a diferença: quem opera, quantas
 * pessoas cabem no plano e o que o painel do RH precisa saber.
 *
 * A GUARDA DE ACESSO — a regra de que, no portal de uma empresa, a rua
 * não vê nada — mora em `app/guarda-empresa.ts`, e não aqui. O motivo é
 * prático: ela redireciona, logo depende de `next/navigation`, e este
 * arquivo precisa carregar no executor de testes do Node, que não resolve
 * módulos do Next. A separação também diz a verdade sobre as camadas:
 * isto é domínio, aquilo é rota.
 */

// ---------------------------------------------------------------------
// Quem opera
// ---------------------------------------------------------------------

export type PapelNoPortal = 'RESPONSAVEL' | 'GESTOR';

export interface PortalDaEmpresa {
  id: number;
  mascara: string;
  nomeExibicao: string;
  status: StatusPortal;
  personalizacao: Personalizacao;
  dominiosEmail: string[];
  publicadoEm: Date | null;
  planoNome: string | null;
  /** Papel de quem perguntou — só o responsável mexe em contrato e gestores. */
  papelNoPortal: PapelNoPortal;
  contrato: {
    licencaMensalCentavos: number;
    limiteContas: number | null;
    aceitoEm: Date | null;
  } | null;
  faturasPendentes: number;
  /** O teto do contrato e o quanto dele já foi usado (§5.11, etapa 4). */
  limiteContas: number | null;
  colaboradoresAtivos: number;
  setores: number;
  /**
   * Os mesmos números honestos da checklist do professor: "publicada" não
   * é "no ar", e trilha publicada sem aula publicada não aparece para
   * ninguém.
   */
  trilhas: number;
  trilhasPublicadas: number;
  trilhasNoAr: number;
  trilhasVazias: number;
  aulasPublicadas: number;
  avaliacoesPublicadas: number;
  atribuicoes: number;
  conclusoes: number;
}

const CAMPOS_EMPRESA = `
  p.id::int AS id, p.mascara, p.nome_exibicao AS "nomeExibicao", p.status,
  p.personalizacao, p.dominios_email AS "dominiosEmail",
  p.publicado_em AS "publicadoEm", pl.nome AS "planoNome",
  CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
    'licencaMensalCentavos', c.licenca_mensal_centavos,
    'limiteContas', c.limite_contas,
    'aceitoEm', c.aceito_em) END AS contrato,
  c.limite_contas AS "limiteContas",
  (SELECT count(*)::int FROM portal_fatura f
    WHERE f.portal_id = p.id AND f.status IN ('FECHADA', 'EM_ATRASO')) AS "faturasPendentes",
  (SELECT count(*)::int FROM usuario u
    WHERE u.portal_id = p.id AND u.papel = 'aluno'
      AND u.status_conta <> 'ENCERRADA') AS "colaboradoresAtivos",
  (SELECT count(*)::int FROM setor s WHERE s.portal_id = p.id) AS setores,
  (SELECT count(*)::int FROM materia m WHERE m.portal_id = p.id) AS trilhas,
  (SELECT count(*)::int FROM materia m
    WHERE m.portal_id = p.id AND m.status = 'publicado') AS "trilhasPublicadas",
  (SELECT count(*)::int FROM materia m
    WHERE m.portal_id = p.id AND m.status = 'publicado'
      AND EXISTS (SELECT 1 FROM aula a JOIN assunto s ON s.id = a.assunto_id
                   WHERE s.materia_id = m.id AND a.status = 'publicado')) AS "trilhasNoAr",
  (SELECT count(*)::int FROM materia m
    WHERE m.portal_id = p.id AND m.status = 'publicado'
      AND NOT EXISTS (SELECT 1 FROM aula a JOIN assunto s ON s.id = a.assunto_id
                       WHERE s.materia_id = m.id AND a.status = 'publicado')) AS "trilhasVazias",
  (SELECT count(*)::int FROM aula a
    WHERE a.portal_id = p.id AND a.status = 'publicado') AS "aulasPublicadas",
  (SELECT count(*)::int FROM avaliacao av
    WHERE av.portal_id = p.id AND av.status = 'publicado') AS "avaliacoesPublicadas",
  (SELECT count(*)::int FROM atribuicao at WHERE at.portal_id = p.id) AS atribuicoes,
  (SELECT count(*)::int FROM conclusao co WHERE co.portal_id = p.id) AS conclusoes
`;

/**
 * O portal que esta pessoa opera. Diferente do professor, a empresa tem
 * RH com mais de uma pessoa: quem responde é `portal_gestor`, não uma
 * coluna no portal. Um gestor de duas empresas veria a mais recente —
 * caso raro que a etapa seguinte resolve com um seletor, se aparecer.
 */
export function portalDaEmpresa(usuarioId: number) {
  return queryOne<PortalDaEmpresa>(
    `SELECT ${CAMPOS_EMPRESA}, g.papel_no_portal AS "papelNoPortal"
       FROM portal_gestor g
       JOIN portal p ON p.id = g.portal_id
       LEFT JOIN portal_plano pl ON pl.id = p.plano_id
       LEFT JOIN portal_contrato c ON c.portal_id = p.id AND c.vigente_ate IS NULL
      WHERE g.usuario_id = $1 AND p.tipo = 'EMPRESA' AND p.status <> 'ENCERRADO'
      ORDER BY p.criado_em DESC LIMIT 1`,
    [usuarioId],
  );
}

/** O mesmo retrato pelo id do portal — para a retaguarda (/admin/portais). */
export function empresaPorId(portalId: number) {
  return queryOne<PortalDaEmpresa>(
    `SELECT ${CAMPOS_EMPRESA}, 'RESPONSAVEL'::papel_no_portal AS "papelNoPortal"
       FROM portal p
       LEFT JOIN portal_plano pl ON pl.id = p.plano_id
       LEFT JOIN portal_contrato c ON c.portal_id = p.id AND c.vigente_ate IS NULL
      WHERE p.id = $1 AND p.tipo = 'EMPRESA'`,
    [portalId],
  );
}

export interface Gestor {
  id: number;
  nome: string;
  email: string;
  papelNoPortal: PapelNoPortal;
  criadoEm: Date;
  ultimoLoginEm: Date | null;
}

export function listarGestores(portalId: number) {
  return query<Gestor>(
    `SELECT u.id::int AS id, u.nome, u.email, g.papel_no_portal AS "papelNoPortal",
            g.criado_em AS "criadoEm", u.ultimo_login_em AS "ultimoLoginEm"
       FROM portal_gestor g JOIN usuario u ON u.id = g.usuario_id
      WHERE g.portal_id = $1
      ORDER BY (g.papel_no_portal = 'RESPONSAVEL') DESC, u.nome`,
    [portalId],
  );
}

/**
 * Um gestor a mais no RH. A conta vive na PLATAFORMA (portal 0), como a
 * do professor: é de lá que se opera o portal.
 *
 * O e-mail que já é de outra pessoa NÃO é promovido em silêncio — dar
 * papel de gestor a uma conta alheia por um formulário seria presente
 * para quem souber o e-mail de um administrador. Ou a conta é de aluno
 * simples sem portal, e aí vira gestor; ou o convite é recusado.
 */
export async function adicionarGestor(
  ator: string, portalId: number, nome: string, email: string, senhaHash: string,
) {
  const limpo = email.trim().toLowerCase();
  return emTransacao(async (exec) => {
    const [existente] = await exec<{ id: number; papel: string }>(
      `SELECT id::int AS id, papel FROM usuario
        WHERE portal_id = ${PORTAL_PLATAFORMA} AND lower(email) = $1`,
      [limpo],
    );

    let usuarioId: number;
    if (existente) {
      if (existente.papel !== 'aluno' && existente.papel !== 'gestor') {
        throw new Error('Esse e-mail já pertence a uma conta da plataforma. '
          + 'Use outro endereço, ou fale com o suporte.');
      }
      const [ja] = await exec<{ portal_id: number }>(
        'SELECT portal_id FROM portal_gestor WHERE usuario_id = $1', [existente.id],
      );
      if (ja && Number(ja.portal_id) !== portalId) {
        throw new Error('Essa pessoa já é gestora de outra empresa.');
      }
      usuarioId = existente.id;
      await exec(`UPDATE usuario SET papel = 'gestor' WHERE id = $1 AND papel = 'aluno'`, [usuarioId]);
    } else {
      const [novo] = await exec<{ id: number }>(
        `INSERT INTO usuario (portal_id, nome, email, senha_hash, papel)
         VALUES (${PORTAL_PLATAFORMA}, $1, lower($2), $3, 'gestor')
         RETURNING id::int AS id`,
        [nome.trim().slice(0, 120), limpo, senhaHash],
      );
      usuarioId = novo.id;
    }

    await exec(
      `INSERT INTO portal_gestor (portal_id, usuario_id, papel_no_portal, criado_por)
       VALUES ($1, $2, 'GESTOR', $3)
       ON CONFLICT (portal_id, usuario_id) DO NOTHING`,
      [portalId, usuarioId, ator],
    );
    await auditar(exec, ator, 'empresa.gestor.adicionado', 'portal', portalId, { email: limpo });
    return usuarioId;
  });
}

/**
 * Tira o acesso de um gestor. O responsável não sai: é quem assinou o
 * contrato, e um portal sem responsável é um portal sem dono da fatura.
 */
export async function removerGestor(ator: string, portalId: number, usuarioId: number) {
  await emTransacao(async (exec) => {
    const [linha] = await exec<{ papel_no_portal: PapelNoPortal }>(
      'SELECT papel_no_portal FROM portal_gestor WHERE portal_id = $1 AND usuario_id = $2',
      [portalId, usuarioId],
    );
    if (!linha) throw new Error('Essa pessoa não é gestora deste portal.');
    if (linha.papel_no_portal === 'RESPONSAVEL') {
      throw new Error('O responsável pelo contrato não pode ser removido. '
        + 'Para trocar quem responde pela empresa, fale com o suporte.');
    }
    await exec('DELETE FROM portal_gestor WHERE portal_id = $1 AND usuario_id = $2',
      [portalId, usuarioId]);
    // A conta continua existindo (histórico de auditoria aponta para ela);
    // o que ela perde é o vínculo, e com ele o painel.
    await exec(`UPDATE usuario SET papel = 'aluno' WHERE id = $1 AND papel = 'gestor'`, [usuarioId]);
    await auditar(exec, ator, 'empresa.gestor.removido', 'portal', portalId, { usuarioId });
  });
}

// ---------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------

export interface PlanoEmpresaAtivo {
  id: number;
  nome: string;
  licencaMensalCentavos: number;
  limiteContas: number | null;
  gbArmazenamento: number;
  gbBandaMes: number;
  centavosPorGbExcedente: number;
  centavosDominioProprio: number | null;
}

/**
 * Os planos que a empresa contrata sozinha, do mais barato ao mais caro.
 * Lidos do banco, nunca do código: mudar o preço no admin muda o site
 * (mesma regra do §5.10.3).
 */
export function planosDeEmpresa() {
  return query<PlanoEmpresaAtivo>(
    `SELECT id::int AS id, nome,
            licenca_mensal_centavos AS "licencaMensalCentavos",
            limite_contas AS "limiteContas",
            gb_armazenamento AS "gbArmazenamento", gb_banda_mes AS "gbBandaMes",
            centavos_por_gb_excedente AS "centavosPorGbExcedente",
            centavos_dominio_proprio AS "centavosDominioProprio"
       FROM portal_plano WHERE ativo AND tipo = 'EMPRESA'
      ORDER BY licenca_mensal_centavos`,
  );
}

export function planoDeEmpresa(id: number) {
  return queryOne<PlanoEmpresaAtivo>(
    `SELECT id::int AS id, nome,
            licenca_mensal_centavos AS "licencaMensalCentavos",
            limite_contas AS "limiteContas",
            gb_armazenamento AS "gbArmazenamento", gb_banda_mes AS "gbBandaMes",
            centavos_por_gb_excedente AS "centavosPorGbExcedente",
            centavos_dominio_proprio AS "centavosDominioProprio"
       FROM portal_plano WHERE id = $1 AND ativo AND tipo = 'EMPRESA'`,
    [id],
  );
}

// ---------------------------------------------------------------------
// O teto de contas — o que a empresa realmente compra
// ---------------------------------------------------------------------

export interface Ocupacao {
  limite: number | null;
  usadas: number;
  /** Quantas ainda cabem; null = sem teto. */
  livres: number | null;
  cheio: boolean;
}

export async function ocupacaoDeContas(portalId: number): Promise<Ocupacao> {
  const linha = await queryOne<{ limite: number | null; usadas: number }>(
    `SELECT c.limite_contas AS limite,
            (SELECT count(*)::int FROM usuario u
              WHERE u.portal_id = $1 AND u.papel = 'aluno'
                AND u.status_conta <> 'ENCERRADA') AS usadas
       FROM portal p
       LEFT JOIN portal_contrato c ON c.portal_id = p.id AND c.vigente_ate IS NULL
      WHERE p.id = $1`,
    [portalId],
  );
  const limite = linha?.limite ?? null;
  const usadas = linha?.usadas ?? 0;
  return {
    limite, usadas,
    livres: limite === null ? null : Math.max(0, limite - usadas),
    cheio: limite !== null && usadas >= limite,
  };
}

/**
 * A trava do teto, em texto que a pessoa entende. Chamada antes de
 * cadastrar e antes de convidar — e não só no cadastro: convite pendente
 * que não cabe no plano é frustração agendada.
 *
 * O teto conta contas ATIVAS. Desativar libera a vaga; reativar passa
 * por aqui de novo, para que "desativa e reativa" não seja um jeito de
 * furar o limite.
 */
export async function exigirVaga(portalId: number, quantas = 1): Promise<Ocupacao> {
  const o = await ocupacaoDeContas(portalId);
  if (o.limite === null) return o;
  if (o.usadas + quantas > o.limite) {
    const faltam = o.usadas + quantas - o.limite;
    throw new Error(
      `Seu plano permite ${o.limite} pessoas com acesso e ${o.usadas} já estão ativas. `
      + `${faltam === 1 ? 'Falta 1 vaga' : `Faltam ${faltam} vagas`}. `
      + 'Desative quem saiu da empresa ou mude de plano em Financeiro.',
    );
  }
  return o;
}

// ---------------------------------------------------------------------
// Autocadastro por domínio de e-mail
// ---------------------------------------------------------------------

/**
 * Os domínios cujo e-mail dispensa convite nominal (§5.11, etapa 4).
 *
 * É a política mais frouxa que a empresa pode escolher, e por isso o
 * padrão é a lista VAZIA: sem nada aqui, só entra quem recebeu convite.
 * Com `acme.com.br` aqui, qualquer pessoa com um e-mail nesse domínio
 * cria a conta sozinha — cômodo para a empresa que confia no próprio
 * correio, e é decisão dela.
 *
 * O que a validação impede é a lista virar uma porta escancarada:
 * domínio de correio público (gmail, hotmail e afins) não entra, porque
 * ali "ter um e-mail do domínio" não prova vínculo com empresa nenhuma.
 */
const CORREIO_PUBLICO = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com',
  'yahoo.com', 'yahoo.com.br', 'icloud.com', 'me.com', 'bol.com.br',
  'uol.com.br', 'terra.com.br', 'ig.com.br', 'protonmail.com', 'proton.me',
  'zoho.com', 'aol.com', 'gmx.com', 'mail.com', 'yandex.com',
]);

export function validarDominiosEmail(bruto: string): string[] {
  const itens = bruto
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, '').replace(/\.$/, ''))
    .filter(Boolean);

  const vistos: string[] = [];
  for (const d of itens) {
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
      throw new Error(`"${d}" não parece um domínio. Escreva só a parte depois do @, `
        + 'como acme.com.br.');
    }
    if (CORREIO_PUBLICO.has(d)) {
      throw new Error(`${d} é um correio público: qualquer pessoa do mundo tem um e-mail `
        + 'assim, e liberar isso abriria o seu portal para estranhos. Use o domínio da '
        + 'empresa, ou convide as pessoas uma a uma.');
    }
    if (!vistos.includes(d)) vistos.push(d);
  }
  if (vistos.length > 10) throw new Error('No máximo 10 domínios.');
  return vistos;
}

export async function definirDominiosEmail(ator: string, portalId: number, bruto: string) {
  const dominios = validarDominiosEmail(bruto);
  await emTransacao(async (exec) => {
    const [linha] = await exec<{ id: number }>(
      `UPDATE portal SET dominios_email = $2
        WHERE id = $1 AND tipo = 'EMPRESA' RETURNING id`,
      [portalId, dominios],
    );
    if (!linha) throw new Error('portal de empresa não encontrado');
    await auditar(exec, ator, 'empresa.dominios_email', 'portal', portalId, { dominios });
  });
  return dominios;
}

/**
 * O e-mail pode criar conta sozinho neste portal? Consultado pelo
 * cadastro (etapa 4). Lista vazia responde `false` a tudo — que é o
 * padrão, e o mais fechado.
 */
export function dominioAutorizado(dominios: string[], email: string): boolean {
  const dominio = email.trim().toLowerCase().split('@')[1] ?? '';
  return dominio.length > 0 && dominios.includes(dominio);
}
