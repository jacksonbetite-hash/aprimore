-- Tabela de preços inicial dos portais que nasceram sem nenhuma.
--
-- §5.10 dá a cada portal a própria tabela de valores, mas nada a
-- inicializava: um portal recém-criado ficava com zero linhas em `preco`,
-- e o efeito aparecia nos dois piores lugares. Na página pública do
-- professor, a seção "Como assinar" mostrava "R$ NaN" — `brl(undefined)`.
-- No checkout, a compra era recusada com "não há preço vigente para este
-- produto": o portal estava no ar e não podia vender nada.
--
-- Daqui em diante quem semeia é o código, no ato da criação
-- (`semearPrecosDaPlataforma`, em lib/admin-portais.ts). Esta migração
-- cuida dos portais que já existem, copiando a tabela vigente da
-- plataforma (portal 0). É a mesma regra: começa com a nossa, o admin
-- ajusta depois pela vigência do §5.9 — o histórico continua intacto,
-- porque isto INSERE preço vigente onde não havia nenhum, e não altera
-- nem encerra linha alguma.

INSERT INTO preco (portal_id, produto, periodo, centavos, vigente_de, criado_por)
SELECT alvo.id, p.produto, p.periodo, p.centavos, current_date, 'migracao/031'
  FROM portal alvo
  CROSS JOIN preco p
 WHERE alvo.id <> 0
   AND alvo.status <> 'ENCERRADO'
   AND p.portal_id = 0
   AND p.vigente_ate IS NULL
   AND p.vigente_de <= current_date
   AND NOT EXISTS (
     SELECT 1 FROM preco q
      WHERE q.portal_id = alvo.id
        AND q.produto = p.produto
        AND q.periodo = p.periodo
        AND q.vigente_ate IS NULL);
