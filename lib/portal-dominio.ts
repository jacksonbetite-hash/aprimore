import { resolveCname } from 'node:dns/promises';
import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { conferirDominio, dominioBase, PORTAL_PLATAFORMA, type Portal } from './portal.ts';

/**
 * O portal de um domínio próprio: só resolve depois de VERIFICADO — o
 * CNAME apontando para o endereço do portal —, para que cadastrar o
 * domínio de outra pessoa não faça nada. Chamado pelo portalAtual.
 */
export function buscarPortalPorDominio(dominio: string) {
  return queryOne<Portal>(
    `SELECT id::int AS id, mascara, nome_exibicao AS "nomeExibicao", status, tipo, personalizacao,
            responsavel_nome AS "responsavelNome", responsavel_doc AS "responsavelDoc",
            dominios_email AS "dominiosEmail"
       FROM portal
      WHERE lower(dominio_proprio) = lower($1) AND dominio_verificado_em IS NOT NULL
        AND status IN ('ATIVO', 'SUSPENSO')`,
    [dominio],
  );
}

/**
 * Domínio próprio do professor (§5.10, Fase 2) — o upgrade pago.
 *
 * O caminho é: o professor cadastra o domínio, aponta o CNAME para o
 * endereço do portal, pede a verificação. Só o domínio VERIFICADO resolve
 * (lib/portal-consultas.ts) e só ele entra na fatura (fecharFatura) —
 * cobrar por um domínio que ainda não funciona seria cobrar por nada.
 *
 * O preço mora no plano: NULL quer dizer que o plano não oferece, e a
 * tela do professor diz isso em vez de aceitar o cadastro.
 */

export interface SituacaoDominio {
  dominio: string | null;
  verificadoEm: Date | null;
  /** Preço mensal do upgrade no plano do portal; null = plano não oferece. */
  centavosMes: number | null;
  /** O alvo que o CNAME precisa apontar. */
  esperado: string;
}

export async function situacaoDominio(portalId: number): Promise<SituacaoDominio> {
  const p = await queryOne<{
    dominio: string | null; verificadoEm: Date | null; centavosMes: number | null; mascara: string;
  }>(
    `SELECT p.dominio_proprio AS dominio, p.dominio_verificado_em AS "verificadoEm",
            pl.centavos_dominio_proprio AS "centavosMes", p.mascara
       FROM portal p LEFT JOIN portal_plano pl ON pl.id = p.plano_id
      WHERE p.id = $1 AND p.id <> ${PORTAL_PLATAFORMA}`,
    [portalId],
  );
  if (!p) throw new Error('portal não encontrado');
  return {
    dominio: p.dominio, verificadoEm: p.verificadoEm, centavosMes: p.centavosMes,
    esperado: `${p.mascara}.${dominioBase()}`,
  };
}

/** Cadastra (ou remove, com null) o domínio próprio. Trocar zera a verificação. */
export async function definirDominio(ator: string, portalId: number, bruto: string | null) {
  const dominio = bruto?.trim().toLowerCase() || null;
  if (dominio) {
    const erro = conferirDominio(dominio);
    if (erro) throw new Error(erro);
    const s = await situacaoDominio(portalId);
    if (s.centavosMes === null) throw new Error('Domínio próprio não está disponível no seu plano.');
  }
  const ocupado = dominio && await queryOne<{ id: number }>(
    `SELECT id::int AS id FROM portal WHERE lower(dominio_proprio) = $1 AND id <> $2`, [dominio, portalId]);
  if (ocupado) throw new Error('Este domínio já está em uso em outro portal.');

  await emTransacao(async (exec) => {
    await exec(
      `UPDATE portal SET dominio_proprio = $2, dominio_verificado_em = NULL
        WHERE id = $1 AND id <> ${PORTAL_PLATAFORMA}`,
      [portalId, dominio],
    );
    await auditar(exec, ator, 'portal.dominio', 'portal', portalId, { dominio });
  });
  return dominio;
}

export type Resolvedor = (nome: string) => Promise<string[]>;

const SEM_REGISTRO = new Set(['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'ETIMEOUT', 'EREFUSED', 'ECONNREFUSED']);

/**
 * Confere o CNAME e, se aponta para o endereço do portal, marca o domínio
 * como verificado. DNS que ainda não propagou não é erro: é "ainda não".
 */
export async function verificarDominio(
  ator: string, portalId: number, resolver: Resolvedor = resolveCname,
) {
  const s = await situacaoDominio(portalId);
  if (!s.dominio) throw new Error('Cadastre o domínio antes de verificar.');

  let alvos: string[] = [];
  try {
    alvos = (await resolver(s.dominio)).map((a) => a.toLowerCase().replace(/\.$/, ''));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? '';
    if (!SEM_REGISTRO.has(code)) throw err;
  }
  const ok = alvos.includes(s.esperado);
  if (ok) {
    await query(`UPDATE portal SET dominio_verificado_em = now() WHERE id = $1`, [portalId]);
    await emTransacao((exec) => auditar(exec, ator, 'portal.dominio.verificado', 'portal', portalId,
      { dominio: s.dominio }));
  }
  return { ok, dominio: s.dominio, esperado: s.esperado, alvos };
}
