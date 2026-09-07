-- =====================================================================
-- Portal da Empresa (§5.11) — universidade corporativa em autosserviço.
--
-- A decisão que estrutura o arquivo inteiro: a empresa NÃO ganha uma
-- entidade `contrato_b2b` ao lado do portal, como o §12-B.1 previa. Ela
-- ganha uma COLUNA no portal. O motivo é o §15.14: tudo o que separa um
-- tenant do outro — chaves compostas, resolução por Host, sessão por
-- portal, cota de GB, fatura por competência — já está construído e
-- testado em cima de `portal`. Uma segunda entidade duplicaria esse
-- isolamento, e isolamento duplicado é isolamento que uma hora diverge.
--
-- O que a coluna `tipo` decide é o REGIME DE ACESSO:
--
--   PROFESSOR  vitrine aberta: catálogo público, amostra gratuita, preço
--              na tela, qualquer um cria conta e compra.
--   EMPRESA    porta fechada: marca e login. Sem amostra, sem preço, sem
--              teste; entra quem a empresa cadastrou ou convidou. O
--              acesso ao conteúdo vem de licença de origem B2B, que o RH
--              concede — não de compra.
--
-- Três regras deste arquivo merecem leitura antes do resto:
--
-- 1. A PLATAFORMA (portal 0) É SEMPRE 'PROFESSOR', por CHECK. Não porque
--    ela seja de um professor — não é de ninguém —, mas porque o que a
--    coluna decide é "aberto ou fechado", e o site principal é aberto.
--    O CHECK existe para que um UPDATE errado não possa fechar o site
--    inteiro atrás de um login.
--
-- 2. CURSO DE EMPRESA NUNCA VAI À NOSSA VITRINE, e quem garante é o
--    banco. Um treinamento interno exposto no catálogo público é
--    vazamento de dado do cliente, não erro de tela. A garantia é
--    declarativa (chave estrangeira composta + CHECK); o gatilho abaixo
--    só PREENCHE a coluna, para que a aplicação não precise lembrar. Se
--    o gatilho sumisse, a chave estrangeira continuaria recusando valor
--    errado — ela é a trava, ele é a comodidade.
--
-- 3. TODA TABELA NOVA CARREGA `portal_id` E APONTA PARA O PAR
--    `(id, portal_id)`. É a mesma disciplina do db/018: é fisicamente
--    impossível convidar alguém para o portal 7 com um setor do portal 3,
--    ou atribuir a um colaborador de uma empresa a trilha de outra.
-- =====================================================================

CREATE TYPE portal_tipo AS ENUM ('PROFESSOR', 'EMPRESA');

-- ---------------------------------------------------------------------
-- O portal ganha tipo
-- ---------------------------------------------------------------------

ALTER TABLE portal ADD COLUMN tipo portal_tipo NOT NULL DEFAULT 'PROFESSOR';

-- Os domínios de e-mail que a empresa autoriza a criar conta sozinha
-- (`{'empresa.com.br','empresa.com'}`). Vazio é o padrão e significa a
-- política mais fechada: só entra quem recebeu convite nominal.
ALTER TABLE portal ADD COLUMN dominios_email TEXT[] NOT NULL DEFAULT '{}';

-- A trava do item 1 acima.
ALTER TABLE portal ADD CONSTRAINT portal_plataforma_e_aberta
  CHECK (id <> 0 OR tipo = 'PROFESSOR');

-- Empresa não vende, logo não tem subconta, split nem escrow: ela só
-- PAGA a mensalidade. Deixar a subconta possível seria abrir a porta
-- para um split que não existe e um escrow que nunca liberaria.
ALTER TABLE portal ADD CONSTRAINT portal_empresa_sem_subconta CHECK (
  tipo <> 'EMPRESA' OR
  (gateway_wallet_id IS NULL AND gateway_subconta_id IS NULL
   AND subconta_situacao = 'PENDENTE' AND escrow_habilitada_em IS NULL)
);

-- O par que as filhas do item 2 apontam.
ALTER TABLE portal ADD CONSTRAINT portal_id_tipo UNIQUE (id, tipo);

-- ---------------------------------------------------------------------
-- O plano ganha tipo e teto de contas
-- ---------------------------------------------------------------------

ALTER TABLE portal_plano ADD COLUMN tipo portal_tipo NOT NULL DEFAULT 'PROFESSOR';

-- O teto de pessoas com acesso — o que a empresa realmente compra. NULL
-- é "sem teto", reservado ao Enterprise, que fecha por proposta.
ALTER TABLE portal_plano ADD COLUMN limite_contas INT
  CHECK (limite_contas IS NULL OR limite_contas > 0);

-- Plano de empresa com percentual seria cobrar comissão sobre venda que
-- não acontece. Zerado por CHECK para que ninguém preencha por hábito.
ALTER TABLE portal_plano ADD CONSTRAINT plano_empresa_sem_percentual CHECK (
  tipo <> 'EMPRESA' OR
  (percentual_base = 0 AND acrescimo_indicacao_pp = 0 AND comissao_vitrine_pp = 0)
);

-- O contrato copia o teto no aceite, como já copia preço e percentual: o
-- plano pode mudar de teto amanhã; o que esta empresa assinou, não.
ALTER TABLE portal_contrato ADD COLUMN limite_contas INT
  CHECK (limite_contas IS NULL OR limite_contas > 0);

-- ---------------------------------------------------------------------
-- Quem opera a empresa
-- ---------------------------------------------------------------------
--
-- O professor é um só e cabe em `portal.professor_id`. A empresa tem RH,
-- e RH tem mais de uma pessoa — por isso a tabela. `professor_id`
-- continua apontando a conta que contratou (o RESPONSAVEL), porque é ela
-- que recebe a cobrança; o vínculo abaixo é quem pode ENTRAR no painel.
--
-- O gestor é conta da PLATAFORMA (portal 0), como o professor: ele opera
-- o portal da empresa de fora dele, em /empresa. Dentro do endereço da
-- empresa só existe colaborador.

CREATE TYPE papel_no_portal AS ENUM ('RESPONSAVEL', 'GESTOR');

CREATE TABLE portal_gestor (
  portal_id       BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  usuario_id      BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  papel_no_portal papel_no_portal NOT NULL DEFAULT 'GESTOR',
  criado_por      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (portal_id, usuario_id)
);
CREATE INDEX portal_gestor_usuario_idx ON portal_gestor (usuario_id);

-- Um responsável por portal: é quem responde pelo contrato e quem não
-- pode ser removido por outro gestor.
CREATE UNIQUE INDEX portal_gestor_responsavel_unico
  ON portal_gestor (portal_id) WHERE papel_no_portal = 'RESPONSAVEL';

-- ---------------------------------------------------------------------
-- Curso de empresa fora da vitrine (item 2 do cabeçalho)
-- ---------------------------------------------------------------------

ALTER TABLE materia ADD COLUMN portal_tipo portal_tipo NOT NULL DEFAULT 'PROFESSOR';

UPDATE materia m SET portal_tipo = p.tipo FROM portal p WHERE p.id = m.portal_id;

-- A trava: o par (portal_id, portal_tipo) tem de existir em `portal`.
-- ON UPDATE CASCADE porque, se um portal algum dia mudasse de tipo, as
-- matérias dele têm de acompanhar — e não travar a mudança.
ALTER TABLE materia ADD CONSTRAINT materia_tipo_do_portal
  FOREIGN KEY (portal_id, portal_tipo) REFERENCES portal (id, tipo) ON UPDATE CASCADE;

ALTER TABLE materia ADD CONSTRAINT materia_empresa_fora_da_vitrine
  CHECK (portal_tipo <> 'EMPRESA' OR NOT na_vitrine_plataforma);

-- A comodidade: a aplicação insere matéria como sempre inseriu, sem
-- saber que esta coluna existe. O gatilho a preenche a partir do portal.
CREATE FUNCTION materia_preencher_portal_tipo() RETURNS TRIGGER AS $$
BEGIN
  SELECT tipo INTO NEW.portal_tipo FROM portal WHERE id = NEW.portal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER materia_portal_tipo
  BEFORE INSERT OR UPDATE OF portal_id ON materia
  FOR EACH ROW EXECUTE FUNCTION materia_preencher_portal_tipo();

-- ---------------------------------------------------------------------
-- Setor e colaborador
-- ---------------------------------------------------------------------
--
-- Setor é o agrupamento que o RH usa para atribuir treinamento a muita
-- gente de uma vez ("todo o Comercial faz Compliance"). É por portal, e
-- opcional: empresa pequena vive sem nenhum.

CREATE TABLE setor (
  id        BIGSERIAL PRIMARY KEY,
  portal_id BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  ordem     INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT setor_nome_por_portal UNIQUE (portal_id, nome),
  CONSTRAINT setor_id_portal UNIQUE (id, portal_id)
);

-- O colaborador é `usuario` com papel 'aluno' dentro do portal da
-- empresa — nenhum papel novo. Toda consulta de progresso, sessão e
-- licença já filtra por 'aluno'; um papel novo espalharia OR por dezenas
-- de consultas para não ganhar nada.
ALTER TABLE usuario ADD COLUMN setor_id BIGINT;
-- Matrícula/registro interno da empresa. Opcional: serve ao RH para
-- casar o relatório daqui com a folha de lá.
ALTER TABLE usuario ADD COLUMN matricula TEXT;

-- Setor de OUTRO portal num colaborador seria o vazamento do §15.14 pela
-- porta dos fundos: o relatório do RH da empresa A listaria o setor da B.
ALTER TABLE usuario ADD CONSTRAINT usuario_setor_mesmo_portal
  FOREIGN KEY (setor_id, portal_id) REFERENCES setor (id, portal_id);

-- ---------------------------------------------------------------------
-- Convite
-- ---------------------------------------------------------------------
--
-- O sistema ainda não envia e-mail (§5.10, "ainda não feito"). Depender
-- disso travaria a liberação de acesso inteira, então o convite é um
-- LINK que o gestor copia e manda por onde quiser. Quando o envio
-- existir, ele passa a mandar o mesmo link — sem mudar esta tabela.
--
-- O banco guarda só o SHA-256 do token, pela mesma razão da `sessao`
-- (§10): vazar a tabela não entrega convite utilizável.

CREATE TABLE convite (
  id          BIGSERIAL PRIMARY KEY,
  portal_id   BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  nome        TEXT,
  setor_id    BIGINT,
  token_hash  TEXT NOT NULL UNIQUE,
  -- As trilhas que a pessoa já entra podendo fazer. Guardadas aqui e não
  -- como `atribuicao` porque atribuição é sobre gente que existe; o
  -- convidado ainda não é ninguém no sistema.
  trilhas     BIGINT[] NOT NULL DEFAULT '{}',
  prazo_dias  INT CHECK (prazo_dias IS NULL OR prazo_dias > 0),
  criado_por  TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em   TIMESTAMPTZ NOT NULL,
  aceito_em   TIMESTAMPTZ,
  usuario_id  BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
  cancelado_em TIMESTAMPTZ,

  CONSTRAINT convite_setor_mesmo_portal
    FOREIGN KEY (setor_id, portal_id) REFERENCES setor (id, portal_id),
  -- Aceito é aceito por alguém: sem o par, o relatório mostraria convite
  -- consumido sem dizer por quem.
  CONSTRAINT convite_aceito_tem_conta
    CHECK ((aceito_em IS NULL) = (usuario_id IS NULL))
);

-- Um convite aberto por e-mail e portal. Reconvidar substitui o
-- anterior, e não empilha três links válidos para a mesma pessoa.
CREATE UNIQUE INDEX convite_aberto_unico ON convite (portal_id, lower(email))
  WHERE aceito_em IS NULL AND cancelado_em IS NULL;
CREATE INDEX convite_portal_idx ON convite (portal_id, criado_em DESC);

-- ---------------------------------------------------------------------
-- Atribuição
-- ---------------------------------------------------------------------
--
-- A atribuição é a INTENÇÃO do RH ("todo o Comercial faz Compliance até
-- 30/11"); a `licenca` de origem B2B é o que ela vira, pessoa a pessoa.
-- Separar as duas é o que permite: (a) alguém entrar no setor depois e
-- receber as trilhas do setor no ato do cadastro; (b) cancelar o acesso
-- de uma pessoa sem apagar a regra do setor; (c) o relatório distinguir
-- "atribuído mas nunca começou" de "nunca foi atribuído".

CREATE TABLE atribuicao (
  id              BIGSERIAL PRIMARY KEY,
  portal_id       BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  materia_id      BIGINT NOT NULL,
  alvo_usuario_id BIGINT,
  alvo_setor_id   BIGINT,
  -- Obrigatória aparece primeiro no painel do colaborador e conta como
  -- pendência no relatório do RH. Opcional é catálogo interno.
  obrigatoria     BOOLEAN NOT NULL DEFAULT true,
  prazo_em        DATE,
  criada_por      TEXT NOT NULL,
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT atribuicao_materia_mesmo_portal
    FOREIGN KEY (materia_id, portal_id) REFERENCES materia (id, portal_id),
  CONSTRAINT atribuicao_usuario_mesmo_portal
    FOREIGN KEY (alvo_usuario_id, portal_id) REFERENCES usuario (id, portal_id),
  CONSTRAINT atribuicao_setor_mesmo_portal
    FOREIGN KEY (alvo_setor_id, portal_id) REFERENCES setor (id, portal_id),
  -- Uma atribuição aponta uma pessoa OU um setor, nunca os dois nem
  -- nenhum: "para ninguém" é linha que só confunde o relatório.
  CONSTRAINT atribuicao_um_alvo CHECK (
    (alvo_usuario_id IS NOT NULL) <> (alvo_setor_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX atribuicao_pessoa_unica
  ON atribuicao (materia_id, alvo_usuario_id) WHERE alvo_usuario_id IS NOT NULL;
CREATE UNIQUE INDEX atribuicao_setor_unica
  ON atribuicao (materia_id, alvo_setor_id) WHERE alvo_setor_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Avaliação e conclusão
-- ---------------------------------------------------------------------
--
-- O exercício do §5.5 fecha CADA AULA e é formativo: erra, lê o
-- comentário, refaz. A avaliação fecha A TRILHA e é somativa: tem nota
-- mínima, número de tentativas e decide o certificado. São coisas
-- diferentes, e por isso duas tabelas — mas UMA tabela de questão, para
-- que o formulário do painel, a tabela `alternativa` e a regra de
-- "comentário em toda alternativa" (§5.3) sirvam às duas.

CREATE TABLE avaliacao (
  id             BIGSERIAL PRIMARY KEY,
  portal_id      BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  materia_id     BIGINT NOT NULL,
  titulo         TEXT NOT NULL,
  descricao      TEXT,
  nota_minima    INT NOT NULL DEFAULT 70 CHECK (nota_minima BETWEEN 0 AND 100),
  -- NULL = tentativas ilimitadas. O RH decide se a prova é séria ou é
  -- reforço de leitura.
  max_tentativas INT CHECK (max_tentativas IS NULL OR max_tentativas > 0),
  embaralhar     BOOLEAN NOT NULL DEFAULT true,
  status         status_publicacao NOT NULL DEFAULT 'rascunho',
  criada_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizada_em  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma avaliação final por trilha: "final" no plural não é final.
  CONSTRAINT avaliacao_por_materia UNIQUE (materia_id),
  CONSTRAINT avaliacao_id_portal UNIQUE (id, portal_id),
  CONSTRAINT avaliacao_materia_mesmo_portal
    FOREIGN KEY (materia_id, portal_id) REFERENCES materia (id, portal_id)
);

-- A questão passa a pertencer a um exercício de aula OU a uma avaliação.
ALTER TABLE questao ALTER COLUMN exercicio_id DROP NOT NULL;
ALTER TABLE questao ADD COLUMN avaliacao_id BIGINT REFERENCES avaliacao(id) ON DELETE CASCADE;
ALTER TABLE questao ADD CONSTRAINT questao_um_dono CHECK (
  (exercicio_id IS NOT NULL) <> (avaliacao_id IS NOT NULL)
);
CREATE INDEX questao_avaliacao_idx ON questao (avaliacao_id, ordem)
  WHERE avaliacao_id IS NOT NULL;

CREATE TABLE tentativa_avaliacao (
  id           BIGSERIAL PRIMARY KEY,
  portal_id    BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  usuario_id   BIGINT NOT NULL,
  avaliacao_id BIGINT NOT NULL,
  iniciada_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  entregue_em  TIMESTAMPTZ,
  nota         INT CHECK (nota IS NULL OR nota BETWEEN 0 AND 100),
  aprovada     BOOLEAN,
  -- O gabarito daquela tentativa, questão a questão. Guardado inteiro
  -- porque a prova pode mudar depois e o resultado tem de continuar
  -- explicável: é o mesmo princípio do §5.10 ("o número usado fica
  -- gravado").
  respostas    JSONB,

  CONSTRAINT tentativa_usuario_mesmo_portal
    FOREIGN KEY (usuario_id, portal_id) REFERENCES usuario (id, portal_id),
  CONSTRAINT tentativa_avaliacao_mesmo_portal
    FOREIGN KEY (avaliacao_id, portal_id) REFERENCES avaliacao (id, portal_id),
  -- Entregue tem nota e veredito; em andamento não tem nem um nem outro.
  CONSTRAINT tentativa_entregue_completa CHECK (
    (entregue_em IS NULL AND nota IS NULL AND aprovada IS NULL) OR
    (entregue_em IS NOT NULL AND nota IS NOT NULL AND aprovada IS NOT NULL)
  )
);
CREATE INDEX tentativa_por_pessoa_idx
  ON tentativa_avaliacao (avaliacao_id, usuario_id, iniciada_em DESC);

-- Uma prova aberta por vez: sem isso, abrir a prova em duas abas daria
-- duas chances contadas como uma.
CREATE UNIQUE INDEX tentativa_aberta_unica
  ON tentativa_avaliacao (avaliacao_id, usuario_id) WHERE entregue_em IS NULL;

-- A conclusão é o fato que o certificado atesta. Linha própria, e não um
-- campo calculado, porque ela CONGELA o que valia no dia: a carga
-- horária de então, a nota de então. Republicar a trilha com mais aulas
-- não reescreve certificado emitido.
CREATE TABLE conclusao (
  id                 BIGSERIAL PRIMARY KEY,
  portal_id          BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  usuario_id         BIGINT NOT NULL,
  materia_id         BIGINT NOT NULL,
  concluida_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  nota               INT CHECK (nota IS NULL OR nota BETWEEN 0 AND 100),
  carga_horaria_min  INT NOT NULL DEFAULT 0 CHECK (carga_horaria_min >= 0),
  -- O que o RH digita para conferir o certificado que o colaborador
  -- mandou. Único no sistema inteiro, não por portal: o verificador é
  -- uma página pública que não sabe de que empresa é o código.
  codigo_certificado TEXT NOT NULL UNIQUE,

  CONSTRAINT conclusao_uma_por_trilha UNIQUE (usuario_id, materia_id),
  CONSTRAINT conclusao_usuario_mesmo_portal
    FOREIGN KEY (usuario_id, portal_id) REFERENCES usuario (id, portal_id),
  CONSTRAINT conclusao_materia_mesmo_portal
    FOREIGN KEY (materia_id, portal_id) REFERENCES materia (id, portal_id)
);
CREATE INDEX conclusao_portal_idx ON conclusao (portal_id, concluida_em DESC);

-- ---------------------------------------------------------------------
-- Os planos que a vitrine passa a ler do banco
-- ---------------------------------------------------------------------
--
-- Até aqui os preços de `/empresas` moravam em `lib/empresas.ts` como
-- "referência", porque não havia checkout — e o próprio arquivo avisava
-- que preço de produto sem checkout não é preço vigente. Com a
-- contratação em autosserviço (etapa 1) eles viram produto, e produto
-- mora em `portal_plano`, com a vigência e a auditoria de todo mundo.
--
-- Enterprise não entra: continua fechando por proposta, pelo formulário
-- de interesse do db/032.
--
-- Cotas iguais às do professor (§5.10.3): 100 GB guardam ~50 h de aula,
-- 300 GB/mês servem ~430 h assistidas. Empresa de 50 pessoas assistindo
-- 10 h/ano cabe folgado; o excedente cobre o resto sem virar multa.
--
-- Domínio próprio: incluído no Pro (0 = incluído, sem linha na fatura);
-- no Starter entra como extra pago, ao mesmo preço do professor. É a
-- decisão 19 do §16 e muda-se no admin, sem código.

INSERT INTO portal_plano
  (nome, tipo, licenca_mensal_centavos, percentual_base, acrescimo_indicacao_pp,
   comissao_vitrine_pp, gb_armazenamento, gb_banda_mes, centavos_por_gb_excedente,
   centavos_dominio_proprio, limite_contas, ativo)
VALUES
  ('Empresa Starter', 'EMPRESA', 38000, 0, 0, 0, 100, 300, 40, 2990,  50, true),
  ('Empresa Pro',     'EMPRESA', 89000, 0, 0, 0, 100, 300, 40,    0, 250, true);
