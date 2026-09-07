-- =====================================================================
-- Portal da Empresa — etapas 3 a 6 do §5.11 (colaboradores, atribuição,
-- avaliação, certificado e acompanhamento).
--
-- As tabelas já existiam desde db/034. O que faltava era a aplicação — e
-- UMA coluna: a licença B2B precisa lembrar de QUAL atribuição nasceu.
-- Sem isso, "tirar a trilha da pessoa" não sabe qual licença cancelar
-- quando a mesma trilha chegou por dois caminhos (o setor e a pessoa).
-- =====================================================================

ALTER TABLE licenca
  ADD COLUMN atribuicao_id BIGINT REFERENCES atribuicao(id) ON DELETE SET NULL;

CREATE INDEX licenca_por_atribuicao_idx ON licenca (atribuicao_id)
  WHERE atribuicao_id IS NOT NULL;

-- A licença B2B é a materialização da atribuição por pessoa (§5.11).
-- Uma por (atribuição, pessoa): cadastrar a pessoa duas vezes no setor,
-- ou reaplicar a atribuição, não pode duplicar o acesso.
CREATE UNIQUE INDEX licenca_b2b_por_atribuicao
  ON licenca (atribuicao_id, usuario_id)
  WHERE atribuicao_id IS NOT NULL AND status <> 'CANCELADA';
