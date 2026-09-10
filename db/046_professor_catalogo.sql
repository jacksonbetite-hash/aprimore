-- =====================================================================
-- Professor SEM página própria — docs/plano-perfis-e-acessos.md, etapa 5
-- (aprovada em 10/09/2026 com 40% de comissão e CPF ou CNPJ).
--
-- É o "professor convidado" do §5.6 que o código só tocou de lado: ele
-- publica os cursos dele NO CATÁLOGO DA PLATAFORMA (portal 0), a venda é
-- nossa, e ele recebe comissão pela apuração mensal do §5.6.1 — o mesmo
-- ciclo (fechamento, 5 dias de conferência, nota, repasse) que o portal
-- já usa. O que muda é quem é o DONO da apuração: um professor, e não um
-- portal.
-- =====================================================================

-- ---------- o curso tem autor ----------
-- Só curso da plataforma tem `professor_id`: no portal, o dono é o
-- portal. `materia.professor` (texto) continua como o nome que assina.
ALTER TABLE materia ADD COLUMN professor_id BIGINT REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE materia ADD CONSTRAINT materia_professor_so_na_plataforma
  CHECK (professor_id IS NULL OR portal_id = 0);
CREATE INDEX materia_professor_idx ON materia (professor_id) WHERE professor_id IS NOT NULL;

-- ---------- o contrato do professor de catálogo ----------
-- Espelha `portal_contrato` no que importa: percentual copiado no aceite,
-- vigência, aceite com IP. `chave_pix` é para onde o repasse manual vai
-- enquanto não há subconta (o repasse pelo gateway exige CNPJ e subconta).
CREATE TABLE contrato_professor (
  id             BIGSERIAL PRIMARY KEY,
  usuario_id     BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  comissao_pp    NUMERIC(5,2) NOT NULL CHECK (comissao_pp >= 0 AND comissao_pp <= 100),
  chave_pix      TEXT,
  vigente_de     DATE NOT NULL,
  vigente_ate    DATE,
  aceito_em      TIMESTAMPTZ,
  aceito_ip      TEXT,
  registrado_por TEXT NOT NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contrato_professor_vigencia CHECK (vigente_ate IS NULL OR vigente_ate > vigente_de)
);
CREATE UNIQUE INDEX contrato_professor_vigente ON contrato_professor (usuario_id) WHERE vigente_ate IS NULL;

-- ---------- a venda sabe de quem é a comissão ----------
-- Sem ON DELETE: a venda com comissão é um fato contábil, e apagar a
-- conta do professor que a recebeu é recusado pelo banco. Conta de
-- professor se ENCERRA (status_conta), não se apaga — é a mesma regra
-- do restante do comercial.
ALTER TABLE pedido ADD COLUMN professor_id BIGINT REFERENCES usuario(id);
ALTER TABLE pedido ADD CONSTRAINT pedido_professor_so_na_plataforma
  CHECK (professor_id IS NULL OR (portal_id = 0 AND materia_portal_id = 0));
-- A comissão passa a existir em dois casos: curso de parceiro (portal) e
-- curso de professor do catálogo.
ALTER TABLE pedido DROP CONSTRAINT pedido_comissao_so_em_curso_alheio;
ALTER TABLE pedido ADD CONSTRAINT pedido_comissao_so_em_curso_alheio
  CHECK (comissao_professor_pp IS NULL OR materia_portal_id <> portal_id OR professor_id IS NOT NULL);
CREATE INDEX pedido_professor_idx ON pedido (professor_id) WHERE professor_id IS NOT NULL;

-- ---------- a apuração tem um dono: portal OU professor ----------
ALTER TABLE apuracao ALTER COLUMN portal_id DROP NOT NULL;
ALTER TABLE apuracao ADD COLUMN professor_id BIGINT REFERENCES usuario(id) ON DELETE CASCADE;
ALTER TABLE apuracao ADD CONSTRAINT apuracao_um_dono
  CHECK ((portal_id IS NULL) <> (professor_id IS NULL));
-- `apuracao_unica UNIQUE (portal_id, competencia)` já cobre o portal;
-- esta cobre o professor (NULL não colide no índice do portal).
CREATE UNIQUE INDEX apuracao_professor_unica ON apuracao (professor_id, competencia)
  WHERE professor_id IS NOT NULL;
