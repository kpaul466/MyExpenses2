import React, { useState, useMemo } from 'react';
import { Transaction, AppCategory, Person, TransactionType } from '../types';
import { Trash2, Edit3, Filter, ChevronRight, History, ArrowUpRight, ArrowDownLeft, Calculator, Users, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IconRenderer } from './IconRenderer';

interface HistoryViewProps {
  expenses: Transaction[];
  categories: AppCategory[];
  people: Person[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  incomePrivacy: boolean;
  expensePrivacy: boolean;
  currency: string;
}

type FilterType = 'all' | 'today' | 'month' | 'range';

export const HistoryView: React.FC<HistoryViewProps> = ({ expenses, categories, people, onDelete, onEdit, incomePrivacy, expensePrivacy, currency }) => {
  const [filter, setFilter] = useState<FilterType>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const formatAmount = (amount: number, type?: TransactionType) => {
    const isPrivacyOn = type === 'INCOME' ? incomePrivacy : type === 'EXPENSE' ? expensePrivacy : (incomePrivacy || expensePrivacy);
    if (isPrivacyOn) return '••••';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(tx => {
      if (selectedGroupId !== 'all' && tx.personId !== selectedGroupId) {
        return false;
      }

      const txDate = new Date(tx.timestamp);
      if (filter === 'today') {
        if (txDate.toDateString() !== now.toDateString()) return false;
      } else if (filter === 'range' && startDate && endDate) {
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999);
        if (tx.timestamp < start || tx.timestamp > end) return false;
      } else {
        if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
      }
      
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [expenses, filter, startDate, endDate, selectedGroupId]);

  const summary = useMemo(() => {
    const cashOnly = filteredExpenses.filter(tx => tx.paymentMode === 'CASH');
    const income = cashOnly.filter(tx => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0);
    const expense = cashOnly.filter(tx => tx.type === 'EXPENSE').reduce((s, tx) => s + tx.amount, 0);
    return { income, expense, net: income - expense };
  }, [filteredExpenses]);

  const FilterChip = ({ type, label }: { type: FilterType, label: string }) => (
    <button
      onClick={() => setFilter(type)}
      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${
        filter === type 
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
          : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6 pb-40 animate-in fade-in duration-700">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-800 font-heading tracking-tight">Feed</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{filteredExpenses.length} Records found</p>
          </div>
          
          <div className="flex-1 max-w-[160px] relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <Layers size={14} />
            </div>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-white border border-slate-100 shadow-sm rounded-2xl pl-9 pr-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <option value="all">All Groups</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
              <ChevronRight size={14} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <FilterChip type="all" label="Overview" />
          <FilterChip type="today" label="Today" />
          <FilterChip type="month" label="This Month" />
          <FilterChip type="range" label="Pick Range" />
        </div>

        {filter === 'range' && (
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-indigo-100 animate-in slide-in-from-top duration-300 shadow-sm">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold w-full outline-none"
            />
            <ChevronRight size={16} className="text-slate-300" />
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold w-full outline-none"
            />
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white shadow-xl shadow-indigo-100/30 grid grid-cols-2 gap-4">
          <div className="col-span-2 flex items-center gap-3 mb-2">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
              <Calculator size={16} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Summary</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-500 text-[8px] font-black uppercase tracking-widest">
              <ArrowUpRight size={10} /> Total In
            </div>
            <p className={`text-xl font-black font-heading text-slate-800 ${incomePrivacy ? 'blur-md opacity-30' : ''}`}>
              {formatAmount(summary.income, 'INCOME')}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-rose-500 text-[8px] font-black uppercase tracking-widest">
              <ArrowDownLeft size={10} /> Total Out
            </div>
            <p className={`text-xl font-black font-heading text-slate-800 ${expensePrivacy ? 'blur-md opacity-30' : ''}`}>
              {formatAmount(summary.expense, 'EXPENSE')}
            </p>
          </div>
          <div className="col-span-2 pt-4 border-t border-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Cashflow</span>
              <span className={`text-lg font-black font-heading ${summary.net >= 0 ? 'text-indigo-600' : 'text-rose-600'} ${(summary.net >= 0 ? incomePrivacy : expensePrivacy) ? 'blur-md opacity-30' : ''}`}>
                {summary.net >= 0 ? '+' : ''}{formatAmount(summary.net, summary.net >= 0 ? 'INCOME' : 'EXPENSE')}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {filteredExpenses.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-sm rounded-[32px] p-16 text-center border border-white">
          <History size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">No matches found</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredExpenses.map((tx) => {
              const cat = categories.find(c => c.id === tx.categoryId);
              const person = people.find(p => p.id === tx.personId);
              const isIncome = tx.type === 'INCOME';
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  transition={{ duration: 0.2 }}
                  key={tx.id}
                  className="bg-white/70 backdrop-blur-md rounded-3xl p-4 flex items-center justify-between border border-white shadow-sm hover:border-indigo-100 hover:shadow-lg transition-all"
                >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div 
                    className="p-3.5 rounded-2xl text-white shadow-lg shrink-0"
                    style={{ backgroundColor: cat?.color || '#94a3b8' }}
                  >
                    <IconRenderer name={cat?.icon || 'HelpCircle'} size={20} />
                  </div>
                  <div className="truncate">
                    <h4 className="font-black text-slate-800 text-sm truncate font-heading">{tx.note || cat?.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                        {new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {cat?.name}
                      </p>
                      {person && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100">
                          <Users size={8} />
                          <span className="text-[7px] font-black uppercase tracking-tighter">{person.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className={`font-black text-lg font-heading tracking-tight block ${isIncome ? 'text-emerald-600' : 'text-slate-900'} ${isIncome ? (incomePrivacy ? 'blur-md opacity-30' : '') : (expensePrivacy ? 'blur-md opacity-30' : '')}`}>
                      {isIncome ? '+' : '-'}{formatAmount(tx.amount, tx.type)}
                    </span>
                  </div>
                  <div className="flex gap-1.5 border-l border-slate-50 pl-3">
                    <button onClick={() => onEdit(tx)} className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => onDelete(tx.id)} className="text-slate-300 hover:text-rose-500 p-2 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
