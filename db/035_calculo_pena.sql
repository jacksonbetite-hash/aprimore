-- =====================================================================
-- Calculadora Penal (§5.12): o histórico de cálculos do aluno.
--
-- A REGRA não mora no banco — mora em lib/penas/catalogo, versionada no
-- git, porque regra jurídica pede revisão e diff, não formulário. O que
-- mora aqui é o que é do aluno: o caso que ele montou e o resultado que
-- viu, com a versão do catálogo que o produziu. Um cálculo salvo em 2026
-- continua legível em 2028, e a tela pode avisar que a regra mudou.
-- =====================================================================

CREATE TABLE calculo_pena (
  id               BIGSERIAL PRIMARY KEY,
  usuario_id       BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  -- o aluno pertence a um portal (§5.10); o cálculo fica no portal em que foi feito
  portal_id        BIGINT NOT NULL DEFAULT 0,
  titulo           TEXT NOT NULL CHECK (length(titulo) BETWEEN 1 AND 120),
  entrada          JSONB NOT NULL,          -- o Caso, como veio da URL
  resultado        JSONB NOT NULL,          -- o Resultado, para consulta sem recalcular
  versao_catalogo  TEXT NOT NULL,           -- CATALOGO_CONFERIDO_EM no momento do cálculo
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX calculo_pena_usuario_idx ON calculo_pena (usuario_id, portal_id, criado_em DESC);
