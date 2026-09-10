-- =====================================================================
-- Perfis de operação da plataforma (docs/plano-perfis-e-acessos.md, etapa 1)
--
-- Dois valores de enum, sozinhos, pela mesma regra do db/033: `ALTER TYPE
-- ... ADD VALUE` não pode ser usado na transação em que nasce, e o
-- migrador envolve cada arquivo numa transação.
--
-- 'financeiro' — enxerga tudo o que é dinheiro (pedidos, faturas de
--                portal, apurações, repasses, reembolsos) e NÃO muda
--                nada: nenhuma ação financeira aceita este papel.
-- 'suporte'    — opera cadastro (usuários, senha provisória, estado da
--                conta, vínculos) e licença de apoio (estender,
--                suspender, reativar), e não toca em preço, contrato,
--                apuração, fatura nem cortesia.
--
-- Os dois vivem no portal 0, como o admin. Quem diz o que cada papel
-- pode é a tabela pura em `lib/permissoes.ts`; aqui só nascem os nomes.
-- =====================================================================

ALTER TYPE papel_usuario ADD VALUE IF NOT EXISTS 'financeiro';
ALTER TYPE papel_usuario ADD VALUE IF NOT EXISTS 'suporte';
