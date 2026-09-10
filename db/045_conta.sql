-- =====================================================================
-- A credencial global — docs/plano-perfis-e-acessos.md, §2.1 e etapa 3.
--
-- Até aqui `usuario` era ao mesmo tempo a CREDENCIAL (e-mail, senha,
-- CPF) e o PERFIL num portal (papel, setor, licenças, progresso). O
-- pedido de 10/09/2026 separa as duas coisas: a mesma pessoa entra na
-- plataforma, no portal de um professor e no de uma empresa com UMA
-- senha — e quem quer acessos distintos usa outro e-mail.
--
-- O que muda: nasce `conta` (uma por e-mail, global) e `usuario` passa a
-- apontar para ela. O que NÃO muda: `usuario` continua sendo um por
-- portal, com todas as chaves compostas `(id, portal_id)` que isolam os
-- tenants (db/018, db/034). Licença, pedido, progresso, setor e convite
-- continuam presos ao perfil do portal — a credencial é da pessoa, o
-- perfil é do portal, e o professor continua controlador da base dele.
--
-- `status_conta` e `ultimo_login_em` FICAM em `usuario`, de propósito: o
-- RH desativa um colaborador (ENCERRADA) sem encerrar a pessoa em outro
-- portal, e o teto de contas da empresa conta perfis do portal dela.
--
-- Migração dos dados: uma conta por lower(email). Quando o mesmo e-mail
-- existia em mais de um portal (o modelo antigo permitia, com senhas
-- diferentes), a conta fica com a senha do perfil da PLATAFORMA; sem
-- ele, a do perfil com senha e login mais recente. Cada fusão vai para
-- `conta_fusao_relatorio`, para que a operação avise as pessoas.
-- =====================================================================

CREATE TABLE conta (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT NOT NULL,
  senha_hash      TEXT,
  nome            TEXT NOT NULL,
  -- CPF ou CNPJ, só dígitos. NÃO é único: dois e-mails com o mesmo CPF
  -- são duas contas — é o "acesso distinto" que o pedido permite. O que
  -- a aplicação recusa é LIGAR um perfil novo a uma conta cujo documento
  -- difere do informado (lib/auth.ts, garantirConta).
  documento       TEXT,
  tipo_documento  TEXT CHECK (tipo_documento IN ('CPF', 'CNPJ')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conta_documento_com_tipo CHECK ((documento IS NULL) = (tipo_documento IS NULL))
);
CREATE UNIQUE INDEX conta_email_unico ON conta (lower(email));

-- ---------- relatório de fusão (antes de mexer em nada) ----------
CREATE TABLE conta_fusao_relatorio (
  email              TEXT PRIMARY KEY,
  perfis             INT  NOT NULL,
  senhas_distintas   INT  NOT NULL,
  senha_escolhida_de BIGINT,          -- o usuario cuja senha virou a da conta
  gerado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO conta_fusao_relatorio (email, perfis, senhas_distintas, senha_escolhida_de)
SELECT g.email, g.perfis, g.senhas_distintas,
       (SELECT x.id FROM usuario x WHERE lower(x.email) = g.email
         ORDER BY (x.portal_id = 0) DESC, (x.senha_hash IS NOT NULL) DESC,
                  x.ultimo_login_em DESC NULLS LAST, x.id
         LIMIT 1)
  FROM (SELECT lower(u.email) AS email, count(*)::int AS perfis,
               count(DISTINCT u.senha_hash) FILTER (WHERE u.senha_hash IS NOT NULL)::int AS senhas_distintas
          FROM usuario u
         GROUP BY lower(u.email)
        HAVING count(*) > 1) g;

-- ---------- uma conta por e-mail ----------
INSERT INTO conta (email, senha_hash, nome, documento, tipo_documento, criado_em)
SELECT DISTINCT ON (lower(email))
       lower(email), senha_hash, nome, cpf, CASE WHEN cpf IS NOT NULL THEN 'CPF' END, criado_em
  FROM usuario
 ORDER BY lower(email), (portal_id = 0) DESC, (senha_hash IS NOT NULL) DESC,
          ultimo_login_em DESC NULLS LAST, id;

-- Se o perfil escolhido não tinha CPF mas outro tinha, a conta herda.
UPDATE conta c
   SET documento = x.cpf, tipo_documento = 'CPF'
  FROM (SELECT DISTINCT ON (lower(email)) lower(email) AS email, cpf
          FROM usuario WHERE cpf IS NOT NULL ORDER BY lower(email), id) x
 WHERE c.email = x.email AND c.documento IS NULL;

-- ---------- o perfil aponta para a conta ----------
ALTER TABLE usuario ADD COLUMN conta_id BIGINT REFERENCES conta(id);
UPDATE usuario u SET conta_id = c.id FROM conta c WHERE lower(u.email) = c.email;
ALTER TABLE usuario ALTER COLUMN conta_id SET NOT NULL;
ALTER TABLE usuario ADD CONSTRAINT usuario_conta_por_portal UNIQUE (conta_id, portal_id);
CREATE INDEX usuario_conta_idx ON usuario (conta_id);

-- A senha e o CPF saem do perfil. Derrubar as colunas (e não deixá-las
-- NULL) é o que impede uma consulta esquecida de ler a credencial velha.
ALTER TABLE usuario DROP COLUMN senha_hash;
ALTER TABLE usuario DROP COLUMN cpf;

-- ---------- gatilhos: e-mail sempre igual ao da conta ----------

-- `usuario.email` continua existindo (dezenas de consultas o leem), mas
-- passa a ser CÓPIA do e-mail da conta. Inserir um perfil sem `conta_id`
-- ainda funciona: o gatilho acha (ou cria) a conta pelo e-mail — é o que
-- faz os roteiros de teste antigos continuarem valendo, e é a mesma
-- mecânica do "vínculo na primeira entrada".
CREATE OR REPLACE FUNCTION usuario_garante_conta() RETURNS trigger AS $$
BEGIN
  IF NEW.conta_id IS NULL THEN
    SELECT id INTO NEW.conta_id FROM conta WHERE lower(email) = lower(NEW.email);
    IF NOT FOUND THEN
      INSERT INTO conta (email, nome) VALUES (lower(NEW.email), NEW.nome) RETURNING id INTO NEW.conta_id;
    END IF;
  ELSE
    SELECT email INTO NEW.email FROM conta WHERE id = NEW.conta_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER usuario_garante_conta BEFORE INSERT ON usuario
  FOR EACH ROW EXECUTE FUNCTION usuario_garante_conta();

-- Trocar o e-mail é operação da CONTA; um UPDATE direto em usuario.email
-- que divirja da conta é recusado.
CREATE OR REPLACE FUNCTION usuario_email_e_da_conta() RETURNS trigger AS $$
DECLARE da_conta TEXT;
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email OR NEW.conta_id IS DISTINCT FROM OLD.conta_id THEN
    SELECT email INTO da_conta FROM conta WHERE id = NEW.conta_id;
    IF lower(NEW.email) <> lower(da_conta) THEN
      RAISE EXCEPTION 'o e-mail do perfil vem da conta (conta.email); altere lá'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER usuario_email_e_da_conta BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION usuario_email_e_da_conta();

CREATE OR REPLACE FUNCTION conta_marca_atualizacao() RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER conta_marca_atualizacao BEFORE UPDATE ON conta
  FOR EACH ROW EXECUTE FUNCTION conta_marca_atualizacao();

-- AFTER, e não BEFORE: a propagação dispara o gatilho de cima em cada
-- perfil, que confere o e-mail contra a conta — e a conta precisa já
-- estar gravada com o e-mail novo quando ele olhar.
CREATE OR REPLACE FUNCTION conta_propaga_email() RETURNS trigger AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE usuario SET email = NEW.email WHERE conta_id = NEW.id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER conta_propaga_email AFTER UPDATE OF email ON conta
  FOR EACH ROW EXECUTE FUNCTION conta_propaga_email();

-- Conta sem perfil nenhum não existe: apagado o último perfil, ela vai
-- junto. É o que mantém os roteiros de teste (que apagam `usuario`) sem
-- deixar credencial órfã para trás.
CREATE OR REPLACE FUNCTION usuario_apaga_conta_orfa() RETURNS trigger AS $$
BEGIN
  DELETE FROM conta WHERE id = OLD.conta_id
     AND NOT EXISTS (SELECT 1 FROM usuario WHERE conta_id = OLD.conta_id);
  RETURN OLD;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER usuario_apaga_conta_orfa AFTER DELETE ON usuario
  FOR EACH ROW EXECUTE FUNCTION usuario_apaga_conta_orfa();
