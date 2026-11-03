-- =====================================================================
-- Página pública da universidade corporativa — administração
-- (docs/plano-pagina-da-universidade.md, §3.4 e §3.6; 10/09/2026)
--
-- Duas coisas nascem aqui. O que a EMPRESA preenche na página não precisa
-- de tabela: é `portal.personalizacao->'pagina'` (JSONB, campos de um
-- layout fixo, como o do professor).
-- =====================================================================

-- ---------- 1. Configuração da plataforma, chave/valor ----------
-- Os textos "de fábrica" da página (o que aparece quando a empresa não
-- preencheu) eram constantes no código. Para o administrador mudá-los
-- sem deploy, viram uma linha aqui. É a primeira tabela chave/valor do
-- sistema, e a única leitura dela é `lib/configuracao.ts`: nada de
-- consulta ad hoc espalhada — se um dia houver 30 chaves, o lugar de
-- listá-las é aquele módulo.
CREATE TABLE configuracao (
  chave          TEXT PRIMARY KEY,
  valor          JSONB NOT NULL,
  atualizado_por TEXT NOT NULL,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 2. Pedido de acesso ("Fale com o RH") ----------
-- Quem chega à página pública sem conta e quer entrar. A empresa é a
-- controladora (LGPD): o pedido é DELA, aponta para o portal dela, e só
-- o RH dela lê. Atender = criar o convite por link (a mesma tabela
-- `convite`, mesmo teto de contas); recusar = fechar sem convite.
CREATE TYPE status_pedido_acesso AS ENUM ('novo', 'convidado', 'recusado');

CREATE TABLE pedido_acesso (
  id            BIGSERIAL PRIMARY KEY,
  portal_id     BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL,
  setor         TEXT,                              -- texto livre: a pessoa não conhece os setores cadastrados
  mensagem      TEXT,
  status        status_pedido_acesso NOT NULL DEFAULT 'novo',
  convite_id    BIGINT REFERENCES convite(id) ON DELETE SET NULL,
  atendido_por  TEXT,
  atendido_em   TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Portal de professor não tem RH para atender: só empresa recebe pedido.
  -- A mesma trava de `materia` (db/034): o par (portal, tipo) tem de
  -- existir, e o tipo aqui é fixo em EMPRESA.
  portal_tipo   portal_tipo NOT NULL DEFAULT 'EMPRESA' CHECK (portal_tipo = 'EMPRESA'),
  CONSTRAINT pedido_acesso_so_em_empresa
    FOREIGN KEY (portal_id, portal_tipo) REFERENCES portal (id, tipo) ON UPDATE CASCADE,
  CONSTRAINT pedido_acesso_atendido_tem_autor
    CHECK (status = 'novo' OR (atendido_por IS NOT NULL AND atendido_em IS NOT NULL))
);

-- Um pedido aberto por e-mail por portal: a página pública é anônima, e
-- sem isto um clique repetido (ou um robô) enche a fila do RH.
CREATE UNIQUE INDEX pedido_acesso_um_aberto
  ON pedido_acesso (portal_id, lower(email)) WHERE status = 'novo';
CREATE INDEX pedido_acesso_portal_status ON pedido_acesso (portal_id, status, criado_em DESC);
