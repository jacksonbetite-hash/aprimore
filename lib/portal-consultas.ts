import { cache } from 'react';
import { headers } from 'next/headers';
import { queryOne } from './db.ts';
import {
  CABECALHO_PORTAL, CABECALHO_DOMINIO, CABECALHO_HOST_EXTERNO, CABECALHO_PROTO_EXTERNO,
  dominioBase, PLATAFORMA, type Portal,
} from './portal.ts';
import { buscarPortalPorDominio } from './portal-dominio.ts';

/** Consultas de portal (§5.10). Só servidor — importa `pg`. */

export function buscarPortalPorMascara(mascara: string) {
  // RASCUNHO não resolve: portal que ainda não pagou a 1ª mensalidade
  // (§5.10.2, etapa 1) não existe publicamente — o endereço cai na
  // plataforma, como qualquer máscara desconhecida. SUSPENSO resolve,
  // porque o aluno com licença vigente continua assistindo (§5.10);
  // o corte do que o visitante vê num portal suspenso é da etapa 4.
  return queryOne<Portal>(
    // id::int — o driver devolve BIGINT como string, e o id do portal é
    // comparado com números (0 = plataforma) em toda parte.
    `SELECT id::int AS id, mascara, nome_exibicao AS "nomeExibicao", status, tipo, personalizacao,
            responsavel_nome AS "responsavelNome", responsavel_doc AS "responsavelDoc",
            dominios_email AS "dominiosEmail"
       FROM portal
      WHERE lower(mascara) = lower($1) AND status IN ('ATIVO', 'SUSPENSO')`,
    [mascara],
  );
}


/**
 * O portal desta requisição. `cache` do React garante uma consulta só,
 * ainda que layout, página e ações perguntem em separado.
 *
 * Máscara desconhecida cai na plataforma em vez de erro: um subdomínio que
 * não existe não precisa anunciar que o sistema é multi-tenant, e quem
 * digitou errado chega ao site principal em vez de a uma tela de falha.
 */
export const portalAtual = cache(async (): Promise<Portal> => {
  const h = await headers();
  const mascara = h.get(CABECALHO_PORTAL);
  if (mascara) return (await buscarPortalPorMascara(mascara)) ?? PLATAFORMA;
  const dominio = h.get(CABECALHO_DOMINIO);
  if (dominio) return (await buscarPortalPorDominio(dominio)) ?? PLATAFORMA;
  return PLATAFORMA;
});

/** Atalho para as consultas: só o identificador, que é o que elas usam. */
export async function portalIdAtual(): Promise<number> {
  return (await portalAtual()).id;
}

/**
 * O endereço do portal como o NAVEGADOR precisa dele — com protocolo e,
 * sobretudo, com a porta.
 *
 * `jackson.localhost` sem porta simplesmente não abre: quem escuta a 80
 * da máquina do professor não é a aplicação. Era o que fazia o "Ver meu
 * portal" abrir uma página em branco em toda instalação local, que roda
 * numa porta escolhida no `.env` (3010, por exemplo). A porta e o
 * protocolo vêm do endereço externo que o proxy repassou (`proxy.ts`) —
 * aqui dentro o Host já é o interno.
 */
export async function enderecoDoPortal(mascara: string): Promise<string> {
  const h = await headers();
  const host = h.get(CABECALHO_HOST_EXTERNO) ?? h.get('host') ?? '';
  const semColchete = host.split(',')[0].trim();
  const porta = /:\d+$/.exec(semColchete)?.[0] ?? '';
  const protocolo = h.get(CABECALHO_PROTO_EXTERNO) ?? h.get('x-forwarded-proto') ?? 'http';
  return `${protocolo}://${mascara}.${dominioBase()}${porta}`;
}
