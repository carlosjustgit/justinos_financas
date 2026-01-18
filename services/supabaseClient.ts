import { createClient } from '@supabase/supabase-js';
import { Transaction, BudgetItem } from '../types';

// Configuração do Supabase
// Usamos as variáveis de ambiente se existirem (boa prática para produção),
// mas temos valores de fallback para que a app funcione imediatamente com o teu projeto.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://veiktgexwjpycasjxrjv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Vw5KWK1cPJUurfJoBzg3Sw_0rWDchyM';

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- Transactions API ---

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data as Transaction[];
};

export const addTransactionDb = async (transaction: Transaction) => {
  const { id, ...rest } = transaction; 
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const { error } = await supabase
    .from('transactions')
    .insert([{ ...rest, id, user_id: user.id }]);

  if (error) throw error;
};

export const deleteTransactionDb = async (id: string) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const updateTransactionDb = async (transaction: Transaction) => {
  const { id, ...rest } = transaction;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const { error } = await supabase
    .from('transactions')
    .update({ ...rest, user_id: user.id })
    .eq('id', id);

  if (error) throw error;
};

export const addBatchTransactionsDb = async (transactions: Transaction[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const records = transactions.map(({ id, ...rest }) => ({
    ...rest,
    id,
    user_id: user.id
  }));

  const { error } = await supabase
    .from('transactions')
    .insert(records);

  if (error) throw error;
};

// --- Budget API ---

export const fetchBudgetItems = async (): Promise<BudgetItem[]> => {
  const { data, error } = await supabase
    .from('budget_items')
    .select('*');

  if (error) {
    console.error('Error fetching budget:', error);
    return [];
  }
  
  return data.map((item: any) => ({
    ...item,
    isRecurring: item.is_recurring
  })) as BudgetItem[];
};

export const saveBudgetItemsDb = async (items: BudgetItem[]) => {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error("User not logged in");

   const records = items.map(({ id, isRecurring, ...rest }) => ({
     ...rest,
     id,
     is_recurring: isRecurring,
     user_id: user.id
   }));

   const { error } = await supabase
     .from('budget_items')
     .upsert(records);
     
   if (error) throw error;
};

export const deleteBudgetItemDb = async (id: string) => {
  const { error } = await supabase
    .from('budget_items')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}