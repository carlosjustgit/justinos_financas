import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Sparkles, AlertTriangle, CalendarClock, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  // Month selector state - default to current month
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedMonth = selectedDate.toISOString().slice(0, 7); // YYYY-MM
  
  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Month navigation
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

  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

  // --- Core Calculations (filtered by month) ---
  const totalIncome = monthTransactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = monthTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSavings = monthTransactions
    .filter(t => t.type === TransactionType.SAVINGS)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalInvestments = monthTransactions
    .filter(t => t.type === TransactionType.INVESTMENT)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense - totalSavings - totalInvestments;
  const savingsRate = totalIncome > 0 ? ((totalSavings + totalInvestments) / totalIncome) * 100 : 0;

  // --- SUPERPOWER: Subscription Detective Logic ---
  // Detect recurring expenses (same description, similar amount, appearing > 1 time)
  // Use ALL transactions, not just current month
  const subscriptions = useMemo(() => {
    const groups: Record<string, { count: number; amount: number; lastDate: string }> = {};
    
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        // Normalize description to group similar ones
        const key = t.description.toLowerCase().trim(); 
        if (!groups[key]) {
          groups[key] = { count: 0, amount: t.amount, lastDate: t.date };
        }
        groups[key].count += 1;
        groups[key].amount = t.amount; 
      });

    // Filter for things that look like subscriptions
    return Object.entries(groups)
      .filter(([key, data]) => {
         const isSubscriptionKeyword = ['netflix', 'spotify', 'vodafone', 'meo', 'nos', 'ginásio', 'fitness', 'apple', 'google', 'edp', 'epal'].some(k => key.includes(k));
         return data.count > 1 || isSubscriptionKeyword;
      })
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalMonthlySubscriptions = subscriptions.reduce((acc, s) => acc + s.amount, 0);

  // --- SUPERPOWER: Time Machine (Forecast) Logic ---
  const forecast = useMemo(() => {
    if (!isCurrentMonth) {
      // For past/future months, just show the actual balance
      return {
        avgDailySpend: totalExpense / new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate(),
        projectedBalance: balance,
        status: balance > 0 ? 'safe' : 'danger'
      };
    }

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();

    // Calculate burn rate (avg expense per day so far)
    const daysPassed = Math.max(1, currentDay);
    const avgDailySpend = totalExpense / daysPassed;

    // Project remaining days
    const remainingDays = daysInMonth - currentDay;
    const projectedExtraExpense = avgDailySpend * remainingDays;
    
    const projectedTotalExpense = totalExpense + projectedExtraExpense;
    const projectedBalance = totalIncome - projectedTotalExpense;

    return {
        avgDailySpend,
        projectedBalance,
        status: projectedBalance > 0 ? 'safe' : 'danger'
    };
  }, [monthTransactions, isCurrentMonth, totalIncome, totalExpense, balance, selectedDate]);


  // --- Chart Data Preparation (filtered by month) ---
  const expenseByCategory = monthTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  })).sort((a, b) => b.value - a.value);

  const last7Transactions = [...monthTransactions]
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7)
      .reverse()
      .map(t => ({
          name: new Date(t.date).toLocaleDateString('pt-PT', {day: '2-digit', month: '2-digit'}),
          amount: t.type === TransactionType.INCOME ? t.amount : -t.amount
      }));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Month Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
        <button 
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
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
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 font-medium text-sm">Receitas</h3>
            <div className="p-2 bg-blue-100 rounded-full">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(totalIncome)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Entradas</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 font-medium text-sm">Despesas</h3>
            <div className="p-2 bg-red-100 rounded-full">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Saídas</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 font-medium text-sm">Poupanças</h3>
            <div className="p-2 bg-emerald-100 rounded-full">
              <span className="text-lg">🎯</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalSavings)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Guardado</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 font-medium text-sm">Investimentos</h3>
            <div className="p-2 bg-purple-100 rounded-full">
              <span className="text-lg">📈</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(totalInvestments)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Aplicado</p>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-5 rounded-xl shadow-lg flex flex-col justify-between text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm opacity-90">Disponível</h3>
            <div className="p-2 bg-white/20 rounded-full">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? '' : 'text-red-300'}`}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs opacity-75 mt-1">Taxa poupança: {savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* SUPERPOWERS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* POWER 1: Time Machine (Forecast) */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                 <CalendarClock className="w-32 h-32" />
             </div>
             
             <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-lg">Máquina do Tempo Financeira</h3>
                 </div>
                 
                 <div className="space-y-4">
                     <div>
                        <p className="text-indigo-200 text-sm">Ritmo de gasto diário (Média)</p>
                        <p className="text-2xl font-bold">{formatCurrency(forecast.avgDailySpend)} / dia</p>
                     </div>

                     <div className={`p-4 rounded-lg border ${forecast.status === 'safe' ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                        <p className="text-sm font-medium mb-1 opacity-90">Previsão de Saldo (Fim do Mês)</p>
                        <p className={`text-3xl font-bold ${forecast.status === 'safe' ? 'text-emerald-300' : 'text-red-300'}`}>
                            {formatCurrency(forecast.projectedBalance)}
                        </p>
                        <p className="text-xs mt-2 opacity-75">
                            {forecast.status === 'safe' 
                             ? (isCurrentMonth ? "Estás num bom caminho para poupar este mês!" : "Mês com saldo positivo")
                             : (isCurrentMonth ? "Cuidado! A este ritmo podes entrar no vermelho." : "Mês com saldo negativo")}
                        </p>
                     </div>
                 </div>
             </div>
          </div>

          {/* POWER 2: Subscription Detective */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
             <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-lg text-slate-800">Detetive de Assinaturas</h3>
                 </div>
                 <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                     {formatCurrency(totalMonthlySubscriptions)}/mês
                 </span>
             </div>

             <div className="flex-1 overflow-y-auto max-h-48 pr-2 space-y-3">
                 {subscriptions.length === 0 ? (
                     <p className="text-sm text-gray-400 text-center py-4">Nenhuma assinatura recorrente detetada ainda.</p>
                 ) : (
                     subscriptions.map((sub, idx) => (
                         <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group">
                             <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                                     {sub.name.substring(0, 2)}
                                 </div>
                                 <div>
                                     <p className="text-sm font-medium text-slate-800 capitalize">{sub.name}</p>
                                     <p className="text-xs text-gray-500">Custo anual est.: {formatCurrency(sub.amount * 12)}</p>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="text-sm font-bold text-slate-800">{formatCurrency(sub.amount)}</p>
                                 {sub.amount > 50 && <AlertTriangle className="w-3 h-3 text-red-400 ml-auto mt-1" />}
                             </div>
                         </div>
                     ))
                 )}
             </div>
             <div className="mt-4 pt-3 border-t border-slate-50 text-center">
                 <p className="text-xs text-gray-400">
                     A IA analisa padrões de repetição para identificar estas despesas.
                 </p>
             </div>
          </div>

      </div>

      {/* Standard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Despesas por Categoria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
              {pieData.slice(0,6).map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length]}}></div>
                      <span className="truncate">{entry.name}</span>
                  </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-bold text-slate-800 mb-6">Últimos Movimentos</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={last7Transactions}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" tick={{fontSize: 12}} />
                 <YAxis tick={{fontSize: 12}} />
                 <Tooltip formatter={(value: number) => formatCurrency(value)} />
                 <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                    {last7Transactions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#10B981' : '#EF4444'} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;