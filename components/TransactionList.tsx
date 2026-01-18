import React, { useState } from 'react';
import { Transaction, TransactionType, FamilyMember, BudgetItem } from '../types';
import { Search, Filter, Trash2, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, Edit2, X } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface TransactionListProps {
  transactions: Transaction[];
  budgetItems?: BudgetItem[];
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, budgetItems = [], onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  
  const selectedMonth = selectedDate.toISOString().slice(0, 7); // YYYY-MM
  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

  // Get all unique categories from existing transactions + predefined ones + budget items
  const allCategories = React.useMemo(() => {
    const transactionCategories = transactions.map(t => t.category);
    const budgetCategories = budgetItems.map(b => b.category);
    return Array.from(new Set([...CATEGORIES, ...transactionCategories, ...budgetCategories])).sort();
  }, [transactions, budgetItems]);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMember = filterMember === 'all' || t.member === filterMember;
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesMonth = t.date.startsWith(selectedMonth);
    return matchesSearch && matchesMember && matchesType && matchesMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const goToPreviousMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
        <button 
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {formatMonthYear(selectedDate)}
          </h2>
          {!isCurrentMonth && (
            <button 
              onClick={goToCurrentMonth}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1"
            >
              Voltar ao mês atual
            </button>
          )}
        </div>
        
        <button 
          onClick={goToNextMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
        <h3 className="text-lg font-bold text-slate-800">Histórico de Transações</h3>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white cursor-pointer"
            >
              <option value="all">Todos Tipos</option>
              {Object.values(TransactionType).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white cursor-pointer"
            >
              <option value="all">Todos Membros</option>
              {Object.values(FamilyMember).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Membro</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">
                    {t.description}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        setEditingCategoryId(t.id);
                        setCategorySearch('');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      {t.category}
                      <Edit2 className="w-3 h-3 opacity-50" />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {t.member}
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                    <div className="flex items-center justify-end gap-2">
                       {t.type === TransactionType.INCOME ? <ArrowUpCircle className="w-4 h-4 text-emerald-500" /> : <ArrowDownCircle className="w-4 h-4 text-red-400" />}
                       {formatCurrency(t.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onDelete(t.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Category Edit Modal */}
    {editingCategoryId && onUpdate && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="text-lg font-bold text-slate-800">Alterar Categoria</h3>
            <button 
              onClick={() => setEditingCategoryId(null)} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar categoria..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {allCategories
              .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
              .map(cat => {
                const transaction = transactions.find(t => t.id === editingCategoryId);
                const isSelected = transaction?.category === cat;
                
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      onUpdate(editingCategoryId, { category: cat });
                      setEditingCategoryId(null);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                      isSelected 
                        ? 'bg-emerald-100 text-emerald-700 font-medium' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            {allCategories.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Nenhuma categoria encontrada</p>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default TransactionList;
