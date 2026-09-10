-- =====================================================================
-- O catálogo em vitrine de streaming — destaque e nível do curso.
--
-- O layout aprovado em 09/09/2026 para a página de cursos do portal
-- (docs/plano-catalogo-streaming.md) pede duas coisas que o cadastro do
-- curso não sabia responder:
--
--   destaque  QUAL curso abre a página, no banner grande de cima. Sem a
--             coluna, a escolha teria de ser "o primeiro da ordem" — e o
--             professor não teria como mudar sem reordenar o acervo
--             inteiro. É marcador, não posição: marcar dois não quebra
--             nada (ganha o de menor `ordem`), e não marcar nenhum cai
--             no primeiro publicado, que é o comportamento de hoje.
--
--   nivel     A quem o curso se dirige — "Graduação", "Prática forense",
--             "OAB e concursos". É o filtro "Todos os níveis" da barra
--             de busca.
--
-- Por que TEXTO LIVRE e não um enum: o portal é white-label. Os três
-- níveis do protótipo são de um portal de Direito; o portal de
-- tecnologia da casa (`tecnologiaempaula`) precisaria de outros três, e
-- um enum obrigaria uma migração por cliente novo. A lista do filtro
-- nasce do DISTINCT do que o professor já cadastrou — mesma escolha do
-- `assuntos` do acervo da empresa (db/042) e do filtro de professor, que
-- já funciona assim no catálogo.
--
-- Os dois são opcionais: curso sem nível não aparece no filtro e não
-- perde nada; portal sem destaque marcado abre no primeiro publicado.
-- Nenhuma tela exige as colunas para existir.
-- =====================================================================

ALTER TABLE materia ADD COLUMN destaque BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE materia ADD COLUMN nivel    TEXT;

-- O destaque é lido a cada abertura do catálogo, sempre com o portal
-- junto. Índice parcial: a esmagadora maioria das linhas é `false`, e
-- indexar essas seria pagar escrita por leitura que nunca acontece.
CREATE INDEX materia_destaque_idx ON materia (portal_id) WHERE destaque;
