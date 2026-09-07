-- Interesse corporativo — a porta de entrada das licenças patrocinadas
-- (§12-B.1, Fase 3).
--
-- A vitrine "Empresas & RH" da página de planos anuncia uma modalidade
-- que ainda não existe como produto: não há contrato_b2b, painel do
-- parceiro nem licença de origem B2B. O que existe é a demanda, e o que
-- se perde sem esta tabela é cada RH que chega, lê e vai embora sem
-- deixar contato. Então a vitrine não vende — capta. O lead é gravado
-- aqui e a conversa segue por proposta, fora do site, até a Fase 3
-- trazer o autosserviço.
--
-- Guarda o mínimo que uma proposta precisa (§12.1): quem, de que
-- empresa, de que porte e por qual plano se interessou. O CNPJ entra
-- porque o contrato será com a pessoa jurídica, como no portal do
-- professor — e evita "lead" de curioso sem empresa.

CREATE TYPE porte_empresa AS ENUM ('ate_50', 'ate_250', 'mais_250');
CREATE TYPE plano_empresa AS ENUM ('starter', 'pro', 'enterprise');
CREATE TYPE status_interesse AS ENUM ('novo', 'em_contato', 'encerrado');

CREATE TABLE interesse_empresa (
  id            BIGSERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL,
  telefone      TEXT,
  empresa       TEXT NOT NULL,
  cnpj          TEXT NOT NULL,             -- só os caracteres, sem pontuação
  porte         porte_empresa NOT NULL,
  plano         plano_empresa NOT NULL,
  mensagem      TEXT,
  status        status_interesse NOT NULL DEFAULT 'novo',
  atendido_por  TEXT,
  atendido_em   TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Quem mudou de status foi atendido por alguém, em algum momento: sem
  -- isso a retaguarda mostraria "em contato" sem saber por quem.
  CONSTRAINT interesse_atendido_tem_autor
    CHECK (status = 'novo' OR (atendido_por IS NOT NULL AND atendido_em IS NOT NULL))
);

-- A retaguarda lista os novos primeiro; é a fila de trabalho do comercial.
CREATE INDEX interesse_empresa_fila_idx ON interesse_empresa (criado_em DESC) WHERE status = 'novo';
