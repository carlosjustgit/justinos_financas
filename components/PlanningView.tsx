import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, BudgetItem, FamilyMember } from '../types';
import { CATEGORIES } from '../constants';
import { generateId } from '../utils';
import { ChevronLeft, ChevronRight, Plus, Trash2, Repeat, PiggyBank, Target, AlertCircle, Save, X, AlertTriangle } from 'lucide-react';

interface PlanningViewProps {
  transactions: Transaction[];
  savedBudgets: BudgetItem[];
  onSaveBudgets: (items: BudgetItem[]) => void;
}

const PlanningView: React.FC<PlanningViewProps> = ({ transactions, savedBudgets, onSaveBudgets }) => {
  // State for month navigation (default to current month YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [newItem, setNewItem] = useState({
    description: '',
    amount: '',
    category: CATEGORIES[0],
    type: TransactionType.EXPENSE,
    isRecurring: false,
    recurrenceCount: 12
  });

  // Derived State
  const monthlyBudget = savedBudgets.filter(b => b.month === currentMonth);
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth));

  // Get all unique categories from transactions, budgets, and predefined list
  const allAvailableCategories = React.useMemo(() => {
    const transactionCategories = transactions.map(t => t.category);
    const budgetCategories = savedBudgets.map(b => b.category);
    const allCats = Array.from(new Set([...CATEGORIES, ...transactionCategories, ...budgetCategories]))
      .filter(c => c !== 'Outros')
      .sort();
    
    console.log('Available categories recalculated:', {
      total: allCats.length,
      fromBudgets: budgetCategories,
      allCategories: allCats
    });
    
    return allCats;
  }, [transactions, savedBudgets]);

  // Calculations
  const plannedIncome = monthlyBudget.filter(b => b.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
  const plannedExpense = monthlyBudget.filter(b => b.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
  const plannedSavings = monthlyBudget.filter(b => b.type === TransactionType.SAVINGS).reduce((acc, curr) => acc + curr.amount, 0);
  const plannedInvestments = monthlyBudget.filter(b => b.type === TransactionType.INVESTMENT).reduce((acc, curr) => acc + curr.amount, 0);
  const projectedAvailable = plannedIncome - plannedExpense - plannedSavings - plannedInvestments;

  const actualIncome = monthlyTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
  const actualExpense = monthlyTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
  const actualSavings = monthlyTransactions.filter(t => t.type === TransactionType.SAVINGS).reduce((acc, curr) => acc + curr.amount, 0);
  const actualInvestments = monthlyTransactions.filter(t => t.type === TransactionType.INVESTMENT).reduce((acc, curr) => acc + curr.amount, 0);

  // Helper to change month
  const changeMonth = (offset: number) => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + offset);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const handleAddItem = () => {
    if (!newItem.description || !newItem.amount) return;

    const amount = parseFloat(newItem.amount);
    const newItems: BudgetItem[] = [];

    // Logic for recurrence
    const loops = newItem.isRecurring ? (newItem.recurrenceCount || 1) : 1;
    let targetDate = new Date(currentMonth + '-01');

    for (let i = 0; i < loops; i++) {
      const monthStr = targetDate.toISOString().slice(0, 7);
      
      newItems.push({
        id: generateId(),
        month: monthStr,
        description: newItem.description,
        amount: amount,
        category: newItem.category,
        type: newItem.type,
        isRecurring: newItem.isRecurring
      });

      // Advance month
      targetDate.setMonth(targetDate.getMonth() + 1);
    }

    console.log('Adding budget items with categories:', newItems.map(i => i.category));
    console.log('Current savedBudgets count:', savedBudgets.length);
    console.log('Will have after save:', savedBudgets.length + newItems.length);
    
    onSaveBudgets([...savedBudgets, ...newItems]);
    setIsFormOpen(false);
    // Reset form completely
    setNewItem({ 
      description: '', 
      amount: '', 
      category: CATEGORIES[0],
      type: TransactionType.EXPENSE,
      isRecurring: false,
      recurrenceCount: 12
    });
    setShowNewCategoryInput(false);
  };

  const handleDeleteItem = (id: string) => {
    onSaveBudgets(savedBudgets.filter(b => b.id !== id));
  };

  // Group by category to compare Budget vs Actual
  const categoryComparison = CATEGORIES.map(cat => {
    const planned = monthlyBudget
      .filter(b => b.category === cat && b.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const actual = monthlyTransactions
      .filter(t => t.category === cat && t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    if (planned === 0 && actual === 0) return null;

    return { category: cat, planned, actual };
  }).filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 capitalize">
          {new Date(currentMonth + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow-lg">
          <span className="text-xs font-medium opacity-90">Receitas</span>
          <p className="text-2xl font-bold mt-1">{formatCurrency(plannedIncome)}</p>
          <div className="mt-2 text-xs bg-white/20 px-2 py-1 rounded inline-block">
            Real: {formatCurrency(actualIncome)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-5 rounded-xl shadow-lg">
          <span className="text-xs font-medium opacity-90">Despesas</span>
          <p className="text-2xl font-bold mt-1">{formatCurrency(plannedExpense)}</p>
          <div className="mt-2 text-xs bg-white/20 px-2 py-1 rounded inline-block">
            Real: {formatCurrency(actualExpense)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-xl shadow-lg">
          <span className="text-xs font-medium opacity-90">Poupanças</span>
          <p className="text-2xl font-bold mt-1">{formatCurrency(plannedSavings)}</p>
          <div className="mt-2 text-xs bg-white/20 px-2 py-1 rounded inline-block">
            Real: {formatCurrency(actualSavings)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-xl shadow-lg">
          <span className="text-xs font-medium opacity-90">Investimentos</span>
          <p className="text-2xl font-bold mt-1">{formatCurrency(plannedInvestments)}</p>
          <div className="mt-2 text-xs bg-white/20 px-2 py-1 rounded inline-block">
            Real: {formatCurrency(actualInvestments)}
          </div>
        </div>

        <div className={`p-5 rounded-xl shadow-lg ${projectedAvailable >= 0 ? 'bg-slate-800 text-white' : 'bg-red-600 text-white'}`}>
          <span className="text-xs font-medium opacity-90">Disponível</span>
          <p className="text-2xl font-bold mt-1">{formatCurrency(projectedAvailable)}</p>
          <div className="mt-2 text-xs bg-white/20 px-2 py-1 rounded inline-block">
            {projectedAvailable >= 0 ? '✓ Positivo' : '⚠️ Negativo'}
          </div>
        </div>
      </div>

      {/* Comparison & List Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Category Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Orçamento vs. Realidade</h3>
          <div className="space-y-6">
            {categoryComparison.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sem dados para comparar neste mês.</p>
            ) : (
              categoryComparison.map((item) => {
                const percent = Math.min((item!.actual / (item!.planned || 1)) * 100, 100);
                const isOverBudget = item!.actual > item!.planned;
                
                return (
                  <div key={item!.category}>
                    <div className="flex justify-between items-end text-sm mb-2">
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        {item!.category}
                        {isOverBudget && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold border border-red-100" title="Orçamento excedido">
                            <AlertTriangle className="w-3 h-3" />
                            Excedido
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 text-xs">
                        <span className={`font-semibold text-sm ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                          {formatCurrency(item!.actual)}
                        </span> 
                        <span className="mx-1">/</span> 
                        {formatCurrency(item!.planned)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Budget Items List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Itens do Orçamento</h3>
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          {/* Add Form */}
          {isFormOpen && (
            <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Descrição</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Renda de Casa" 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow placeholder-slate-400"
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Valor (€)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow placeholder-slate-400"
                    value={newItem.amount}
                    onChange={e => setNewItem({...newItem, amount: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Categoria</label>
                  {!showNewCategoryInput ? (
                    <select 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow cursor-pointer"
                      value={newItem.category}
                      onChange={e => {
                        if (e.target.value === '__new__') {
                          setShowNewCategoryInput(true);
                          setCustomCategory('');
                        } else {
                          setNewItem({...newItem, category: e.target.value});
                        }
                      }}
                    >
                      {allAvailableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__new__">+ Nova Categoria</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome da nova categoria"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                      <button
                        onClick={() => {
                          if (customCategory.trim()) {
                            const newCat = customCategory.trim();
                            setNewItem({...newItem, category: newCat});
                            setShowNewCategoryInput(false);
                            setCustomCategory('');
                          }
                        }}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewItem({...newItem, category: CATEGORIES[0]});
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</label>
                  <select 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow cursor-pointer"
                    value={newItem.type}
                    onChange={e => setNewItem({...newItem, type: e.target.value as TransactionType})}
                  >
                    <option value={TransactionType.INCOME}>Receita</option>
                    <option value={TransactionType.EXPENSE}>Despesa</option>
                    <option value={TransactionType.SAVING}>Poupança</option>
                    <option value={TransactionType.INVESTMENT}>Investimento</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-emerald-100 mt-2">
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                   <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-emerald-100/50 transition-colors w-full sm:w-auto">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          className="peer h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={newItem.isRecurring}
                          onChange={e => setNewItem({...newItem, isRecurring: e.target.checked})}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Pagamento Recorrente</span>
                   </label>

                   {newItem.isRecurring && (
                     <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                       <Repeat className="w-3 h-3 text-emerald-500" />
                       <span>x</span>
                       <input 
                          type="number" 
                          min="2" 
                          max="24"
                          value={newItem.recurrenceCount}
                          onChange={e => setNewItem({...newItem, recurrenceCount: parseInt(e.target.value)})}
                          className="w-12 p-0.5 border-b border-emerald-300 text-center focus:outline-none font-bold text-emerald-700"
                       />
                       <span>meses</span>
                     </div>
                   )}
                 </div>

                 <div className="flex justify-end gap-3 w-full sm:w-auto">
                   <button 
                    onClick={() => setIsFormOpen(false)} 
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                   <button 
                    onClick={handleAddItem} 
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200 flex items-center gap-2 transition-all hover:shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    Guardar
                  </button>
                 </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {monthlyBudget.length === 0 ? (
               <div className="p-12 flex flex-col items-center justify-center text-center text-gray-400">
                 <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <PiggyBank className="w-6 h-6 text-slate-300" />
                 </div>
                 <p className="text-sm">Sem itens planeados para este mês.</p>
                 <p className="text-xs mt-1">Adicione as suas despesas fixas para começar.</p>
               </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-gray-100 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyBudget.map(item => (
                    <tr key={item.id} className="group hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                            {item.isRecurring && <Repeat className="w-3 h-3 text-emerald-400" />}
                            <div>
                                <p className="text-sm font-medium text-slate-800">{item.description}</p>
                                <p className="text-xs text-gray-500">{item.category}</p>
                            </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-bold ${item.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {item.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(item.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right w-10">
                         <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                            title="Remover"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningView;