-- =====================================================================
-- A Biblioteca da empresa — o acervo que o RH disponibiliza à equipe.
--
-- No portal de uma empresa o menu tinha um item "Biblioteca" que levava
-- ao vade-mécum: consulta a leis e códigos, produto da plataforma
-- jurídica. Para uma empresa cujas trilhas são integração, LGPD,
-- liderança e IA, aquilo não era a biblioteca dela — era a nossa.
--
-- Esta tabela é a biblioteca dela: livro em PDF, apostila, artigo,
-- política interna, ou LINK para algo que a empresa já hospeda. O
-- colaborador folheia por assunto e por autor; o RH publica pelo painel.
--
-- Por que não reaproveitar `material_apoio` (db/001): aquilo é anexo DE
-- UMA AULA (`aula_id NOT NULL`), sem portal, sem autor, sem assunto e
-- sem publicação — e nunca ganhou rota de envio nem de entrega. O acervo
-- é do PORTAL e existe independente de trilha; forçá-lo naquela tabela
-- pediria uma aula fantasma para pendurar cada livro.
-- =====================================================================

CREATE TYPE acervo_formato AS ENUM ('PDF', 'LINK');
CREATE TYPE acervo_status  AS ENUM ('RASCUNHO', 'PUBLICADO');

CREATE TABLE acervo (
  id            BIGSERIAL PRIMARY KEY,
  portal_id     BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  autor         TEXT,
  -- Etiquetas livres ('LGPD', 'Liderança'), e não uma tabela de
  -- assuntos: o filtro nasce do DISTINCT do que já foi publicado. Com
  -- tabela, o RH teria de cadastrar taxonomia antes do primeiro livro —
  -- e o primeiro livro é o que prova que a Biblioteca serve.
  assuntos      TEXT[] NOT NULL DEFAULT '{}',
  descricao     TEXT,
  formato       acervo_formato NOT NULL,
  -- Nome no volume de mídia: p<portal>-acervo<id>-<aleatório>.pdf. Como
  -- em vídeo e imagem, o nome carrega o portal no prefixo — é ele que
  -- `pertenceAoPortal` lê para saber de quem é o arquivo sem ir ao banco.
  arquivo       TEXT,
  -- Tamanho do arquivo: entra na cota de GB do plano, junto com vídeo e
  -- material de apoio (lib/portal-financeiro.ts). Sem esta coluna, o
  -- acervo ocuparia o volume sem aparecer em lugar nenhum da fatura.
  bytes         BIGINT,
  url           TEXT,
  capa          TEXT,
  ano           INT,
  editora       TEXT,
  -- NULL = toda a empresa. É a mesma unidade que `atribuicao` usa para
  -- liberar trilha: o manual de vendas não precisa aparecer para o
  -- financeiro.
  setor_id      BIGINT,
  status        acervo_status NOT NULL DEFAULT 'RASCUNHO',
  -- SET NULL, e nao a recusa padrao: o item do acervo sobrevive a quem o
  -- subiu. Sem isto, desligar um gestor que ja publicou material seria
  -- impossivel sem apagar o material junto.
  criado_por    BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Item publicado sem conteúdo seria um cartão que não abre nada. O
  -- CHECK é o que dispensa a tela de avisar "publicado mas vazio", como
  -- a de trilhas precisa fazer.
  CONSTRAINT acervo_tem_conteudo CHECK (
    (formato = 'PDF'  AND arquivo IS NOT NULL AND url IS NULL) OR
    (formato = 'LINK' AND url IS NOT NULL AND arquivo IS NULL)
  ),
  CONSTRAINT acervo_ano_plausivel CHECK (ano IS NULL OR (ano BETWEEN 1400 AND 2200)),
  CONSTRAINT acervo_titulo_nao_vazio CHECK (btrim(titulo) <> ''),

  -- Setor de OUTRO portal num item do acervo seria o vazamento do §15.14
  -- pela porta dos fundos: a Biblioteca da empresa A filtrando pelos
  -- setores da B. `SET NULL (setor_id)` (Postgres 15+; o compose usa o
  -- 16) zera SÓ o setor ao excluí-lo — sem a lista de colunas, o
  -- `portal_id` iria junto e o item viraria órfão de portal.
  CONSTRAINT acervo_setor_mesmo_portal FOREIGN KEY (setor_id, portal_id)
    REFERENCES setor (id, portal_id) ON DELETE SET NULL (setor_id)
);

-- A consulta do colaborador é sempre (portal, publicado); a do RH é
-- (portal, tudo). O índice serve às duas.
CREATE INDEX acervo_portal_status ON acervo (portal_id, status);
-- `assuntos @> ARRAY['LGPD']` — o filtro por etiqueta da tela.
CREATE INDEX acervo_assuntos ON acervo USING GIN (assuntos);

-- SEM índice para a busca por texto, de propósito. Ela é
-- `normaliza_busca(titulo || autor) LIKE '%termo%'`, e curinga à
-- ESQUERDA não usa índice btree — o índice existiria só para enfeitar o
-- diff. Um GIN de trigrama resolveria, mas pede a extensão pg_trgm por
-- causa de uma tabela que tem dezenas de linhas por portal, filtradas
-- antes por `acervo_portal_status`. Quando alguma empresa passar de uns
-- milhares de itens, é aqui que se acrescenta.

-- Quem abriu o quê. Serve ao RH ("lido por 14 de 32") e é gravada pela
-- rota de entrega, no primeiro acesso de cada pessoa. Chave composta
-- porque a pergunta é "esta pessoa já abriu?", não "quantas vezes":
-- contar aberturas transformaria a tabela num log que ninguém poda.
CREATE TABLE acervo_leitura (
  acervo_id  BIGINT NOT NULL REFERENCES acervo(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  aberto_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (acervo_id, usuario_id)
);
