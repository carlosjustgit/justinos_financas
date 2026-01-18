import React, { useState } from 'react';
import { Goal } from '../types';
import { Target, TrendingUp, AlertCircle, Sparkles, Plus, Trash2 } from 'lucide-react';

interface GoalsWidgetProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  totalSavings: number;
  monthlyIncome: number;
}

const GoalsWidget: React.FC<GoalsWidgetProps> = ({ goals, onAddGoal, onDeleteGoal, totalSavings, monthlyIncome }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    category: 'other' as Goal['category'],
    priority: 'medium' as Goal['priority']
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const calculateProgress = (goal: Goal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const calculateMonthsRemaining = (deadline: string) => {
    const now = new Date();
    const target = new Date(deadline);
    const months = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, months);
  };

  const suggestMonthlySaving = (goal: Goal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsLeft = calculateMonthsRemaining(goal.deadline);
    if (monthsLeft === 0) return 0;
    return remaining / monthsLeft;
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.targetAmount || !formData.deadline) return;

    const newGoal: Goal = {
      id: Date.now().toString(),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: 0,
      deadline: formData.deadline,
      category: formData.category,
      priority: formData.priority,
      createdAt: new Date().toISOString()
    };

    onAddGoal(newGoal);
    setFormData({ name: '', targetAmount: '', deadline: '', category: 'other', priority: 'medium' });
    setShowAddForm(false);
  };

  const getCategoryIcon = (category: Goal['category']) => {
    const icons = {
      emergency: '🚨',
      vacation: '✈️',
      house: '🏠',
      education: '🎓',
      retirement: '👴',
      other: '🎯'
    };
    return icons[category];
  };

  const getPriorityColor = (priority: Goal['priority']) => {
    return priority === 'high' ? 'text-red-600' : priority === 'medium' ? 'text-amber-600' : 'text-blue-600';
  };

  // IA Insight: Analisar saúde das metas
  const aiInsight = () => {
    const totalTarget = goals.reduce((acc, g) => acc + (g.targetAmount - g.currentAmount), 0);
    const recommendedMonthly = totalTarget / 12; // Assumir 1 ano
    const savingsCapacity = monthlyIncome * 0.2; // 20% do rendimento

    if (recommendedMonthly > savingsCapacity) {
      return {
        type: 'warning',
        message: `Para atingir todas as metas, precisas poupar ${formatCurrency(recommendedMonthly)}/mês. Considera ${formatCurrency(savingsCapacity)} (20% do rendimento).`
      };
    }
    return {
      type: 'success',
      message: `Estás no caminho certo! Poupando ${formatCurrency(savingsCapacity)}/mês, atinges as tuas metas.`
    };
  };

  const insight = goals.length > 0 ? aiInsight() : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-800">Metas Financeiras</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      {/* IA Insight */}
      {insight && (
        <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
          insight.type === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
        }`}>
          <Sparkles className={`w-4 h-4 mt-0.5 ${insight.type === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`} />
          <p className={`text-sm ${insight.type === 'warning' ? 'text-amber-800' : 'text-emerald-800'}`}>
            {insight.message}
          </p>
        </div>
      )}

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nome da meta"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <input
              type="number"
              placeholder="Valor objetivo (€)"
              value={formData.targetAmount}
              onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="date"
              value={formData.deadline}
              onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as Goal['category'] })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="emergency">Emergência</option>
              <option value="vacation">Férias</option>
              <option value="house">Casa</option>
              <option value="education">Educação</option>
              <option value="retirement">Reforma</option>
              <option value="other">Outro</option>
            </select>
            <select
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as Goal['priority'] })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
            >
              Adicionar Meta
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Ainda não tens metas definidas.</p>
            <p className="text-xs mt-1">Cria a tua primeira meta para começar!</p>
          </div>
        ) : (
          goals.map(goal => {
            const progress = calculateProgress(goal);
            const monthsLeft = calculateMonthsRemaining(goal.deadline);
            const suggestedMonthly = suggestMonthlySaving(goal);
            const isUrgent = monthsLeft <= 3 && progress < 50;

            return (
              <div key={goal.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                    <div>
                      <h4 className="font-semibold text-slate-800">{goal.name}</h4>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                      {goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-600">{progress.toFixed(0)}% completo</span>
                    <span className="text-xs text-gray-600">
                      {monthsLeft} {monthsLeft === 1 ? 'mês' : 'meses'} restantes
                    </span>
                  </div>
                </div>

                {/* IA Suggestion */}
                {progress < 100 && (
                  <div className={`flex items-center gap-2 text-xs p-2 rounded ${
                    isUrgent ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {isUrgent ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3" />
                    )}
                    <span>
                      {isUrgent 
                        ? `⚠️ Urgente! Poupa ${formatCurrency(suggestedMonthly)}/mês`
                        : `Sugestão: Poupa ${formatCurrency(suggestedMonthly)}/mês para atingir a meta`
                      }
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GoalsWidget;
