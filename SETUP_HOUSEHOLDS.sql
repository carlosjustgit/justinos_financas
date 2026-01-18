-- ============================================
-- SISTEMA DE FAMÍLIAS (HOUSEHOLDS)
-- ============================================
-- Este script cria um sistema completo de famílias onde:
-- - Múltiplos utilizadores podem pertencer à mesma família
-- - Todos os dados (transações, orçamentos, metas) são compartilhados
-- - Quando um membro adiciona algo, todos veem automaticamente
-- ============================================

-- 1. Criar tabela de Households (Famílias)
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de Membros de Households
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner' ou 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, user_id)
);

-- 3. Adicionar household_id às tabelas existentes
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

ALTER TABLE budget_items 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_household ON budget_items(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);

-- 5. Remover policies antigas
DROP POLICY IF EXISTS "Authenticated users can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can update all transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can delete all transactions" ON transactions;

DROP POLICY IF EXISTS "Authenticated users can view all budget items" ON budget_items;
DROP POLICY IF EXISTS "Authenticated users can insert budget items" ON budget_items;
DROP POLICY IF EXISTS "Authenticated users can update all budget items" ON budget_items;
DROP POLICY IF EXISTS "Authenticated users can delete all budget items" ON budget_items;

-- 6. Criar policies baseadas em household_id

-- Households: Qualquer membro pode ver a sua família
CREATE POLICY "Members can view their household"
ON households FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Household Members: Membros podem ver outros membros da mesma família
CREATE POLICY "Members can view household members"
ON household_members FOR SELECT
TO authenticated
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Transactions: Membros podem VISUALIZAR transações da família
CREATE POLICY "Members can view household transactions"
ON transactions FOR SELECT
TO authenticated
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Transactions: Membros podem INSERIR transações na família
CREATE POLICY "Members can insert household transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Transactions: Membros podem ATUALIZAR transações da família
CREATE POLICY "Members can update household transactions"
ON transactions FOR UPDATE
TO authenticated
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Transactions: Membros podem DELETAR transações da família
CREATE POLICY "Members can delete household transactions"
ON transactions FOR DELETE
TO authenticated
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Budget Items: Membros podem VISUALIZAR orçamentos da família
CREATE POLICY "Members can view household budget items"
ON budget_items FOR SELECT
TO authenticated
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Budget Items: Membros podem INSERIR orçamentos na família
CREATE POLICY "Members can insert household budget items"
ON budget_items FOR INSERT
TO authenticated
WITH CHECK (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Budget Items: Membros podem ATUALIZAR orçamentos da família
CREATE POLICY "Members can update household budget items"
ON budget_items FOR UPDATE
TO authenticated
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Budget Items: Membros podem DELETAR orçamentos da família
CREATE POLICY "Members can delete household budget items"
ON budget_items FOR DELETE
TO authenticated
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- 7. Migração de dados: Criar household para utilizadores existentes e migrar dados
DO $$
DECLARE
    user_email TEXT;
    user_id_var UUID;
    new_household_id UUID;
BEGIN
    -- Substitui pelos emails reais dos utilizadores
    FOR user_email, user_id_var IN 
        SELECT email, id FROM auth.users WHERE email IN ('carlos.justino@gmail.com', 'tatianer.justino@gmail.com')
    LOOP
        -- Verifica se o utilizador já tem um household
        SELECT household_id INTO new_household_id 
        FROM household_members 
        WHERE user_id = user_id_var 
        LIMIT 1;
        
        IF new_household_id IS NULL THEN
            -- Cria um novo household para a família
            INSERT INTO households (name) 
            VALUES ('Família Justino') 
            RETURNING id INTO new_household_id;
            
            RAISE NOTICE 'Household criado: % para %', new_household_id, user_email;
        END IF;
        
        -- Adiciona o utilizador ao household (se ainda não estiver)
        INSERT INTO household_members (household_id, user_id, role)
        VALUES (new_household_id, user_id_var, 'owner')
        ON CONFLICT (household_id, user_id) DO NOTHING;
        
        -- Atualiza transações do utilizador com o household_id
        UPDATE transactions 
        SET household_id = new_household_id 
        WHERE user_id = user_id_var AND household_id IS NULL;
        
        -- Atualiza budget items do utilizador com o household_id
        UPDATE budget_items 
        SET household_id = new_household_id 
        WHERE user_id = user_id_var AND household_id IS NULL;
        
        RAISE NOTICE 'Dados migrados para % (user: %)', new_household_id, user_email;
    END LOOP;
    
    RAISE NOTICE 'Migração completa! Ambos os utilizadores agora compartilham os mesmos dados.';
END $$;

-- 8. Tornar household_id obrigatório (após migração)
-- DESCOMENTA ESTAS LINHAS DEPOIS DE CONFIRMAR QUE A MIGRAÇÃO FUNCIONOU:
-- ALTER TABLE transactions ALTER COLUMN household_id SET NOT NULL;
-- ALTER TABLE budget_items ALTER COLUMN household_id SET NOT NULL;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Agora:
-- 1. Carlos e Tatianer pertencem ao mesmo household
-- 2. Qualquer transação/orçamento criado por um é visível para o outro
-- 3. Dados são filtrados automaticamente por household_id
-- ============================================
