-- =====================================================================
-- Compra de cursos do catálogo pela empresa — docs/plano-perfis-e-acessos.md,
-- etapa 6 (revista em 10/09/2026).
--
-- A empresa (portal EMPRESA, com subdomínio ou domínio próprio) compra
-- VAGAS de um curso do catálogo da plataforma para os colaboradores. Até
-- o limite que o curso declara, paga na hora; acima, pede orçamento. O
-- pagamento vira um LOTE de vagas; cada vaga distribuída vira uma licença
-- B2B no perfil do colaborador, apontando para o curso da plataforma.
-- =====================================================================

-- ---------- o limite é um parâmetro do curso ----------
-- Pedido do responsável (10/09/2026): "deixe a quantidade ser um parâmetro
-- na tela de cadastro do curso" — vale para curso da plataforma e para
-- curso de portal compartilhado na vitrine. Acima disso, orçamento.
ALTER TABLE materia ADD COLUMN vagas_sem_orcamento INT NOT NULL DEFAULT 10
  CHECK (vagas_sem_orcamento >= 0);

-- ---------- o pedido sabe quantas vagas e para qual empresa ----------
ALTER TABLE pedido ADD COLUMN quantidade INT NOT NULL DEFAULT 1 CHECK (quantidade >= 1);
ALTER TABLE pedido ADD COLUMN empresa_portal_id BIGINT REFERENCES portal(id);
-- Compra de empresa é venda da PLATAFORMA (portal 0), sempre.
ALTER TABLE pedido ADD CONSTRAINT pedido_empresa_so_na_plataforma
  CHECK (empresa_portal_id IS NULL OR portal_id = 0);

-- ---------- o orçamento ----------
CREATE TYPE status_orcamento AS ENUM ('novo', 'proposto', 'aceito', 'recusado', 'cancelado');

CREATE TABLE orcamento_empresa (
  id                 BIGSERIAL PRIMARY KEY,
  portal_id          BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,   -- a empresa
  materia_id         BIGINT NOT NULL,
  materia_portal_id  BIGINT NOT NULL,
  quantidade         INT NOT NULL CHECK (quantidade >= 1),
  mensagem           TEXT,
  status             status_orcamento NOT NULL DEFAULT 'novo',
  solicitado_por     TEXT NOT NULL,
  -- a resposta do comercial: o valor total proposto e o texto
  valor_centavos     INT CHECK (valor_centavos IS NULL OR valor_centavos >= 0),
  resposta           TEXT,
  respondido_por     TEXT,
  respondido_em      TIMESTAMPTZ,
  -- o aceite vira um pedido a pagar pelo checkout de sempre
  pedido_id          BIGINT REFERENCES pedido(id),
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orcamento_materia_existe FOREIGN KEY (materia_id, materia_portal_id)
    REFERENCES materia (id, portal_id),
  CONSTRAINT orcamento_proposto_com_valor CHECK (status <> 'proposto' OR valor_centavos IS NOT NULL)
);
CREATE INDEX orcamento_empresa_portal_idx ON orcamento_empresa (portal_id, status);

-- ---------- o lote de vagas ----------
CREATE TABLE licenca_lote (
  id                 BIGSERIAL PRIMARY KEY,
  portal_id          BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,   -- a empresa
  materia_id         BIGINT NOT NULL,
  materia_portal_id  BIGINT NOT NULL,
  quantidade         INT NOT NULL CHECK (quantidade >= 1),
  pedido_id          BIGINT REFERENCES pedido(id),
  orcamento_id       BIGINT REFERENCES orcamento_empresa(id),
  inicio_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim_em             TIMESTAMPTZ NOT NULL,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lote_materia_existe FOREIGN KEY (materia_id, materia_portal_id)
    REFERENCES materia (id, portal_id),
  CONSTRAINT lote_vigencia CHECK (fim_em > inicio_em)
);
CREATE INDEX licenca_lote_portal_idx ON licenca_lote (portal_id);

-- ---------- a vaga distribuída é uma licença ----------
ALTER TABLE licenca ADD COLUMN lote_id BIGINT REFERENCES licenca_lote(id) ON DELETE SET NULL;
-- Uma pessoa ocupa no máximo uma vaga viva por lote.
CREATE UNIQUE INDEX licenca_vaga_por_lote ON licenca (lote_id, usuario_id)
  WHERE lote_id IS NOT NULL AND status <> 'CANCELADA';
-- A regra "curso alheio só na plataforma" (db/026) ganha a exceção da vaga
-- comprada: o perfil é do portal da empresa, o curso é da plataforma, e o
-- lote é o que autoriza.
ALTER TABLE licenca DROP CONSTRAINT licenca_curso_alheio_so_na_plataforma;
ALTER TABLE licenca ADD CONSTRAINT licenca_curso_alheio_so_na_plataforma
  CHECK (materia_portal_id = portal_id OR portal_id = 0 OR lote_id IS NOT NULL);
