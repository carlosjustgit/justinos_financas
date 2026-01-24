import React, { useState, useEffect, useRef } from 'react';
import { Transaction, FamilyMember, BudgetItem, Goal } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AdvisorChat from './components/AdvisorChat';
import ImportModal from './components/ImportModal';
import PlanningView from './components/PlanningView';
import AddTransactionModal from './components/AddTransactionModal';
import GoalsWidget from './components/GoalsWidget';
import { supabase, fetchTransactions, addTransactionDb, deleteTransactionDb, updateTransactionDb, addBatchTransactionsDb, fetchBudgetItems, saveBudgetItemsDb, deleteBudgetItemDb, fetchCategories, addCategoryDb } from './services/supabaseClient';
import { LayoutDashboard, Receipt, MessageSquareText, PlusCircle, LogOut, CalendarRange, PenLine, Settings, Download, Upload, Trash2, AlertTriangle, CheckCircle2, LogIn } from 'lucide-react';

enum View {
  DASHBOARD = 'dashboard',
  TRANSACTIONS = 'transactions',
  PLANNING = 'planning',
  ADVISOR = 'advisor',
  SETTINGS = 'settings'
}

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // App State
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Household State
  const [households, setHouseholds] = useState<Array<{id: string, name: string}>>([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  
  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Settings/Backup State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Check Env Vars (Gemini API Key)
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  
  // Force new build with updated API key
  console.log('🔑 API KEY CHECK:', {
    value: GEMINI_API_KEY,
    length: GEMINI_API_KEY?.length,
    hasKey: !!GEMINI_API_KEY && GEMINI_API_KEY.length > 10,
    firstChars: GEMINI_API_KEY?.substring(0, 15),
    buildTime: new Date().toISOString()
  });

  // Simplificação: remover o useEffect e state, verificar direto
  const apiKeyIsValid = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

  // 2. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Data Fetching (Only if logged in)
  useEffect(() => {
    if (session) {
      loadHouseholds();
    }
  }, [session]);

  // 4. Load data when household changes
  useEffect(() => {
    if (session && currentHouseholdId) {
      loadData();
    }
  }, [session, currentHouseholdId]);

  const loadHouseholds = async () => {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select(`
          household_id,
          households (
            id,
            name
          )
        `)
        .eq('user_id', session?.user?.id);

      if (error) throw error;

      const householdList = data.map((hm: any) => ({
        id: hm.households.id,
        name: hm.households.name
      }));

      setHouseholds(householdList);
      
      // Set first household as default
      if (householdList.length > 0 && !currentHouseholdId) {
        setCurrentHouseholdId(householdList[0].id);
      }
    } catch (error) {
      console.error("Error loading households:", error);
    }
  };

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const txs = await fetchTransactions();
      const budgets = await fetchBudgetItems();
      const cats = await fetchCategories();
      setTransactions(txs);
      setBudgetItems(budgets);
      setCustomCategories(cats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- Actions ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    
    try {
      if (isSignUp) {
        // Registar novo usuário
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        setAuthMessage('Conta criada! Faz login agora.');
        setIsSignUp(false);
        setPassword('');
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        setAuthMessage('Login efetuado com sucesso!');
      }
    } catch (error: any) {
      setAuthMessage(error.message || 'Erro ao autenticar');
    }
    
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTransactions([]);
    setBudgetItems([]);
  };

  const handleImport = async (newTransactions: Transaction[]) => {
    // Optimistic update
    setTransactions(prev => [...prev, ...newTransactions]);
    try {
      await addBatchTransactionsDb(newTransactions);
    } catch (e) {
      console.error("Sync error", e);
      alert("Erro ao guardar importação no servidor.");
      loadData(); // Revert
    }
  };

  const handleManualAdd = async (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
    try {
      await addTransactionDb(newTransaction);
    } catch (e) {
      console.error("Sync error", e);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTransactionDb(id);
    } catch (e) {
      console.error("Sync error", e);
      loadData();
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        await updateTransactionDb({ ...transaction, ...updates });
      }
    } catch (e) {
      console.error("Sync error", e);
      loadData();
    }
  };

  const handleSaveBudget = async (items: BudgetItem[]) => {
    // Determine deleted items
    const currentIds = new Set(items.map(i => i.id));
    const toDelete = budgetItems.filter(old => !currentIds.has(old.id));
    
    setBudgetItems(items); // Optimistic

    try {
      // 1. Delete removed
      for (const item of toDelete) {
        await deleteBudgetItemDb(item.id);
      }
      // 2. Upsert current
      await saveBudgetItemsDb(items);
      
      // 3. RELOAD DATA TO GET FRESH DATA FROM SUPABASE!
      await loadData();
      console.log('Budget saved and data reloaded!');
    } catch (e) {
      console.error("Sync error", e);
      loadData();
    }
  };

  const handleAddCategory = async (categoryName: string) => {
    try {
      await addCategoryDb(categoryName);
      // Add to local state immediately
      setCustomCategories(prev => [...new Set([...prev, categoryName])].sort());
      console.log('Category saved:', categoryName);
    } catch (e) {
      console.error("Error saving category:", e);
    }
  };

  // --- Views ---

  const SettingsView = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          Dados & Conta
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Você está ligado como: <strong>{session.user.email}</strong>
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Os seus dados estão seguros na nuvem (Supabase).
        </p>
        
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Terminar Sessão
        </button>
      </div>
      <div className="text-center text-xs text-gray-400 mt-8">
         Versão 2.1.2 (Justino Edition) • Powered by Supabase & Gemini
      </div>
    </div>
  );

  const NavButton = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-sm font-medium transition-all duration-200 ${
        activeView === view
          ? 'bg-emerald-50 text-emerald-700 shadow-sm'
          : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
      }`}
    >
      <Icon className={`w-5 h-5 ${activeView === view ? 'text-emerald-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  // --- Branding Component ---
  const BrandLogo = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => {
    const logoUrl = "/logo-financas-pessoais.jpeg"; 
    
    if (size === 'large') {
        return (
            <div className="flex flex-col items-center justify-center mb-6">
                 <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg border-4 border-white mb-4 bg-emerald-600 flex items-center justify-center">
                    <img 
                        src={logoUrl} 
                        alt="Justino Family Finance" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.classList.add('fallback-text');
                        }} 
                    />
                    <span className="text-white font-bold text-3xl hidden fallback-text:inline">JF</span>
                 </div>
                 <h1 className="text-2xl font-bold text-slate-800">Justino Family Finance</h1>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm border border-slate-100 bg-emerald-600 flex items-center justify-center shrink-0">
                <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.classList.add('fallback-text');
                    }}
                />
                <span className="text-white font-bold text-sm hidden fallback-text:inline">JF</span>
             </div>
             <h1 className="text-lg font-bold text-slate-800 leading-tight">Justino<br/><span className="text-emerald-600">Family Finance</span></h1>
        </div>
    )
  }

  // --- Auth Screen ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          
          <BrandLogo size="large" />

          <p className="text-gray-500 mb-8">Just In Time For Our Future</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900 placeholder:text-gray-400"
              />
            </div>
            
            <div className="text-left">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900 placeholder:text-gray-400"
              />
            </div>
            
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {authLoading ? 'A processar...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
              {!authLoading && <LogIn className="w-4 h-4" />}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthMessage('');
              }}
              className="w-full text-gray-600 text-sm hover:text-emerald-600 transition"
            >
              {isSignUp ? 'Já tens conta? Faz login' : 'Não tens conta? Regista-te'}
            </button>
          </form>
          
          {authMessage && (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
              authMessage.includes('sucesso') || authMessage.includes('criada') 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-red-50 text-red-600'
            }`}>
              {authMessage.includes('sucesso') || authMessage.includes('criada') ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {authMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Main App ---
  
  const checkEnv = () => {
      console.log('⚠️ checkEnv chamado, apiKeyIsValid:', apiKeyIsValid);
      return !apiKeyIsValid;
  }

  if (checkEnv()) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500 p-4 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Configuração Necessária</h2>
                <p className="text-sm text-gray-600 mb-4">
                    A chave de API da Google (Gemini) não foi detetada.
                </p>
                <div className="text-xs bg-slate-100 p-3 rounded text-left font-mono">
                    GEMINI_API_KEY=sua_chave_google_gemini
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Debug: {GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 15)}... (${GEMINI_API_KEY.length} chars)` : 'VAZIA'}
                </p>
            </div>
        </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col hidden md:flex z-10 shadow-sm">
        <div className="p-6">
          <BrandLogo />
          
          {/* Household Selector */}
          {households.length > 0 && (
            <div className="mt-4 mb-6">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">Conta Ativa</label>
              <select
                value={currentHouseholdId || ''}
                onChange={(e) => setCurrentHouseholdId(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900 font-medium cursor-pointer"
              >
                {households.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name.includes('Witfy') || h.name.includes('Startup') ? '💼' : '🏠'} {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <nav className="space-y-2">
            <NavButton view={View.DASHBOARD} icon={LayoutDashboard} label="Visão Geral" />
            <NavButton view={View.TRANSACTIONS} icon={Receipt} label="Transações" />
            <NavButton view={View.PLANNING} icon={CalendarRange} label="Planeamento" />
            <NavButton view={View.ADVISOR} icon={MessageSquareText} label="Consultor IA" />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-50">
           <button 
              onClick={() => setActiveView(View.SETTINGS)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-sm font-medium transition-all mb-4 ${
                activeView === View.SETTINGS
                  ? 'bg-slate-100 text-slate-800'
                  : 'text-gray-500 hover:bg-slate-50'
              }`}
           >
              <Settings className="w-5 h-5" />
              Conta
           </button>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white shadow-lg">
            <p className="text-xs text-slate-300 uppercase font-semibold mb-1">Saldo Familiar</p>
            <p className="text-2xl font-bold">
               {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(
                   transactions.reduce((acc, t) => acc + (t.type === 'Receita' ? t.amount : -t.amount), 0)
               )}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between z-20">
          <div className="font-bold text-sm text-emerald-800">Justino Family Finance</div>
          <div className="flex gap-2">
             <button onClick={() => setActiveView(View.DASHBOARD)} className={`p-2 rounded ${activeView === View.DASHBOARD ? 'bg-emerald-50' : ''}`}><LayoutDashboard size={20}/></button>
             <button onClick={() => setActiveView(View.TRANSACTIONS)} className={`p-2 rounded ${activeView === View.TRANSACTIONS ? 'bg-emerald-50' : ''}`}><Receipt size={20}/></button>
             <button onClick={() => setActiveView(View.ADVISOR)} className={`p-2 rounded ${activeView === View.ADVISOR ? 'bg-emerald-50' : ''}`}><MessageSquareText size={20}/></button>
             <button onClick={() => setActiveView(View.SETTINGS)} className={`p-2 rounded ${activeView === View.SETTINGS ? 'bg-emerald-50' : ''}`}><Settings size={20}/></button>
          </div>
        </header>

        {/* Top Bar (Desktop) */}
        <div className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 hidden md:flex">
           <h2 className="text-lg font-semibold text-slate-700">
             {activeView === View.DASHBOARD && 'Dashboard'}
             {activeView === View.TRANSACTIONS && 'Gestão de Transações'}
             {activeView === View.PLANNING && 'Planeamento Mensal'}
             {activeView === View.ADVISOR && 'Consultoria Financeira'}
             {activeView === View.SETTINGS && 'Definições & Dados'}
           </h2>
           <div className="flex items-center gap-4">
             {isLoadingData && <div className="text-xs text-emerald-600 animate-pulse font-medium">A sincronizar...</div>}
             {activeView !== View.SETTINGS && (
               <>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <PenLine className="w-4 h-4" />
                  Nova Transação
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-200"
                >
                  <PlusCircle className="w-4 h-4" />
                  Importar Extrato
                </button>
               </>
             )}
             <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-sm" title={session.user.email}>
                {session.user.email?.substring(0,2).toUpperCase()}
             </div>
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === View.DASHBOARD && (
              <div className="space-y-6">
                <Dashboard transactions={transactions} />
                <GoalsWidget 
                  goals={goals}
                  onAddGoal={(goal) => setGoals([...goals, goal])}
                  onDeleteGoal={(id) => setGoals(goals.filter(g => g.id !== id))}
                  totalSavings={transactions.filter(t => t.type === 'Poupança').reduce((acc, t) => acc + t.amount, 0)}
                  monthlyIncome={transactions.filter(t => t.type === 'Receita').reduce((acc, t) => acc + t.amount, 0)}
                />
              </div>
            )}
            {activeView === View.TRANSACTIONS && <TransactionList transactions={transactions} budgetItems={budgetItems} customCategories={customCategories} onDelete={handleDelete} onUpdate={handleUpdateTransaction} />}
            {activeView === View.PLANNING && (
              <PlanningView 
                transactions={transactions} 
                savedBudgets={budgetItems}
                customCategories={customCategories}
                onSaveBudgets={handleSaveBudget}
                onAddCategory={handleAddCategory}
              />
            )}
            {activeView === View.ADVISOR && <AdvisorChat transactions={transactions} goals={goals} />}
            {activeView === View.SETTINGS && <SettingsView />}
          </div>
        </div>

        {/* FAB for Mobile */}
        <div className="md:hidden fixed bottom-6 right-6 flex flex-col gap-3 z-50">
            {activeView !== View.SETTINGS && (
              <>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-12 h-12 bg-white text-emerald-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 border border-emerald-100"
                >
                  <PenLine className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-emerald-700"
                >
                  <PlusCircle className="w-8 h-8" />
                </button>
              </>
            )}
        </div>
      </main>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        existingTransactions={transactions}
      />

      <AddTransactionModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleManualAdd}
        existingTransactions={transactions}
        customCategories={customCategories}
      />
    </div>
  );
};

export default App;