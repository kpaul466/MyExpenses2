import React, { useMemo } from 'react';
import { Transaction, AppCategory, TransactionType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';
import { IconRenderer } from './IconRenderer';

interface CategoryDetailModalProps {
  category: AppCategory;
  transactions: Transaction[];
  currency: string;
  expensePrivacy: boolean;
  incomePrivacy: boolean;
  onClose: () => void;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  category,
  transactions,
  currency,
  expensePrivacy,
  incomePrivacy,
  onClose
}) => {
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions.filter(tx => {
      const d = new Date(tx.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.categoryId === category.id;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, category.id]);

  const stats = useMemo(() => {
    const income = currentMonthTransactions.filter(tx => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0);
    const expense = currentMonthTransactions.filter(tx => tx.type === 'EXPENSE').reduce((s, tx) => s + tx.amount, 0);
    return { income, expense, net: income - expense };
  }, [currentMonthTransactions]);

  const formatAmount = (amount: number, type?: TransactionType) => {
    const isPrivacyOn = type === 'INCOME' ? incomePrivacy : type === 'EXPENSE' ? expensePrivacy : (incomePrivacy || expensePrivacy);
    if (isPrivacyOn) return '••••';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overscroll-none"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] p-6 pb-10 overflow-y-auto max-h-[85dvh] relative no-scrollbar border border-white"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: category.color }}
            >
              <IconRenderer name={category.icon} size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 font-heading">{category.name}</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monthly Pulse</p>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={onClose} 
            className="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-50/80 rounded-3xl p-4 border border-slate-100/50">
            <div className="flex items-center gap-1.5 text-emerald-500 text-[8px] font-black uppercase tracking-widest mb-1">
              <ArrowUpRight size={10} /> Inflow
            </div>
            <p className={`text-lg font-black font-heading text-slate-800 ${incomePrivacy ? 'blur-md opacity-30' : ''}`}>
              {formatAmount(stats.income, 'INCOME')}
            </p>
          </div>
          <div className="bg-slate-50/80 rounded-3xl p-4 border border-slate-100/50">
            <div className="flex items-center gap-1.5 text-rose-500 text-[8px] font-black uppercase tracking-widest mb-1">
              <ArrowDownLeft size={10} /> Outflow
            </div>
            <p className={`text-lg font-black font-heading text-slate-800 ${expensePrivacy ? 'blur-md opacity-30' : ''}`}>
              {formatAmount(stats.expense, 'EXPENSE')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calendar size={14} className="text-indigo-400" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction History</h4>
          </div>
          
          {currentMonthTransactions.length === 0 ? (
            <div className="bg-white/50 backdrop-blur-sm rounded-[32px] p-12 text-center border border-white">
              <History size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[9px]">No records this month</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentMonthTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between bg-white/40 p-3 rounded-[24px] border border-white/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <IconRenderer name={category.icon} size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 font-heading truncate max-w-[120px]">{tx.note || category.name}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className={`text-[13px] font-black font-heading ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'} ${tx.type === 'INCOME' ? (incomePrivacy ? 'blur-md' : '') : (expensePrivacy ? 'blur-md' : '')}`}>
                    {tx.type === 'INCOME' ? '+' : ''}{formatAmount(tx.amount, tx.type)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
