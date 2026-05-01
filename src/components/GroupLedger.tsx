import React, { useMemo, useState } from 'react';
import { Transaction, Person, CreditType } from '../types';
import { User, CheckCircle2, ArrowUpRight, ArrowDownLeft, Plus, Trash2, X, UserPlus, Wallet, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GroupLedgerProps {
  transactions: Transaction[];
  people: Person[];
  onSettle: (id: string) => void;
  onAddPerson: (name: string) => void;
  onDeletePerson: (id: string) => void;
}

export const GroupLedger: React.FC<GroupLedgerProps> = ({ 
  transactions, 
  people, 
  onSettle, 
  onAddPerson, 
  onDeletePerson 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const ledgerData = useMemo(() => {
    return people.map(person => {
      const personAllTx = transactions.filter(t => t.personId === person.id);
      
      const cashTx = personAllTx.filter(t => t.paymentMode === 'CASH');
      const totalExpense = cashTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
      const totalIncome = cashTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      
      const creditTx = personAllTx.filter(t => t.paymentMode === 'CREDIT' && !t.isCleared);
      const lent = creditTx.filter(t => t.creditType === 'LENT').reduce((sum, t) => sum + t.amount, 0);
      const borrowed = creditTx.filter(t => t.creditType === 'BORROWED').reduce((sum, t) => sum + t.amount, 0);
      
      return { 
        ...person, 
        lent, 
        borrowed, 
        netCredit: lent - borrowed,
        totalExpense,
        totalIncome
      };
    });
  }, [transactions, people]);

  const activeCredits = transactions.filter(t => t.paymentMode === 'CREDIT' && !t.isCleared)
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddPerson(newName.trim());
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5">
          <div className="bg-emerald-500/10 text-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
            <ArrowUpRight size={18} />
          </div>
          <p className="text-emerald-900/60 text-[8px] font-bold uppercase tracking-[0.15em]">Lent / Receivables</p>
          <h3 className="text-xl font-black text-emerald-600 mt-1">
            ₹{ledgerData.reduce((s, p) => s + p.lent, 0).toLocaleString()}
          </h3>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5">
          <div className="bg-rose-500/10 text-rose-600 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
            <ArrowDownLeft size={18} />
          </div>
          <p className="text-rose-900/60 text-[8px] font-bold uppercase tracking-[0.15em]">Borrowed / Payable</p>
          <h3 className="text-xl font-black text-rose-600 mt-1">
            ₹{ledgerData.reduce((s, p) => s + p.borrowed, 0).toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-500" />
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Group Breakdowns</h2>
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-indigo-600 font-bold text-[10px] bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors uppercase tracking-wider"
          >
            <Plus size={14} /> Add Group
          </motion.button>
        </div>

        <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-4 border-2 border-indigo-100 shadow-xl shadow-indigo-100/20 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl">
                <UserPlus size={18} />
              </div>
              <input 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Group Name (e.g. Office, Family)..."
                className="flex-1 bg-slate-50 border-none rounded-xl p-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs">Save</motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsAdding(false)} className="text-slate-300"><X size={20} /></motion.button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-3">
          {ledgerData.map(person => (
            <div key={person.id} className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm flex flex-col gap-4 group hover:border-indigo-100 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 text-slate-400 p-3 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-[15px] font-heading">{person.name}</h4>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.15em]">Expense Group</span>
                  </div>
                </div>
                {person.id !== 'p1' && (
                   <button 
                    onClick={() => onDeletePerson(person.id)}
                    className="text-slate-200 hover:text-rose-500 transition-colors p-2"
                   >
                     <Trash2 size={16} />
                   </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-50">
                   <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Total Spent</p>
                   <p className="text-[13px] font-bold text-slate-700">₹{person.totalExpense.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-50">
                   <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Total Income</p>
                   <p className="text-[13px] font-bold text-emerald-600">₹{person.totalIncome.toLocaleString()}</p>
                </div>
              </div>

              {(person.lent > 0 || person.borrowed > 0) && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex gap-4 text-[10px] font-black uppercase">
                    <span className="text-emerald-500">Get ₹{person.lent}</span>
                    <span className="text-rose-500">Pay ₹{person.borrowed}</span>
                  </div>
                  <div className={`text-right ${person.netCredit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span className="text-[8px] font-bold uppercase block leading-none opacity-40 mb-1 tracking-wider">Net Credit</span>
                    <span className="text-[15px] font-bold tracking-tight font-heading">
                      {person.netCredit > 0 ? '+' : ''}₹{person.netCredit.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-indigo-500" />
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pending Settlements</h2>
        </div>
        {activeCredits.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-bold">No pending credits. ✨</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCredits.map(tx => (
              <div key={tx.id} className="bg-white rounded-2xl p-4 flex items-center justify-between border-l-4 border-indigo-500 shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 truncate max-w-[120px]">{tx.note || 'Unnamed'}</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tx.creditType === 'LENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {tx.creditType === 'LENT' ? 'GET' : 'PAY'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    {people.find(p => p.id === tx.personId)?.name || 'General'} • {new Date(tx.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900 tracking-tight">₹{tx.amount.toLocaleString()}</span>
                  <button 
                    onClick={() => onSettle(tx.id)}
                    className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
                    title="Mark as Settled"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
