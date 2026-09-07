-- Decisão 18 do discovery (04/09/2026): domínio próprio é recurso pago do
-- plano de lançamento, R$ 29,90/mês (opção B do §5.10.3). O plano C, quando
-- existir, inclui (0 = incluído, sem linha na fatura; NULL = não oferece).
UPDATE portal_plano
   SET centavos_dominio_proprio = 2990
 WHERE nome = 'Portal do Professor' AND centavos_dominio_proprio IS NULL;
