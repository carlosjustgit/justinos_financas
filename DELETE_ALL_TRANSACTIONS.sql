-- =====================================================
-- APAGAR TODAS AS TRANSAÇÕES DO HOUSEHOLD
-- =====================================================
-- Este script apaga TODAS as transações do teu household
-- Usa com cuidado! Esta ação não pode ser revertida.
-- =====================================================

-- 1. Ver quantas transações existem antes de apagar
SELECT COUNT(*) as "Transações Antes de Apagar" 
FROM transactions 
WHERE household_id IN (
    SELECT household_id 
    FROM household_members 
    WHERE user_id = auth.uid()
);

-- 2. APAGAR TODAS AS TRANSAÇÕES
DELETE FROM transactions 
WHERE household_id IN (
    SELECT household_id 
    FROM household_members 
    WHERE user_id = auth.uid()
);

-- 3. Verificar que foram todas apagadas
SELECT COUNT(*) as "Transações Restantes" 
FROM transactions 
WHERE household_id IN (
    SELECT household_id 
    FROM household_members 
    WHERE user_id = auth.uid()
);

-- 4. Confirmar que a tabela está limpa
SELECT 
    'Transações apagadas com sucesso! ✅' as status,
    CURRENT_TIMESTAMP as timestamp;
