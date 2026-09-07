import { query, queryOne } from './db.ts';
import { interpretarBusca, consultasDeTexto } from './vademecum-consulta.ts';

export interface Norma {
  id: number; slug: string; sigla: string; nome: string;
  nomeCurto: string;
  conferidoEm: Date; fonte: string; urlFonte: string | null;
  icone: string; grupo: string; dispositivos: number;
}
export interface Dispositivo {
  id: number; rotulo: string; texto: string; agrupador: string | null;
  numero: number; normaSigla: string; normaSlug: string;
}
export interface Achado extends Dispositivo {
  trecho: string;      // o texto com o termo em destaque, para a lista
}

const CAMPOS_NORMA = `n.id, n.slug, n.sigla, n.nome, n.conferido_em AS "conferidoEm",
       coalesce(nullif(n.nome_curto, ''), n.nome) AS "nomeCurto",
       n.fonte, n.url_fonte AS "urlFonte", n.icone, n.grupo,
       (SELECT count(*)::int FROM dispositivo d WHERE d.norma_id = n.id) AS dispositivos`;

export function listarNormas() {
  return query<Norma>(`SELECT ${CAMPOS_NORMA} FROM norma n ORDER BY n.ordem`);
}

export function buscarNorma(slug: string) {
  return queryOne<Norma>(`SELECT ${CAMPOS_NORMA} FROM norma n WHERE n.slug = $1`, [slug]);
}

/**
 * Uma página da norma.
 *
 * O Código Civil tem 2.083 artigos. Mandar todos para o navegador de uma vez
 * é meio megabyte de HTML para ler um artigo — então a norma é lida como
 * livro, uma parte por vez, e o sumário leva direto ao ponto.
 */
export function dispositivosDaNorma(normaId: number, { pagina = 1, tamanho = 40 } = {}) {
  return query<Dispositivo>(
    `SELECT d.id, d.rotulo, d.texto, d.agrupador, d.numero,
            n.sigla AS "normaSigla", n.slug AS "normaSlug"
       FROM dispositivo d JOIN norma n ON n.id = d.norma_id
      WHERE d.norma_id = $1 ORDER BY d.ordem
      LIMIT $2 OFFSET $3`,
    [normaId, tamanho, (pagina - 1) * tamanho],
  );
}

/**
 * Em que página da norma um artigo caiu.
 *
 * A sugestão da busca entrega o artigo; a norma é lida por páginas de
 * quarenta. Sem esta conta, clicar no art. 927 do Código Civil abriria o
 * Código Civil no art. 1º — a norma certa, no lugar errado, 23 páginas
 * antes do artigo que o aluno pediu.
 */
export async function paginaDoDispositivo(dispositivoId: number, tamanho = 40) {
  const achado = await queryOne<{ pagina: number }>(
    `SELECT (ordem - 1) / $2 + 1 AS pagina FROM dispositivo WHERE id = $1`,
    [dispositivoId, tamanho],
  );
  return achado?.pagina ?? 1;
}

/**
 * O sumário da norma: cada título ou capítulo e a página em que ele começa.
 * É o índice do livro impresso — sem ele, achar o Livro IV do Código Civil
 * seria adivinhar em qual das 53 páginas ele está.
 */
export function sumarioDaNorma(normaId: number, tamanho = 40) {
  return query<{ agrupador: string; pagina: number; artigos: number }>(
    `SELECT agrupador,
            (min(ordem) - 1) / $2 + 1 AS pagina,
            count(*)::int AS artigos
       FROM dispositivo
      WHERE norma_id = $1 AND agrupador IS NOT NULL AND agrupador <> ''
      GROUP BY agrupador
      ORDER BY min(ordem)`,
    [normaId, tamanho],
  );
}

/**
 * Busca do vade-mécum (§5.4).
 *
 * Duas perguntas diferentes chegam pela mesma caixa, e cada uma tem o seu
 * caminho no banco:
 *
 *   por NÚMERO  — "art 5 cf" vira `numero = 5`, um índice, e devolve o
 *                 artigo 5º. Procurar "5" no texto devolveria as centenas
 *                 de artigos que REMETEM ao art. 5º, e nunca ele.
 *   por TEXTO   — índice ponderado: rótulo (A) pesa mais que apelido (B),
 *                 que pesa mais que o corpo da lei (C). A última palavra
 *                 casa por prefixo, porque ainda está sendo digitada.
 *
 * Quando as duas cabem ("art 5 igualdade"), o artigo pedido pelo número
 * vem primeiro: foi o mais específico que o aluno soube dizer.
 */
export async function buscarDispositivos(termo: string, limite = 30) {
  const consulta = interpretarBusca(termo);
  const { norma, abrir, palavras } = await resolverNorma(consulta);

  /* "cdc", "código penal", "maria da penha": a busca inteira era o nome da
     norma. O aluno não procurava uma palavra dentro dela — procurava ela, e
     o que espera ver é a lei aberta no art. 1º. */
  if (abrir && norma) return abrirNorma(norma.id, limite);

  const { completa, prefixo } = consultasDeTexto(palavras);
  if (consulta.numero === null && !completa) return [] as Achado[];

  return query<Achado>(
    `WITH pedido AS (
       SELECT $1::int AS numero, $2::text AS sufixo, $3::bigint AS norma_id,
              CASE WHEN $4 = '' THEN NULL ELSE to_tsquery('portugues_sem_acento', $4) END AS radical,
              CASE WHEN $5 = '' THEN NULL ELSE to_tsquery('portugues_prefixo', $5) END AS prefixo
     ),
     achado AS (
       SELECT d.id,
              (p.numero IS NOT NULL AND d.numero = p.numero) AS por_numero,
              (d.sufixo = p.sufixo) AS sufixo_exato,
              greatest(
                CASE WHEN p.radical IS NULL THEN 0 ELSE ts_rank(d.busca, p.radical) END,
                CASE WHEN p.prefixo IS NULL THEN 0 ELSE ts_rank(d.busca_prefixo, p.prefixo) END
              ) AS relevancia,
              n.ordem AS ordem_norma, d.ordem
         FROM dispositivo d
         JOIN norma n ON n.id = d.norma_id
         CROSS JOIN pedido p
        WHERE ((p.numero IS NOT NULL AND d.numero = p.numero
                  AND (p.sufixo = '' OR d.sufixo = p.sufixo))
            OR (p.radical IS NOT NULL AND d.busca @@ p.radical)
            OR (p.prefixo IS NOT NULL AND d.busca_prefixo @@ p.prefixo))
          AND (p.norma_id IS NULL OR d.norma_id = p.norma_id)
        ORDER BY por_numero DESC, sufixo_exato DESC, relevancia DESC, ordem_norma, d.ordem
        LIMIT $6
     )
     SELECT d.id, d.rotulo, d.texto, d.agrupador, d.numero,
            n.sigla AS "normaSigla", n.slug AS "normaSlug",
            -- sem termo de texto ("art. 5º cf") não há o que destacar: o
            -- trecho é o começo do artigo, que é o que se lê primeiro
            CASE WHEN (SELECT radical FROM pedido) IS NULL THEN left(d.texto, 200)
                 ELSE ts_headline('portugues_sem_acento', d.texto, (SELECT radical FROM pedido),
                        'MaxWords=28, MinWords=12, ShortWord=2, MaxFragments=1, StartSel=«, StopSel=»')
            END AS trecho
       FROM achado a
       JOIN dispositivo d ON d.id = a.id
       JOIN norma n ON n.id = d.norma_id
      ORDER BY a.por_numero DESC, a.sufixo_exato DESC, a.relevancia DESC, a.ordem_norma, a.ordem`,
    [consulta.numero, consulta.sufixo, norma?.id ?? null, completa, prefixo, limite],
  );
}

/**
 * Qual norma o aluno citou, e o que sobra para procurar dentro dela.
 *
 * "danos morais cdc" são duas coisas: um assunto e um código. Sem separar,
 * "cdc" seria procurado como palavra no corpo da lei — e não existe artigo
 * nenhum que escreva "cdc", então a busca inteira devolveria zero.
 *
 * A separação é cautelosa de propósito. "consumidor" também está entre os
 * apelidos do CDC, mas quem digita a palavra sozinha está procurando o
 * assunto, e restringir ao CDC esconderia o art. 5º, XXXII, da Constituição.
 * Por isso só conta como citação de norma o que é escrito como citação: uma
 * sigla curta ("cdc", "cf", "cp") ou o nome dela por inteiro.
 */
async function resolverNorma(consulta: { numero: number | null; palavras: string[] }) {
  const { palavras, numero } = consulta;

  if (palavras.length && numero === null) {
    const nomeInteiro = consultasDeTexto(palavras).completa;
    const candidata = await normaPorApelido(nomeInteiro);
    // uma palavra só vale como nome de norma se for sigla; "improbidade"
    // é assunto, "lia" é norma
    if (candidata && (palavras.length > 1 || palavras[0].length <= 5)) {
      return { norma: candidata, abrir: true, palavras: [] };
    }
  }

  for (const palavra of palavras) {
    if (palavra.length > 5) continue;    // sigla é curta; assunto, não
    const citada = await normaPorApelido(consultasDeTexto([palavra]).completa);
    if (citada) {
      return { norma: citada, abrir: false, palavras: palavras.filter((p) => p !== palavra) };
    }
  }

  /* "8112", "11340": o número que sobrou sozinho não é artigo de código
     nenhum — é o número da lei, que é como muita gente a chama. */
  if (numero !== null && palavras.length === 0) {
    const pelaNumeracao = await normaPorApelido(String(numero));
    if (pelaNumeracao) return { norma: pelaNumeracao, abrir: true, palavras: [] };
  }

  return { norma: null, abrir: false, palavras };
}

/**
 * A norma é procurada por palavra inteira, e não por prefixo: "cp" digitado
 * por prefixo casaria com "cpc", e o art. 121 do Código Penal viraria o
 * art. 121 do Código de Processo Civil — silenciosamente, que é o pior jeito
 * de errar.
 */
function normaPorApelido(completa: string) {
  if (!completa) return Promise.resolve(null);
  return queryOne<{ id: number; apelidos: string }>(
    `SELECT id, apelidos FROM norma
      WHERE to_tsvector('portugues_sem_acento', coalesce(apelidos, '')) @@ to_tsquery('portugues_sem_acento', $1)
      ORDER BY ordem LIMIT 1`,
    [completa],
  );
}

function abrirNorma(normaId: number, limite: number) {
  return query<Achado>(
    `SELECT d.id, d.rotulo, d.texto, d.agrupador, d.numero,
            n.sigla AS "normaSigla", n.slug AS "normaSlug", left(d.texto, 180) AS trecho
       FROM dispositivo d JOIN norma n ON n.id = d.norma_id
      WHERE d.norma_id = $1 ORDER BY d.ordem LIMIT $2`,
    [normaId, limite],
  );
}

/** A lista que aparece embaixo da caixa enquanto se digita: curta, e já. */
export function sugerirDispositivos(termo: string, limite = 8) {
  return buscarDispositivos(termo, limite);
}

/**
 * Deep link bidirecional: as aulas que explicam um dispositivo (§5.4).
 *
 * A lei é comum a todos (não tem dono nem portal), mas a AULA tem: sem o
 * escopo, o vade-mécum da plataforma anunciaria aulas do portal de um
 * professor, e o dele anunciaria as nossas.
 */
export function aulasQueExplicam(portalId: number, dispositivoIds: number[]) {
  if (dispositivoIds.length === 0) {
    return Promise.resolve([] as { dispositivoId: number; slug: string; titulo: string }[]);
  }
  /* Uma consulta para a página inteira, e não uma por artigo: com 40
     artigos na tela, o laço custaria 40 idas ao banco para, quase sempre,
     não achar nada. */
  return query<{ dispositivoId: number; slug: string; titulo: string; materiaNome: string }>(
    `SELECT ad.dispositivo_id AS "dispositivoId", au.slug, au.titulo, m.nome AS "materiaNome"
       FROM aula_dispositivo ad
       JOIN aula au ON au.id = ad.aula_id
       JOIN assunto s ON s.id = au.assunto_id
       JOIN materia m ON m.id = s.materia_id
      WHERE ad.dispositivo_id = ANY($2) AND au.portal_id = $1
        AND au.status = 'publicado'`,
    [portalId, dispositivoIds],
  );
}

/** Dispositivos vinculados a uma aula — alimenta o painel lateral. */
export function dispositivosDaAula(aulaId: number) {
  return query<Dispositivo>(
    `SELECT d.id, d.rotulo, d.texto, d.agrupador, d.numero,
            n.sigla AS "normaSigla", n.slug AS "normaSlug"
       FROM aula_dispositivo ad
       JOIN dispositivo d ON d.id = ad.dispositivo_id
       JOIN norma n ON n.id = d.norma_id
      WHERE ad.aula_id = $1 ORDER BY n.ordem, d.ordem`,
    [aulaId],
  );
}

/**
 * Os artigos que a Calculadora Penal cita (§5.12), por (norma, rótulo).
 *
 * O catálogo da calculadora guarda só a referência; o TEXTO da lei continua
 * vindo daqui, com o carimbo de conferência. Uma consulta para o resultado
 * inteiro: um cálculo cita vinte artigos, e vinte idas ao banco por página
 * seriam o custo errado.
 */
export async function dispositivosPorReferencia(refs: { norma: string; rotulo: string }[]) {
  const mapa = new Map<string, Dispositivo>();
  if (refs.length === 0) return mapa;
  const chaves = [...new Set(refs.map((r) => `${r.norma}|${r.rotulo}`))];
  const normas = chaves.map((k) => k.split('|')[0]);
  const rotulos = chaves.map((k) => k.split('|')[1]);
  const linhas = await query<Dispositivo>(
    `SELECT d.id, d.rotulo, d.texto, d.agrupador, d.numero,
            n.sigla AS "normaSigla", n.slug AS "normaSlug"
       FROM unnest($1::text[], $2::text[]) AS pedido(slug, rotulo)
       JOIN norma n ON n.slug = pedido.slug
       JOIN dispositivo d ON d.norma_id = n.id AND d.rotulo = pedido.rotulo`,
    [normas, rotulos],
  );
  for (const d of linhas) mapa.set(`${d.normaSlug}|${d.rotulo}`, d);
  return mapa;
}
