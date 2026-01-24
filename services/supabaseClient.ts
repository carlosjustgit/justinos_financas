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

// --- Helper Functions ---

// Get user's household ID
export const getUserHouseholdId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching household:', error);
    return null;
  }

  return data?.household_id || null;
};

// --- Transactions API ---

export const fetchTransactions = async (householdId?: string): Promise<Transaction[]> => {
  const hid = householdId || await getUserHouseholdId();
  if (!hid) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', hid)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data as Transaction[];
};

export const addTransactionDb = async (transaction: Transaction, householdId?: string) => {
  const { id, ...rest } = transaction; 
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const hid = householdId || await getUserHouseholdId();
  if (!hid) throw new Error("User not in a household");

  const { error } = await supabase
    .from('transactions')
    .insert([{ ...rest, id, user_id: user.id, household_id: hid }]);

  if (error) throw error;
};

export const deleteTransactionDb = async (id: string) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const updateTransactionDb = async (transaction: Transaction, householdId?: string) => {
  const { id, ...rest } = transaction;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const hid = householdId || await getUserHouseholdId();
  if (!hid) throw new Error("User not in a household");

  const { error } = await supabase
    .from('transactions')
    .update({ ...rest, user_id: user.id, household_id: hid })
    .eq('id', id);

  if (error) throw error;
};

export const addBatchTransactionsDb = async (transactions: Transaction[], householdId?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const hid = householdId || await getUserHouseholdId();
  if (!hid) throw new Error("User not in a household");

  const records = transactions.map(({ id, ...rest }) => ({
    ...rest,
    id,
    user_id: user.id,
    household_id: hid
  }));

  const { error } = await supabase
    .from('transactions')
    .insert(records);

  if (error) throw error;
};

// --- Budget API ---

export const fetchBudgetItems = async (householdId?: string): Promise<BudgetItem[]> => {
  const hid = householdId || await getUserHouseholdId();
  if (!hid) return [];

  const { data, error } = await supabase
    .from('budget_items')
    .select('*')
    .eq('household_id', hid);

  if (error) {
    console.error('Error fetching budget:', error);
    return [];
  }
  
  return data.map((item: any) => ({
    ...item,
    isRecurring: item.is_recurring
  })) as BudgetItem[];
};

export const saveBudgetItemsDb = async (items: BudgetItem[], householdId?: string) => {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error("User not logged in");

   const hid = householdId || await getUserHouseholdId();
   if (!hid) throw new Error("User not in a household");

   const records = items.map(({ id, isRecurring, ...rest }) => ({
     ...rest,
     id,
     is_recurring: isRecurring,
     user_id: user.id,
     household_id: hid
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

// --- Categories API ---

export const fetchCategories = async (householdId?: string): Promise<string[]> => {
  const hid = householdId || await getUserHouseholdId();
  if (!hid) return [];

  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .eq('household_id', hid)
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data.map(c => c.name);
};

export const addCategoryDb = async (categoryName: string, householdId?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const hid = householdId || await getUserHouseholdId();
  if (!hid) throw new Error("User not in a household");

  const { error } = await supabase
    .from('categories')
    .insert([{ name: categoryName, household_id: hid }]);

  if (error) {
    // Ignore duplicate errors (unique constraint)
    if (error.code !== '23505') {
      throw error;
    }
  }
};