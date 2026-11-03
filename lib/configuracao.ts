import { queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import type { PaginaEmpresa } from './portal.ts';

/**
 * Configuração da plataforma, chave/valor (db/048). A ÚNICA porta para a
 * tabela `configuracao`: as chaves existentes estão listadas aqui, com o
 * tipo do valor, e é aqui que uma chave nova entra.
 *
 * `pagina-universidade` — os textos de fábrica da página pública da
 *   universidade corporativa (`lib/pagina-empresa.ts`), editados pelo
 *   administrador em /admin/portais/pagina-da-universidade. Vazio = o
 *   padrão do código.
 */
export interface Chaves {
  'pagina-universidade': PaginaEmpresa;
}

export async function lerConfiguracao<K extends keyof Chaves>(chave: K): Promise<Chaves[K] | null> {
  const r = await queryOne<{ valor: Chaves[K] }>(
    'SELECT valor FROM configuracao WHERE chave = $1', [chave]);
  return r?.valor ?? null;
}

export async function salvarConfiguracao<K extends keyof Chaves>(
  ator: string, chave: K, valor: Chaves[K],
): Promise<void> {
  await emTransacao(async (exec) => {
    await exec(
      `INSERT INTO configuracao (chave, valor, atualizado_por)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (chave) DO UPDATE
         SET valor = EXCLUDED.valor, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = now()`,
      [chave, JSON.stringify(valor), ator],
    );
    await auditar(exec, ator, 'configuracao.salva', 'configuracao', 0, { chave });
  });
}

/** Quando e por quem a chave foi mexida — para a tela do administrador. */
export function historicoConfiguracao(chave: keyof Chaves) {
  return queryOne<{ atualizadoPor: string; atualizadoEm: Date }>(
    `SELECT atualizado_por AS "atualizadoPor", atualizado_em AS "atualizadoEm"
       FROM configuracao WHERE chave = $1`, [chave]);
}
