import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, FamilyMember } from '../types';
import { CATEGORIES } from '../constants';
import { generateId } from '../utils';
import { parseReceiptImage } from '../services/geminiService';
import { X, Save, Wallet, Camera, Loader2, Sparkles } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Transaction) => void;
  existingTransactions?: Transaction[];
  customCategories?: string[];
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onAdd, existingTransactions = [], customCategories = [] }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: CATEGORIES[1], // Default to Supermercado or similar
    type: TransactionType.EXPENSE,
    member: FamilyMember.ME
  });
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get all unique categories
  const allCategories = React.useMemo(() => {
    const transactionCategories = existingTransactions.map(t => t.category);
    return Array.from(new Set([...CATEGORIES, ...transactionCategories, ...customCategories])).sort();
  }, [existingTransactions, customCategories]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const data = await parseReceiptImage(file);
      setFormData(prev => ({
        ...prev,
        description: data.description || prev.description,
        amount: data.amount ? data.amount.toString() : prev.amount,
        date: data.date || prev.date,
        category: data.category && CATEGORIES.includes(data.category) ? data.category : prev.category,
        type: (data.type as TransactionType) || prev.type
      }));
    } catch (error) {
      console.error(error);
      alert("Não foi possível ler o recibo. Tente manualmente.");
    } finally {
      setIsScanning(false);
      // Clear input to allow re-selection
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!formData.description || !formData.amount) return;

    const newTransaction: Transaction = {
      id: generateId(),
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      category: formData.category,
      type: formData.type,
      member: formData.member
    };

    onAdd(newTransaction);
    onClose();
    // Reset critical fields
    setFormData(prev => ({ ...prev, description: '', amount: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Nova Transação Manual
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Scan Section */}
        <div className="bg-emerald-50/50 p-4 border-b border-emerald-100 flex justify-center">
            <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-full shadow-sm border border-emerald-200 hover:bg-emerald-50 transition-all font-medium text-sm"
            >
                {isScanning ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        A Analisar Recibo...
                    </>
                ) : (
                    <>
                        <Camera className="w-4 h-4" />
                        Digitalizar Recibo com IA
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                    </>
                )}
            </button>
        </div>

        <div className="p-6 space-y-4 relative">
          {isScanning && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="text-emerald-600 font-semibold animate-pulse">A extrair dados...</div>
              </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Café e Pastel"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-slate-400 transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Valor (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Categoria</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Tipo</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value={TransactionType.INCOME}>💰 Receita</option>
                  <option value={TransactionType.EXPENSE}>💸 Despesa</option>
                  <option value={TransactionType.SAVINGS}>🎯 Poupança</option>
                  <option value={TransactionType.INVESTMENT}>📈 Investimento</option>
                </select>
             </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Membro da Família</label>
             <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                {Object.values(FamilyMember).map(m => (
                    <button
                        key={m}
                        onClick={() => setFormData({...formData, member: m})}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                            formData.member === m 
                            ? 'bg-white text-emerald-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {m}
                    </button>
                ))}
             </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200"
          >
            <Save className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;