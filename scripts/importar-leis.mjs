#!/usr/bin/env node
/**
 * Importa o acervo do vade-mécum (§5.4) dos textos consolidados do Planalto.
 *
 *   npm run leis              # importa o catálogo inteiro
 *   npm run leis -- cf-88 cp  # só as normas pedidas
 *   npm run leis -- --listar  # mostra o catálogo, sem tocar no banco
 *
 * Roda quantas vezes for preciso: a norma é atualizada no lugar, e não
 * apagada e recriada. Isso não é economia de escrita — é o que preserva o
 * vínculo aula ↔ artigo (§5.4) e os apelidos de busca, que são nossos e não
 * voltariam do Planalto se fossem apagados junto.
 */
import pg from 'pg';
import { lerNorma } from '../lib/planalto.ts';

const BASE = 'https://www.planalto.gov.br/ccivil_03/';

/* Recorte do acervo: a lista do §5.4 e as leis que aparecem no dia a dia de
   quem estuda para prova e para a OAB. Cada linha é uma norma na tela do
   aluno — mexer aqui é mexer no sumário do vade-mécum. */
const CATALOGO = [
  { slug: 'cf-88', curto: 'Constituição Federal', sigla: 'CF/88', grupo: 'Constituição', icone: 'account_balance',
    nome: 'Constituição da República Federativa do Brasil de 1988',
    caminho: 'constituicao/constituicao.htm', ate: /^ATO DAS DISPOSI[ÇC][ÕO]ES CONSTITUCIONAIS TRANSIT/i,
    apelidos: 'cf cf88 constituicao constituição federal carta magna lei maior constitucional' },
  { slug: 'adct', curto: 'ADCT', sigla: 'ADCT', grupo: 'Constituição', icone: 'history_edu',
    nome: 'Ato das Disposições Constitucionais Transitórias',
    caminho: 'constituicao/constituicao.htm', de: /^ATO DAS DISPOSI[ÇC][ÕO]ES CONSTITUCIONAIS TRANSIT/i,
    apelidos: 'adct disposicoes disposições transitorias transitórias ato' },

  { slug: 'cc', curto: 'Código Civil', sigla: 'CC', grupo: 'Códigos', icone: 'balance',
    nome: 'Lei 10.406/02 — Código Civil', caminho: 'leis/2002/l10406compilada.htm',
    apelidos: 'cc codigo código civil civilista' },
  { slug: 'cpc', curto: 'Código de Processo Civil', sigla: 'CPC', grupo: 'Códigos', icone: 'menu_book',
    nome: 'Lei 13.105/15 — Código de Processo Civil', caminho: '_ato2015-2018/2015/lei/l13105.htm',
    apelidos: 'cpc codigo código processo civil processual' },
  { slug: 'cp', curto: 'Código Penal', sigla: 'CP', grupo: 'Códigos', icone: 'gavel',
    nome: 'Decreto-Lei 2.848/40 — Código Penal', caminho: 'decreto-lei/del2848compilado.htm',
    apelidos: 'cp codigo código penal crime crimes' },
  { slug: 'cpp', curto: 'Código de Processo Penal', sigla: 'CPP', grupo: 'Códigos', icone: 'policy',
    nome: 'Decreto-Lei 3.689/41 — Código de Processo Penal', caminho: 'decreto-lei/del3689compilado.htm',
    apelidos: 'cpp codigo código processo penal processual penal' },
  { slug: 'clt', curto: 'CLT', sigla: 'CLT', grupo: 'Códigos', icone: 'work',
    nome: 'Decreto-Lei 5.452/43 — Consolidação das Leis do Trabalho', caminho: 'decreto-lei/del5452compilado.htm',
    apelidos: 'clt consolidacao consolidação trabalho trabalhista trabalhista celetista' },
  { slug: 'cdc', curto: 'Código do Consumidor', sigla: 'CDC', grupo: 'Códigos', icone: 'loyalty',
    nome: 'Lei 8.078/90 — Código de Defesa do Consumidor', caminho: 'leis/l8078compilado.htm',
    apelidos: 'cdc codigo código defesa consumidor consumerista' },
  { slug: 'ctn', curto: 'Código Tributário Nacional', sigla: 'CTN', grupo: 'Códigos', icone: 'receipt_long',
    nome: 'Lei 5.172/66 — Código Tributário Nacional', caminho: 'leis/l5172compilado.htm',
    apelidos: 'ctn codigo código tributario tributário tributos fiscal' },

  { slug: 'eca', curto: 'ECA', sigla: 'ECA', grupo: 'Estatutos', icone: 'child_care',
    nome: 'Lei 8.069/90 — Estatuto da Criança e do Adolescente', caminho: 'leis/l8069.htm',
    apelidos: 'eca estatuto crianca criança adolescente menor' },
  { slug: 'estatuto-oab', curto: 'Estatuto da OAB', sigla: 'EAOAB', grupo: 'Estatutos', icone: 'school',
    nome: 'Lei 8.906/94 — Estatuto da Advocacia e da OAB', caminho: 'leis/l8906.htm',
    apelidos: 'oab eaoab estatuto advocacia advogado ordem advogados etica ética' },
  { slug: 'estatuto-idoso', curto: 'Estatuto da Pessoa Idosa', sigla: 'Idoso', grupo: 'Estatutos', icone: 'elderly',
    nome: 'Lei 10.741/03 — Estatuto da Pessoa Idosa', caminho: 'leis/2003/l10.741.htm',
    apelidos: 'idoso idosa estatuto pessoa idosa terceira idade' },

  { slug: 'lindb', curto: 'LINDB', sigla: 'LINDB', grupo: 'Leis', icone: 'foundation',
    nome: 'Decreto-Lei 4.657/42 — Lei de Introdução às Normas do Direito Brasileiro',
    caminho: 'decreto-lei/del4657compilado.htm',
    apelidos: 'lindb licc introducao introdução normas direito brasileiro' },
  { slug: 'maria-da-penha', curto: 'Lei Maria da Penha', sigla: 'L. Maria da Penha', grupo: 'Leis', icone: 'shield_person',
    nome: 'Lei 11.340/06 — Lei Maria da Penha', caminho: '_ato2004-2006/2006/lei/l11340.htm',
    apelidos: 'maria penha violencia violência domestica doméstica mulher familiar' },
  { slug: 'improbidade', curto: 'Improbidade Administrativa', sigla: 'LIA', grupo: 'Leis', icone: 'report',
    nome: 'Lei 8.429/92 — Lei de Improbidade Administrativa', caminho: 'leis/l8429.htm',
    apelidos: 'lia improbidade administrativa 8429 agente publico público' },
  { slug: 'lei-8112', curto: 'Servidores Federais', sigla: 'L. 8.112/90', grupo: 'Leis', icone: 'badge',
    nome: 'Lei 8.112/90 — Regime Jurídico dos Servidores Públicos Federais', caminho: 'leis/l8112cons.htm',
    apelidos: '8112 servidor servidores estatutario estatutário regime juridico jurídico unico único federal' },
  { slug: 'lei-9784', curto: 'Processo Administrativo', sigla: 'L. 9.784/99', grupo: 'Leis', icone: 'fact_check',
    nome: 'Lei 9.784/99 — Processo Administrativo Federal', caminho: 'leis/l9784.htm',
    apelidos: '9784 processo administrativo federal administracao administração' },
  { slug: 'licitacoes', curto: 'Licitações e Contratos', sigla: 'L. 14.133/21', grupo: 'Leis', icone: 'handshake',
    nome: 'Lei 14.133/21 — Licitações e Contratos Administrativos', caminho: '_ato2019-2022/2021/lei/l14133.htm',
    apelidos: '14133 licitacao licitação licitacoes licitações contratos administrativos pregao pregão' },
  { slug: 'lep', curto: 'Execução Penal', sigla: 'LEP', grupo: 'Leis', icone: 'lock',
    nome: 'Lei 7.210/84 — Lei de Execução Penal', caminho: 'leis/l7210.htm',
    apelidos: 'lep execucao execução penal presos preso pena cumprimento' },
  { slug: 'drogas', curto: 'Lei de Drogas', sigla: 'L. 11.343/06', grupo: 'Leis', icone: 'medication',
    nome: 'Lei 11.343/06 — Lei de Drogas', caminho: '_ato2004-2006/2006/lei/l11343.htm',
    apelidos: '11343 drogas toxicos tóxicos entorpecentes trafico tráfico' },
  { slug: 'lei-8212', curto: 'Custeio da Seguridade', sigla: 'L. 8.212/91', grupo: 'Leis', icone: 'savings',
    nome: 'Lei 8.212/91 — Custeio da Seguridade Social', caminho: 'leis/l8212cons.htm',
    apelidos: '8212 custeio seguridade social contribuicao contribuição previdenciaria previdenciária' },
  { slug: 'lei-8213', curto: 'Benefícios da Previdência', sigla: 'L. 8.213/91', grupo: 'Leis', icone: 'elderly',
    nome: 'Lei 8.213/91 — Planos de Benefícios da Previdência Social', caminho: 'leis/l8213cons.htm',
    apelidos: '8213 beneficios benefícios previdencia previdência social aposentadoria inss' },

  /* Leis penais que a Calculadora Penal (§5.12) cita em regime, progressão e
     institutos despenalizadores. Sem elas no acervo, o link "ver o artigo"
     do resultado não teria para onde apontar. */
  { slug: 'hediondos', curto: 'Crimes Hediondos', sigla: 'L. 8.072/90', grupo: 'Leis penais', icone: 'report',
    nome: 'Lei 8.072/90 — Crimes Hediondos', caminho: 'leis/l8072.htm',
    apelidos: '8072 hediondos hediondo crimes hediondos' },
  { slug: 'lei-9099', curto: 'Juizados Especiais', sigla: 'L. 9.099/95', grupo: 'Leis penais', icone: 'balance',
    nome: 'Lei 9.099/95 — Juizados Especiais Cíveis e Criminais', caminho: 'leis/l9099.htm',
    apelidos: '9099 juizados especiais jecrim transacao transação penal suspensao suspensão condicional processo' },
  { slug: 'tortura', curto: 'Lei de Tortura', sigla: 'L. 9.455/97', grupo: 'Leis penais', icone: 'shield_person',
    nome: 'Lei 9.455/97 — Crimes de Tortura', caminho: 'leis/l9455.htm',
    apelidos: '9455 tortura' },
  { slug: 'ctb', curto: 'Código de Trânsito', sigla: 'CTB', grupo: 'Leis penais', icone: 'policy',
    nome: 'Lei 9.503/97 — Código de Trânsito Brasileiro', caminho: 'leis/l9503compilado.htm',
    apelidos: 'ctb codigo código transito trânsito embriaguez volante' },
  { slug: 'ambiental', curto: 'Crimes Ambientais', sigla: 'L. 9.605/98', grupo: 'Leis penais', icone: 'public',
    nome: 'Lei 9.605/98 — Crimes Ambientais', caminho: 'leis/l9605.htm',
    apelidos: '9605 ambiental ambientais meio ambiente crimes ambientais' },
  { slug: 'lavagem', curto: 'Lavagem de Dinheiro', sigla: 'L. 9.613/98', grupo: 'Leis penais', icone: 'payments',
    nome: 'Lei 9.613/98 — Lavagem de Dinheiro', caminho: 'leis/l9613compilado.htm',
    apelidos: '9613 lavagem dinheiro capitais ocultacao ocultação bens' },
  { slug: 'desarmamento', curto: 'Estatuto do Desarmamento', sigla: 'L. 10.826/03', grupo: 'Leis penais', icone: 'lock',
    nome: 'Lei 10.826/03 — Estatuto do Desarmamento', caminho: 'leis/2003/l10.826compilado.htm',
    apelidos: '10826 desarmamento arma armas fogo porte posse' },
  { slug: 'organizacao-criminosa', curto: 'Organização Criminosa', sigla: 'L. 12.850/13', grupo: 'Leis penais', icone: 'group',
    nome: 'Lei 12.850/13 — Organização Criminosa', caminho: '_ato2011-2014/2013/lei/l12850.htm',
    apelidos: '12850 organizacao organização criminosa orcrim colaboracao colaboração premiada' },
  { slug: 'abuso-de-autoridade', curto: 'Abuso de Autoridade', sigla: 'L. 13.869/19', grupo: 'Leis penais', icone: 'admin_panel_settings',
    nome: 'Lei 13.869/19 — Abuso de Autoridade', caminho: '_ato2019-2022/2019/lei/l13869.htm',
    apelidos: '13869 abuso autoridade' },
  { slug: 'contravencoes', curto: 'Contravenções Penais', sigla: 'LCP', grupo: 'Leis penais', icone: 'gavel',
    nome: 'Decreto-Lei 3.688/41 — Lei das Contravenções Penais', caminho: 'decreto-lei/del3688.htm',
    apelidos: 'lcp contravencao contravenção contravencoes contravenções penais vias de fato' },
  { slug: 'racismo', curto: 'Lei do Racismo', sigla: 'L. 7.716/89', grupo: 'Leis penais', icone: 'group',
    nome: 'Lei 7.716/89 — Crimes de Preconceito de Raça ou de Cor', caminho: 'leis/l7716.htm',
    apelidos: '7716 racismo preconceito raca raça cor injuria injúria racial' },
];

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://aprimore:aprimore@localhost:5432/aprimoreosaber',
});

/**
 * O Planalto publica cada lei na codificação que o editor usou no dia:
 * windows-1252 na maioria, UTF-16 na Lei Maria da Penha, UTF-8 nas mais
 * recentes. Errar isso não quebra a importação — ela grava "artigo 5Âº" e
 * segue, o que é pior. Por isso a codificação é decidida por evidência.
 */
function decodificar(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  if (bytes[0] === 0xef && bytes[1] === 0xbb) return new TextDecoder('utf-8').decode(bytes);

  const latin = new TextDecoder('windows-1252').decode(bytes);
  // "Ã§", "Ã£", "Â§": marca de UTF-8 lido como latin — se aparece muitas
  // vezes, a página é UTF-8 sem BOM e sem declaração honesta
  const suspeitas = (latin.match(/Ã[£§©¡³ºª]|Â[§ºª°]/g) ?? []).length;
  return suspeitas > 20 ? new TextDecoder('utf-8').decode(bytes) : latin;
}

async function baixar(caminho, tentativas = 3) {
  const url = BASE + caminho;
  for (let i = 1; i <= tentativas; i++) {
    try {
      // sem User-Agent de navegador o Planalto derruba a conexão
      const resposta = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AprimoreOSaber/1.0)' } });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      return { url, html: decodificar(new Uint8Array(await resposta.arrayBuffer())) };
    } catch (erro) {
      if (i === tentativas) throw erro;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

async function gravarNorma(cliente, norma, url, dispositivos) {
  const { rows: [{ id }] } = await cliente.query(
    `INSERT INTO norma (slug, sigla, nome, nome_curto, conferido_em, fonte, ordem, icone, grupo, url_fonte, apelidos)
          VALUES ($1, $2, $3, $9, CURRENT_DATE, 'Planalto — texto consolidado', $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO UPDATE
            SET sigla = EXCLUDED.sigla, nome = EXCLUDED.nome, nome_curto = EXCLUDED.nome_curto,
                fonte = EXCLUDED.fonte,
                conferido_em = EXCLUDED.conferido_em, ordem = EXCLUDED.ordem,
                icone = EXCLUDED.icone, grupo = EXCLUDED.grupo, url_fonte = EXCLUDED.url_fonte,
                apelidos = EXCLUDED.apelidos
      RETURNING id`,
    [norma.slug, norma.sigla, norma.nome, norma.ordem, norma.icone, norma.grupo, url,
     norma.apelidos, norma.curto],
  );

  /* Um INSERT por artigo seriam 30 mil idas ao banco. O `unnest` manda a
     norma inteira numa consulta só, e o ON CONFLICT atualiza o artigo que
     já existe — mantendo o id, e com ele o vínculo com a aula. */
  await cliente.query(
    `INSERT INTO dispositivo (norma_id, rotulo, texto, agrupador, ordem, numero, sufixo)
     SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::int[], $6::int[], $7::text[])
     ON CONFLICT (norma_id, rotulo) DO UPDATE
            SET texto = EXCLUDED.texto, agrupador = EXCLUDED.agrupador,
                ordem = EXCLUDED.ordem, numero = EXCLUDED.numero, sufixo = EXCLUDED.sufixo`,
    [
      id,
      dispositivos.map((d) => d.rotulo),
      dispositivos.map((d) => d.texto),
      dispositivos.map((d) => d.agrupador || null),
      dispositivos.map((d) => d.ordem),
      dispositivos.map((d) => d.numero),
      dispositivos.map((d) => d.sufixo),
    ],
  );

  return { id, sobras: await limparSobras(cliente, id, dispositivos.map((d) => d.rotulo)) };
}

/**
 * O que estava na norma e não veio na importação é sobra: artigo revogado
 * que saiu do texto consolidado, ou dispositivo da amostra do protótipo
 * ("Art. 5º, § 1º" era uma linha própria; agora o § 1º vive dentro do
 * art. 5º).
 *
 * Apagar a sobra direto levaria junto o que ela carrega de nosso — a aula
 * que explica o dispositivo e os apelidos de busca. Então, antes de sair,
 * ela entrega as duas coisas ao artigo de mesmo número, que é onde o aluno
 * vai procurar a partir de agora.
 */
async function limparSobras(cliente, normaId, rotulosImportados) {
  /* A herança é calculada uma vez e guardada, porque as cinco operações
     seguintes precisam da MESMA lista. Postgres não garante a ordem entre
     comandos que alteram dados dentro de um único WITH — e uma anotação
     movida por um ramo enquanto outro apaga a linha de origem é exatamente
     o caso que ele avisa não suportar. Separado, é só sequência. */
  await cliente.query(
    `CREATE TEMP TABLE herdeiro ON COMMIT DROP AS
       SELECT s.id AS sobra_id, s.apelidos,
              (SELECT v.id FROM dispositivo v
                WHERE v.norma_id = $1 AND v.numero = s.numero AND v.rotulo = ANY($2)
                ORDER BY v.ordem LIMIT 1) AS artigo_id
         FROM dispositivo s
        WHERE s.norma_id = $1 AND NOT (s.rotulo = ANY($2))`,
    [normaId, rotulosImportados],
  );

  await cliente.query(
    `INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
     SELECT ad.aula_id, h.artigo_id
       FROM aula_dispositivo ad JOIN herdeiro h ON h.sobra_id = ad.dispositivo_id
      WHERE h.artigo_id IS NOT NULL
     ON CONFLICT DO NOTHING`);

  await cliente.query(
    `INSERT INTO favorito (usuario_id, dispositivo_id)
     SELECT f.usuario_id, h.artigo_id
       FROM favorito f JOIN herdeiro h ON h.sobra_id = f.dispositivo_id
      WHERE h.artigo_id IS NOT NULL
     ON CONFLICT DO NOTHING`);

  await cliente.query(
    `UPDATE anotacao a SET dispositivo_id = h.artigo_id
       FROM herdeiro h
      WHERE a.dispositivo_id = h.sobra_id AND h.artigo_id IS NOT NULL`);

  await cliente.query(
    `UPDATE dispositivo v
        SET apelidos = trim(both ' ' from coalesce(v.apelidos, '') || ' ' || h.apelidos)
       FROM herdeiro h
      WHERE v.id = h.artigo_id AND h.apelidos IS NOT NULL`);

  const { rowCount } = await cliente.query(
    'DELETE FROM dispositivo WHERE id IN (SELECT sobra_id FROM herdeiro)');
  await cliente.query('DROP TABLE herdeiro');
  return rowCount;
}

async function importar(norma) {
  const { url, html } = await baixar(norma.caminho);
  const dispositivos = lerNorma(html, { de: norma.de, ate: norma.ate });
  if (dispositivos.length === 0) throw new Error('nenhum artigo reconhecido na página');

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const { sobras } = await gravarNorma(cliente, norma, url, dispositivos);
    await cliente.query('COMMIT');
    return { artigos: dispositivos.length, ultimo: dispositivos[dispositivos.length - 1].rotulo, sobras };
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

/**
 * O acervo já foi importado alguma vez?
 *
 * A pergunta existe por causa do start do container, que chama o importador
 * a cada subida. Sem ela, toda reinicialização baixaria 22 páginas do
 * Planalto para reescrever o que já está no banco — três minutos de espera e
 * um pedido inútil ao servidor de terceiro, várias vezes por dia.
 */
async function acervoJaImportado() {
  const { rows: [{ tem }] } = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM norma WHERE fonte LIKE 'Planalto%') AS tem`);
  return tem;
}

async function main() {
  const argumentos = process.argv.slice(2);
  if (argumentos.includes('--listar')) {
    for (const n of CATALOGO) console.log(`${n.slug.padEnd(18)} ${n.grupo.padEnd(14)} ${n.nome}`);
    return;
  }

  if (argumentos.includes('--se-necessario') && await acervoJaImportado()) {
    console.log('acervo do vade-mécum já importado — nada a fazer');
    return;
  }

  const pedidos = argumentos.filter((a) => !a.startsWith('--'));
  const alvos = CATALOGO
    .map((n, i) => ({ ...n, ordem: i + 1 }))
    .filter((n) => pedidos.length === 0 || pedidos.includes(n.slug));

  const desconhecidos = pedidos.filter((p) => !CATALOGO.some((n) => n.slug === p));
  if (desconhecidos.length) {
    console.error(`norma fora do catálogo: ${desconhecidos.join(', ')} (veja --listar)`);
    process.exitCode = 1;
    return;
  }

  let total = 0;
  const falhas = [];
  for (const norma of alvos) {
    process.stdout.write(`· ${norma.slug} …\r`);
    try {
      const { artigos, ultimo, sobras } = await importar(norma);
      total += artigos;
      console.log(`✔ ${norma.slug.padEnd(18)} ${String(artigos).padStart(5)} artigos (até ${ultimo})`
        + `${sobras ? ` · ${sobras} da amostra antiga substituídos` : ''}`);
    } catch (erro) {
      falhas.push(norma.slug);
      console.error(`✘ ${norma.slug.padEnd(18)} ${erro.message}`);
    }
  }

  const importadas = alvos.length - falhas.length;
  console.log(`\n${total} dispositivos no acervo em ${importadas} ${importadas === 1 ? 'norma' : 'normas'}.`);
  if (falhas.length) {
    console.error(`falharam: ${falhas.join(', ')}`);
    process.exitCode = 1;
  }
}

main()
  .catch((erro) => { console.error(erro); process.exitCode = 1; })
  .finally(() => pool.end());
