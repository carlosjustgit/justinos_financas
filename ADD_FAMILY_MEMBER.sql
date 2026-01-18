-- Script para adicionar tatianer.justino@gmail.com à tua conta familiar
-- 
-- INSTRUÇÕES:
-- 1. Vai ao Supabase Dashboard → SQL Editor
-- 2. Cola este script
-- 3. Executa
-- 4. Pronto! Ela verá todos os teus dados e vocês compartilham tudo

-- Primeiro, vamos pegar os IDs dos 2 utilizadores
DO $$
DECLARE
    main_user_id UUID;
    family_user_id UUID;
BEGIN
    -- Encontra o teu user_id (substitui 'teu@email.com' pelo email que usaste para registar)
    SELECT id INTO main_user_id FROM auth.users WHERE email = 'teu@email.com' LIMIT 1;
    
    -- Encontra o user_id da Tatianer
    SELECT id INTO family_user_id FROM auth.users WHERE email = 'tatianer.justino@gmail.com' LIMIT 1;
    
    -- Mostra os IDs encontrados
    RAISE NOTICE 'Main User ID: %', main_user_id;
    RAISE NOTICE 'Family User ID: %', family_user_id;
    
    -- Atualiza TODAS as transações do utilizador principal para também pertencerem ao user da família
    -- (isto é um hack rápido - a forma correta seria criar um sistema de households)
    UPDATE transactions 
    SET user_id = family_user_id 
    WHERE user_id = main_user_id;
    
    UPDATE budget_items 
    SET user_id = family_user_id 
    WHERE user_id = main_user_id;
    
    RAISE NOTICE 'Dados migrados! Agora ambos os utilizadores veem os mesmos dados.';
END $$;

-- ATENÇÃO: Este script faz com que TODOS os dados passem a pertencer à Tatianer.
-- Se quiseres que AMBOS vejam os dados, precisas de modificar as RLS policies.
-- 
-- Para isso, executa também este script:

-- Remove as policies existentes
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view own budget items" ON budget_items;
DROP POLICY IF EXISTS "Users can insert own budget items" ON budget_items;
DROP POLICY IF EXISTS "Users can delete own budget items" ON budget_items;
DROP POLICY IF EXISTS "Users can update own budget items" ON budget_items;

-- Cria novas policies que permitem acesso compartilhado
-- (qualquer user autenticado vê todos os dados - CUIDADO: isto é inseguro para produção)

-- Transactions
CREATE POLICY "Authenticated users can view all transactions" 
ON transactions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert transactions" 
ON transactions FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all transactions" 
ON transactions FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete all transactions" 
ON transactions FOR DELETE 
TO authenticated 
USING (true);

-- Budget Items
CREATE POLICY "Authenticated users can view all budget items" 
ON budget_items FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert budget items" 
ON budget_items FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all budget items" 
ON budget_items FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete all budget items" 
ON budget_items FOR DELETE 
TO authenticated 
USING (true);

-- Pronto! Agora qualquer utilizador autenticado pode ver/editar todos os dados.
-- IMPORTANTE: Isto significa que se mais alguém criar conta, também verá os teus dados.
-- Para produção, deves implementar um sistema de households/famílias correto.
