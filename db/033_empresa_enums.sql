-- =====================================================================
-- Portal da Empresa (§5.11) — os dois valores de enum, sozinhos.
--
-- Este arquivo existe separado da estrutura (db/034) por uma regra do
-- PostgreSQL, não por gosto: `ALTER TYPE ... ADD VALUE` pode rodar dentro
-- de transação desde a versão 12, mas o valor recém-criado NÃO pode ser
-- usado antes do COMMIT. Como o migrador (scripts/migrate.mjs) envolve
-- cada arquivo numa transação, juntar as duas coisas faria a estrutura
-- falhar no primeiro CHECK ou índice que citasse 'B2B'.
--
-- 'gestor'  — quem opera o portal de uma empresa. Vive no portal 0 (é
--             conta da plataforma, como o professor) e alcança /empresa
--             pelo vínculo em `portal_gestor`. Não é 'professor' porque
--             não tem portal próprio nem repasse, e não é 'admin' porque
--             enxerga um portal só.
-- 'B2B'     — licença que a EMPRESA concedeu ao colaborador. O motor do
--             §6.3 não muda: origem diferente de TRIAL já libera a
--             matéria inteira. O que a origem faz é dizer, no extrato e
--             no suporte, que aquele acesso foi liberado pelo RH e não
--             comprado — e é por ela que se distingue o acesso a
--             cancelar quando a pessoa sai da empresa.
-- =====================================================================

ALTER TYPE papel_usuario  ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE origem_licenca ADD VALUE IF NOT EXISTS 'B2B';
