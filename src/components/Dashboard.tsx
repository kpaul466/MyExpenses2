import React, { useMemo, useState } from 'react';
import { Transaction, AppCategory, TransactionType } from '../types';
import { Wallet, Activity, Zap, Star, Lock, Unlock, Radar, Filter, ChevronRight, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IconRenderer } from './IconRenderer';

type DashboardFilter = 'month' | 'today' | 'range' | 'all';

interface DashboardProps {
  expenses: Transaction[];
  categories: AppCategory[];
  incomePrivacy: boolean;
  expensePrivacy: boolean;
  currency: string;
  watchedCategoryIds: string[];
  syncStatus: string;
  lastSynced: number | null;
  onTogglePrivacy: (type: 'income' | 'expense') => void;
  onViewToday: () => void;
  onCategoryClick: (categoryId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, 
  categories, 
  incomePrivacy,
  expensePrivacy,
  currency,
  watchedCategoryIds,
  syncStatus,
  lastSynced,
  onTogglePrivacy,
  onViewToday,
  onCategoryClick
}) => {
  const [filter, setFilter] = useState<DashboardFilter>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter(e => {
      const d = new Date(e.timestamp);
      
      if (filter === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (filter === 'month') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (filter === 'range' && startDate && endDate) {
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999);
        return e.timestamp >= start && e.timestamp <= end;
      }
      
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [expenses, filter, startDate, endDate]);

  const realizedExpenses = useMemo(() => 
    filteredExpenses.filter(e => e.paymentMode === 'CASH'), 
  [filteredExpenses]);

  const stats = useMemo(() => {
    const income = realizedExpenses.filter(e => e.type === 'INCOME').reduce((s, e) => s + e.amount, 0);
    const spent = realizedExpenses.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0);
    
    const creditTxs = filteredExpenses.filter(e => e.paymentMode === 'CREDIT' && !e.isCleared);
    const lent = creditTxs.filter(e => e.creditType === 'LENT').reduce((s, e) => s + e.amount, 0);
    const borrowed = creditTxs.filter(e => e.creditType === 'BORROWED').reduce((s, e) => s + e.amount, 0);

    return { income, spent, balance: income - spent, lent, borrowed };
  }, [realizedExpenses, filteredExpenses]);

  const watchedTotals = useMemo(() => {
    return watchedCategoryIds.map(cid => {
      const cat = categories.find(c => c.id === cid);
      const total = realizedExpenses
        .filter(e => e.categoryId === cid && e.type === 'EXPENSE')
        .reduce((sum, e) => sum + e.amount, 0);
      return { ...cat, total };
    }).filter(item => !!item.id);
  }, [realizedExpenses, categories, watchedCategoryIds]);

  const recentTxs = useMemo(() => {
    return filteredExpenses.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
  }, [filteredExpenses]);

  const insights = useMemo(() => {
    const totalDays = new Set(realizedExpenses.map(e => new Date(e.timestamp).toDateString())).size || 1;
    const dailyAvg = stats.spent / totalDays;
    
    const catGroups = realizedExpenses.filter(e => e.type === 'EXPENSE').reduce((acc, curr) => {
      acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const topCatId = Object.entries(catGroups).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];
    const topCat = categories.find(c => c.id === topCatId);

    return { dailyAvg, topCat };
  }, [realizedExpenses, stats.spent, categories]);

  const formatAmount = (amount: number, type?: TransactionType) => {
    const isPrivacyOn = type === 'INCOME' ? incomePrivacy : type === 'EXPENSE' ? expensePrivacy : (incomePrivacy || expensePrivacy);
    if (isPrivacyOn) return '••••••';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-40">
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-indigo-400" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Scope</h4>
          </div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">
            {filter === 'month' ? 'Current Month' : filter === 'today' ? 'Today' : filter === 'range' ? 'Custom Range' : 'All Time'}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'month', label: 'This Month' },
            { id: 'today', label: 'Today' },
            { id: 'range', label: 'Range' },
            { id: 'all', label: 'All' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as DashboardFilter)}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                filter === f.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {filter === 'range' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-indigo-100 shadow-sm"
            >
              <div className="flex-1 relative">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2.5 text-[10px] font-bold w-full outline-none"
                />
              </div>
              <ChevronRight size={16} className="text-slate-300" />
              <div className="flex-1 relative">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2.5 text-[10px] font-bold w-full outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[40px] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden flex flex-col justify-center border border-white/20">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 blur-[80px] rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-sky-400/20 blur-[60px] rounded-full" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/10">
                <Wallet size={18} className="text-white" />
              </div>
              <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.3em]">Monthly Pulse</p>
            </div>
          </div>
          
          <h2 className="text-5xl font-black font-heading tracking-tighter text-white transition-all duration-500">
            {formatAmount(stats.balance)}
          </h2>

          <div className="mt-4 flex items-center gap-1.5 opacity-60">
            <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' : syncStatus === 'success' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white">
              {syncStatus === 'syncing' ? 'Vault Syncing...' : syncStatus === 'success' ? (
                <>Secured to Drive {lastSynced ? `• ${new Date(lastSynced).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}</>
              ) : 'Local Storage Only'}
            </p>
          </div>
          
          <div className="mt-10 grid grid-cols-3 gap-2">
            <div className="bg-white/10 border border-white/10 rounded-3xl p-3 backdrop-blur-lg group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-emerald-300 text-[8px] font-black uppercase tracking-widest">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" /> In
                </div>
                <button onClick={() => onTogglePrivacy('income')} className="text-emerald-300/60 hover:text-white transition-colors">
                  {incomePrivacy ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
              </div>
              <p className={`text-base font-black font-heading ${incomePrivacy ? 'blur-md opacity-30' : ''}`}>
                {formatAmount(stats.income, 'INCOME')}
              </p>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-3xl p-3 backdrop-blur-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-rose-300 text-[8px] font-black uppercase tracking-widest">
                  <div className="w-1 h-1 rounded-full bg-rose-400" /> Out
                </div>
                <button onClick={() => onTogglePrivacy('expense')} className="text-rose-300/60 hover:text-white transition-colors">
                  {expensePrivacy ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
              </div>
              <p className={`text-base font-black font-heading ${expensePrivacy ? 'blur-md opacity-30' : ''}`}>
                {formatAmount(stats.spent, 'EXPENSE')}
              </p>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-3xl p-3 backdrop-blur-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-amber-300 text-[8px] font-black uppercase tracking-widest">
                  <div className="w-1 h-1 rounded-full bg-amber-400" /> Credit
                </div>
              </div>
              <p className={`text-base font-black font-heading ${expensePrivacy ? 'blur-md opacity-30' : ''}`}>
                {formatAmount(stats.borrowed, 'EXPENSE')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {watchedTotals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Radar size={14} className="text-indigo-400" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Category Pulse</h4>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {watchedTotals.map(item => (
              <motion.button 
                whileTap={{ scale: 0.95 }}
                key={item.id} 
                onClick={() => onCategoryClick(item.id!)}
                className="bg-white rounded-[24px] p-4 border border-white shadow-sm shrink-0 min-w-[140px] relative overflow-hidden group text-left"
              >
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: item.color }}>
                   <IconRenderer name={item.icon || 'Star'} size={32} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="text-[9px] font-black text-slate-500 uppercase truncate">{item.name}</span>
                </div>
                <p className={`text-lg font-black font-heading text-slate-800 ${expensePrivacy ? 'blur-md' : ''}`}>
                   {formatAmount(item.total || 0, 'EXPENSE')}
                </p>
                <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500/20" style={{ width: '40%', backgroundColor: `${item.color}33` }} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-5 border border-white shadow-sm flex flex-col justify-between group hover:bg-white transition-all">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-amber-500" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
            </div>
            <h5 className="text-[13px] font-black font-heading text-slate-800">Avg. Daily</h5>
            <p className={`text-lg font-black font-heading text-indigo-600 mt-1 ${expensePrivacy ? 'blur-md' : ''}`}>
              {formatAmount(insights.dailyAvg, 'EXPENSE')}
            </p>
          </div>
        </div>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => insights.topCat && onCategoryClick(insights.topCat.id)}
          className="bg-white/80 backdrop-blur-xl rounded-[32px] p-5 border border-white shadow-sm flex flex-col justify-between group hover:bg-white transition-all text-left"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-violet-500" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hotspot</p>
            </div>
            <h5 className="text-[13px] font-black font-heading text-slate-800">Top Category</h5>
            <div className="flex items-center gap-2 mt-2">
              {insights.topCat ? (
                <>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: insights.topCat.color }}>
                    <IconRenderer name={insights.topCat.icon} size={12} />
                  </div>
                  <span className="text-xs font-black text-slate-600">{insights.topCat.name}</span>
                </>
              ) : (
                <span className="text-[10px] font-bold text-slate-300">No Data</span>
              )}
            </div>
          </div>
        </motion.button>
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-[36px] p-6 border border-white shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-xl">
              <Activity size={18} />
            </div>
            <h4 className="text-base font-black text-slate-800 font-heading">
              {filter === 'month' ? 'Monthly Pulse' : filter === 'today' ? "Today's Pulse" : filter === 'range' ? 'Range Pulse' : 'All Time Pulse'}
            </h4>
          </div>
          <button onClick={onViewToday} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all">View All</button>
        </div>

        <div className="space-y-3">
          {recentTxs.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Silence...</p>
            </div>
          ) : (
            recentTxs.map((tx, i) => {
              const cat = categories.find(c => c.id === tx.categoryId);
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={tx.id} 
                  className="flex items-center justify-between bg-white/40 p-3 rounded-[24px] border border-white/50 group hover:bg-white/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform" style={{ backgroundColor: cat?.color }}>
                      <IconRenderer name={cat?.icon || 'HelpCircle'} size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 font-heading truncate max-w-[120px]">{tx.note || cat?.name}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black font-heading ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'} ${tx.type === 'INCOME' ? (incomePrivacy ? 'blur-md' : '') : (expensePrivacy ? 'blur-md' : '')}`}>
                    {tx.type === 'INCOME' ? '+' : ''}{formatAmount(tx.amount, tx.type)}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
