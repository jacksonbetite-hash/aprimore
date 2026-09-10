import { query, queryOne } from './db.ts';
import { montarFiltro, type FiltroAcervo, type ItemAcervo, type RascunhoItem, type StatusAcervo } from './acervo-item.ts';

/**
 * A Biblioteca da empresa — as consultas (migração db/042).
 *
 * A parte pura (validação, assuntos, filtro) vive em `acervo-item.ts`,
 * que o formulário do RH importa direto: componente de cliente não pode
 * puxar este módulo, ou o driver do Postgres vai para o navegador.
 * Daqui ela é reexportada por conveniência de quem já está no servidor.
 */
export * from './acervo-item.ts';
/* ------------------------------------------------------------------ *
 * Consultas
 * ------------------------------------------------------------------ */

const COLUNAS = `
  a.id::int AS id, a.titulo, a.autor, a.assuntos, a.descricao,
  a.formato, a.arquivo, a.bytes::bigint AS bytes, a.url, a.capa,
  a.ano, a.editora, a.setor_id::int AS "setorId", s.nome AS "setorNome",
  a.status, a.criado_em AS "criadoEm"`;

/** Tudo o que o portal tem, publicado ou não — a tela do RH. */
export function listarAcervo(portalId: number): Promise<ItemAcervo[]> {
  return query<ItemAcervo>(
    `SELECT ${COLUNAS}
       FROM acervo a LEFT JOIN setor s ON s.id = a.setor_id
      WHERE a.portal_id = $1
      ORDER BY a.status, a.criado_em DESC`,
    [portalId],
  );
}

export function lerItem(portalId: number, id: number): Promise<ItemAcervo | null> {
  return queryOne<ItemAcervo>(
    `SELECT ${COLUNAS}
       FROM acervo a LEFT JOIN setor s ON s.id = a.setor_id
      WHERE a.portal_id = $1 AND a.id = $2`,
    [portalId, id],
  );
}

/**
 * O que ESTE colaborador pode ver: publicado, e do setor dele ou de
 * ninguém.
 *
 * `setorId` entra como parâmetro e não é lido aqui de propósito — quem
 * sabe o setor é a sessão, e passar o id por fora deixa a regra visível
 * na chamada. O `portal_id` vem sempre da requisição, nunca da tela.
 */
export function listarParaColaborador(
  portalId: number, setorId: number | null, filtro: FiltroAcervo = {},
): Promise<ItemAcervo[]> {
  const f = montarFiltro(filtro);
  return query<ItemAcervo>(
    `SELECT ${COLUNAS}
       FROM acervo a LEFT JOIN setor s ON s.id = a.setor_id
      WHERE a.portal_id = $1
        AND a.status = 'PUBLICADO'
        AND (a.setor_id IS NULL OR a.setor_id = $2)
        AND ($3::text IS NULL OR normaliza_busca(a.titulo || ' ' || coalesce(a.autor, ''))
             LIKE '%' || normaliza_busca($3) || '%')
        AND ($4::text IS NULL OR a.assuntos @> ARRAY[$4]::text[])
        AND ($5::text IS NULL OR a.autor = $5)
        AND ($6::text IS NULL OR a.formato::text = $6)
      ORDER BY a.titulo`,
    [portalId, setorId, f.busca, f.assunto, f.autor, f.formato],
  );
}

/**
 * Assuntos e autores que existem NO QUE ESTA PESSOA VÊ.
 *
 * Sai da mesma regra de visibilidade da lista, e não de um `DISTINCT` da
 * tabela inteira: um assunto que só existe em item de outro setor não
 * pode aparecer nem como opção do filtro — a opção já entregaria que o
 * material existe.
 */
export async function facetasDoColaborador(portalId: number, setorId: number | null) {
  const [assuntos, autores] = await Promise.all([
    query<{ assunto: string; quantos: number }>(
      `SELECT x.assunto, count(*)::int AS quantos
         FROM acervo a, unnest(a.assuntos) AS x(assunto)
        WHERE a.portal_id = $1 AND a.status = 'PUBLICADO'
          AND (a.setor_id IS NULL OR a.setor_id = $2)
        GROUP BY x.assunto
        ORDER BY count(*) DESC, x.assunto`,
      [portalId, setorId],
    ),
    query<{ autor: string }>(
      `SELECT DISTINCT a.autor
         FROM acervo a
        WHERE a.portal_id = $1 AND a.status = 'PUBLICADO'
          AND (a.setor_id IS NULL OR a.setor_id = $2)
          AND a.autor IS NOT NULL AND btrim(a.autor) <> ''
        ORDER BY a.autor`,
      [portalId, setorId],
    ),
  ]);
  return { assuntos, autores: autores.map((a) => a.autor) };
}

/** Cria ou atualiza. Devolve o id — o do item novo, ou o mesmo de volta. */
export async function salvarItem(
  portalId: number, criadoPor: number, item: RascunhoItem, id?: number | null,
): Promise<number> {
  const campos = [
    item.titulo.trim(),
    item.autor?.trim() || null,
    item.assuntos,
    item.descricao?.trim() || null,
    item.formato,
    item.formato === 'PDF' ? item.arquivo : null,
    item.formato === 'LINK' ? item.url!.trim() : null,
    item.capa || null,
    item.ano ?? null,
    item.editora?.trim() || null,
    item.setorId ?? null,
  ];

  if (id) {
    /* `portal_id = $13` no WHERE, e não só o id: sem isso, um id
       adivinhado editaria o item de OUTRA empresa. A ação já confere o
       vínculo do gestor, e esta é a segunda tranca — a regra do §15.14. */
    const linha = await queryOne<{ id: number }>(
      `UPDATE acervo SET
         titulo = $1, autor = $2, assuntos = $3, descricao = $4, formato = $5,
         arquivo = coalesce($6, CASE WHEN $5 = 'PDF' THEN arquivo ELSE NULL END),
         url = $7, capa = coalesce($8, capa), ano = $9, editora = $10, setor_id = $11,
         atualizado_em = now()
       WHERE id = $12 AND portal_id = $13
       RETURNING id::int AS id`,
      [...campos, id, portalId],
    );
    if (!linha) throw new Error('item não encontrado neste portal');
    return linha.id;
  }

  const linha = await queryOne<{ id: number }>(
    `INSERT INTO acervo
       (titulo, autor, assuntos, descricao, formato, arquivo, url, capa, ano, editora,
        setor_id, portal_id, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id::int AS id`,
    [...campos, portalId, criadoPor],
  );
  return linha!.id;
}

/** Guarda o tamanho do arquivo enviado: é ele que entra na cota de GB. */
export function registrarBytes(portalId: number, id: number, bytes: number) {
  return query(
    'UPDATE acervo SET bytes = $3, atualizado_em = now() WHERE id = $2 AND portal_id = $1',
    [portalId, id, bytes],
  );
}

export function mudarStatus(portalId: number, id: number, status: StatusAcervo) {
  return query(
    'UPDATE acervo SET status = $3, atualizado_em = now() WHERE id = $2 AND portal_id = $1',
    [portalId, id, status],
  );
}

/**
 * Apaga a linha e devolve o nome do arquivo no volume, para quem chamou
 * apagar o arquivo DEPOIS — nunca antes. Apagar o arquivo primeiro e
 * falhar no banco deixaria um item que aparece na tela e não abre nada.
 */
export async function excluirItem(portalId: number, id: number): Promise<string | null> {
  const linha = await queryOne<{ arquivo: string | null }>(
    'DELETE FROM acervo WHERE id = $2 AND portal_id = $1 RETURNING arquivo',
    [portalId, id],
  );
  return linha?.arquivo ?? null;
}

/**
 * O item que a rota de entrega precisa conferir antes de servir o
 * arquivo: existe, é deste portal, está publicado e é do setor da
 * pessoa. Devolve `null` quando qualquer uma dessas falha — a rota
 * responde 404 sem dizer qual delas foi.
 */
export function itemEntregavel(portalId: number, arquivo: string, setorId: number | null) {
  return queryOne<{ id: number; titulo: string; setorId: number | null }>(
    `SELECT id::int AS id, titulo, setor_id::int AS "setorId"
       FROM acervo
      WHERE portal_id = $1 AND arquivo = $2 AND status = 'PUBLICADO'
        AND (setor_id IS NULL OR setor_id = $3)`,
    [portalId, arquivo, setorId],
  );
}

/** O mesmo item, para o GESTOR: ele confere o rascunho antes de publicar. */
export function itemDoPortal(portalId: number, arquivo: string) {
  return queryOne<{ id: number; titulo: string }>(
    'SELECT id::int AS id, titulo FROM acervo WHERE portal_id = $1 AND arquivo = $2',
    [portalId, arquivo],
  );
}

/** Primeira abertura de cada pessoa. Repetir não gera linha nova. */
export function registrarLeitura(acervoId: number, usuarioId: number) {
  return query(
    `INSERT INTO acervo_leitura (acervo_id, usuario_id) VALUES ($1, $2)
     ON CONFLICT (acervo_id, usuario_id) DO NOTHING`,
    [acervoId, usuarioId],
  );
}

/** Quantas pessoas abriram cada item — a coluna "lido por" do RH. */
export function leiturasPorItem(portalId: number) {
  return query<{ acervoId: number; leitores: number }>(
    `SELECT l.acervo_id::int AS "acervoId", count(*)::int AS leitores
       FROM acervo_leitura l JOIN acervo a ON a.id = l.acervo_id
      WHERE a.portal_id = $1
      GROUP BY l.acervo_id`,
    [portalId],
  );
}
