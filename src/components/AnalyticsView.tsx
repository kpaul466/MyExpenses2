import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis } from 'recharts';
import { Transaction, AppCategory, TransactionType } from '../types';
import { BarChart3, TrendingUp, Wallet, ListChecks, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnalyticsViewProps {
  expenses: Transaction[];
  categories: AppCategory[];
  incomePrivacy: boolean;
  expensePrivacy: boolean;
  currency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ expenses, categories, incomePrivacy, expensePrivacy, currency }) => {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const realizedExpenses = useMemo(() => 
    expenses.filter(e => e.paymentMode === 'CASH'), 
  [expenses]);

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return realizedExpenses.filter(e => {
      const d = new Date(e.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [realizedExpenses]);

  const categoryData = useMemo(() => {
    const groups = currentMonthExpenses.reduce((acc, curr) => {
      acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(groups).map(([id, value]) => {
      const cat = categories.find(c => c.id === id);
      return { 
        id,
        name: cat?.name || 'Other', 
        value,
        color: cat?.color || '#cbd5e1'
      };
    }).sort((a: any, b: any) => b.value - a.value);
  }, [currentMonthExpenses, categories]);

  const selectedTotal = useMemo(() => {
    return categoryData
      .filter(cat => selectedCategoryIds.includes(cat.id))
      .reduce((sum, cat) => sum + cat.value, 0);
  }, [categoryData, selectedCategoryIds]);

  const trendData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dayGroups = currentMonthExpenses.reduce((acc, curr) => {
      const date = new Date(curr.timestamp).getDate();
      if (!acc[date]) acc[date] = { income: 0, expense: 0 };
      if (curr.type === 'INCOME') acc[date].income += curr.amount;
      else acc[date].expense += curr.amount;
      return acc;
    }, {} as Record<number, { income: number, expense: number }>);

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        name: day.toString(),
        income: dayGroups[day]?.income || 0,
        expense: dayGroups[day]?.expense || 0,
      };
    });
  }, [currentMonthExpenses]);

  const formatAmount = (amount: number, type?: TransactionType) => {
    const isPrivacyOn = type === 'INCOME' ? incomePrivacy : type === 'EXPENSE' ? expensePrivacy : (incomePrivacy || expensePrivacy);
    if (isPrivacyOn) return '•••';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-3 rounded-[20px] shadow-lg shadow-indigo-100">
             <BarChart3 size={20} />
           </div>
           <div>
            <h2 className="text-xl font-black text-slate-800 font-heading">Insights</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report for {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[36px] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-600" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Trajectory</h3>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-[8px] font-black text-slate-500 uppercase">Out</span></div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-black text-slate-500 uppercase">In</span></div>
          </div>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} interval={4} />
              <Area type="monotone" dataKey="expense" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorInc)" />
              <Tooltip 
                contentStyle={{ fontSize: '10px', fontWeight: '900', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(value: number, name: string) => [formatAmount(value, name === 'income' ? 'INCOME' : 'EXPENSE'), name.toUpperCase()]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-[36px] p-8 border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-2xl">
            <Wallet size={18} />
          </div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Allocation</h3>
        </div>
        
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={10}
                dataKey="value"
                stroke="none"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatAmount(value, 'EXPENSE')} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <ListChecks size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Full Allocation List</span>
            </div>
            {selectedCategoryIds.length >= 1 && (
              <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black font-heading animate-in fade-in slide-in-from-right duration-300 shadow-lg shadow-indigo-100 flex items-center gap-2">
                <span className="opacity-60">Selection Sum:</span>
                <span>{formatAmount(selectedTotal, 'EXPENSE')}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            <AnimatePresence>
            {categoryData.length === 0 ? (
              <p className="text-center text-[10px] text-slate-300 font-black uppercase tracking-widest py-8">No data for current month</p>
            ) : (
              categoryData.map((cat, index) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    key={cat.id} 
                    onClick={() => toggleCategorySelection(cat.id)}
                    className={`flex items-center justify-between p-4 rounded-3xl border transition-all text-left group shadow-sm hover:shadow-md ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'bg-slate-50 border-transparent hover:border-indigo-100 hover:bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'scale-110 shadow-lg' : ''}`} style={{ backgroundColor: cat.color }}>
                        {isSelected ? <Check size={14} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-white/40" />}
                      </div>
                      <span className={`text-xs font-black font-heading transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{cat.name}</span>
                    </div>
                    <span className={`text-sm font-black font-heading tracking-tight transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-900'}`}>
                      {formatAmount(cat.value, 'EXPENSE')}
                    </span>
                  </motion.button>
                )
              })
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
