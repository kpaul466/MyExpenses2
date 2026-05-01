import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Wallet, Calendar, LayoutGrid, ChevronDown, Landmark, Plus, Save, Trash2, Sparkles, Loader2, Users } from 'lucide-react';
import { AppCategory, Transaction, PaymentMode, CreditType, TransactionType, Person } from '../types';
import { localDB } from '../db';
import { IconRenderer, AVAILABLE_ICONS } from './IconRenderer';
import { getSmartCategorization } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface AddExpenseSheetProps {
  categories: AppCategory[];
  people: Person[];
  initialTransaction?: Transaction | null;
  onSave: (tx: Transaction) => void;
  onCancel: () => void;
  onRefreshCategories: () => void;
}

export const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({ 
  categories, 
  people,
  initialTransaction, 
  onSave, 
  onCancel,
  onRefreshCategories
}) => {
  const [amount, setAmount] = useState(initialTransaction?.amount.toString() || '');
  const [note, setNote] = useState(initialTransaction?.note || '');
  const [type, setType] = useState<TransactionType>(initialTransaction?.type || 'EXPENSE');
  const [selectedCatId, setSelectedCatId] = useState(initialTransaction?.categoryId || (categories.find(c => c.id === 'cat_gen')?.id || categories[0]?.id));
  const [selectedPersonId, setSelectedPersonId] = useState(initialTransaction?.personId || 'p1');
  const [mode, setMode] = useState<PaymentMode>(initialTransaction?.paymentMode || 'CASH');
  const [editingCategory, setEditingCategory] = useState<AppCategory | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [date, setDate] = useState(
    initialTransaction 
      ? new Date(initialTransaction.timestamp).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );

  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (note.length > 3 && !initialTransaction) {
        setIsClassifying(true);
        try {
          const suggested = await getSmartCategorization(note);
          const match = categories.find(c => c.name.toLowerCase() === suggested.toLowerCase());
          if (match) setSelectedCatId(match.id);
        } catch (e) {
          console.error("AI Category failed", e);
        } finally {
          setIsClassifying(false);
        }
      }
    }, 1200);
    return () => clearTimeout(delayDebounceFn);
  }, [note, categories, initialTransaction]);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount))) return;
    const inferredCreditType: CreditType = type === 'EXPENSE' ? 'BORROWED' : 'LENT';

    onSave({
      id: initialTransaction?.id || crypto.randomUUID(),
      amount: Number(amount),
      categoryId: selectedCatId || 'cat_gen',
      personId: selectedPersonId || 'p1',
      note,
      timestamp: new Date(date).getTime(),
      type,
      paymentMode: mode,
      creditType: mode === 'CREDIT' ? inferredCreditType : undefined,
      isCleared: initialTransaction?.isCleared || false,
      groupId: initialTransaction?.groupId
    });
  };

  const startLongPress = (cat: AppCategory) => {
    longPressTimer.current = window.setTimeout(() => {
      if ('vibrate' in navigator) navigator.vibrate(40);
      setEditingCategory(cat);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      localDB.saveCategory(editingCategory);
      onRefreshCategories();
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (id === 'cat_gen') {
      alert("The 'General' category cannot be deleted.");
      return;
    }
    if (confirm('Delete this category?')) {
      localDB.deleteCategory(id);
      onRefreshCategories();
      setEditingCategory(null);
      if (selectedCatId === id) setSelectedCatId('cat_gen');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overscroll-none"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] p-6 pb-10 overflow-y-auto max-h-[85dvh] relative no-scrollbar border border-white"
      >
        <div className="flex justify-between items-center mb-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel} className="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </motion.button>
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setType('EXPENSE')}
              className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
            >
              Expense
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setType('INCOME')}
              className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              Income
            </motion.button>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleSave}
            disabled={!amount}
            className="bg-slate-900 text-white p-2.5 rounded-2xl shadow-lg disabled:opacity-30 transition-all"
          >
            <Check size={22} />
          </motion.button>
        </div>

        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xl font-bold text-slate-300">₹</span>
              <input 
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`text-5xl font-bold bg-transparent border-none outline-none w-48 text-center focus:ring-0 transition-all ${type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-100/50">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-bold text-slate-700 outline-none w-full uppercase tracking-tighter"
              />
            </div>
            <div className="flex bg-slate-50/80 p-1 rounded-2xl border border-slate-100/50">
              <button 
                onClick={() => setMode('CASH')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-bold uppercase transition-all ${mode === 'CASH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                <Wallet size={14} /> Cash
              </button>
              <button 
                onClick={() => setMode('CREDIT')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-bold uppercase transition-all ${mode === 'CREDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                <Landmark size={14} /> Credit
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <select 
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-100/50 rounded-2xl p-4 text-[9px] font-bold text-slate-600 outline-none appearance-none cursor-pointer uppercase tracking-widest focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} />
              </div>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                <Users size={16} />
              </div>
            </div>

            <div className="relative">
              <input 
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notes..."
                className="w-full bg-slate-50/80 border border-slate-100/50 rounded-2xl p-4 text-[11px] font-semibold text-slate-700 outline-none pr-12 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isClassifying ? (
                  <Loader2 size={16} className="text-indigo-400 animate-spin" />
                ) : (
                  <Sparkles size={16} className="text-indigo-300" />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Category (Long press to edit)</label>
              <div className="max-h-[160px] overflow-y-auto pr-1 no-scrollbar pt-1">
                <div className="grid grid-cols-4 gap-2 pb-2">
                  {categories.map((cat) => (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      key={cat.id}
                      type="button"
                      onPointerDown={() => startLongPress(cat)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border ${
                        selectedCatId === cat.id ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.05]' : 'border-slate-50 bg-slate-50/80 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <IconRenderer name={cat.icon} size={18} />
                      <span className="text-[7.5px] font-bold truncate w-full uppercase tracking-tighter leading-none text-center">{cat.name}</span>
                    </motion.button>
                  ))}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setEditingCategory({ id: `cat_${Date.now()}`, name: '', icon: 'Plus', color: '#6366f1' })}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 text-indigo-500 hover:bg-indigo-50 transition-all"
                  >
                    <Plus size={18} strokeWidth={3} />
                    <span className="text-[7.5px] font-bold uppercase tracking-tighter leading-none">New</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
      {editingCategory && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-xs bg-white rounded-[40px] p-8 shadow-2xl border border-white/50 max-h-[85dvh] overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-slate-800 font-heading tracking-tight uppercase">Category</h3>
              <button onClick={() => setEditingCategory(null)} className="p-2.5 bg-slate-50 rounded-full text-slate-400"><X size={20}/></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.25em] block mb-2 px-1">Label</label>
                <input 
                  type="text" 
                  value={editingCategory.name} 
                  onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[13px] font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 transition-all uppercase" 
                  autoFocus 
                  placeholder="E.g. FUEL"
                />
              </div>

              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.25em] block mb-3 px-1">Icon Selection</label>
                <div className="h-[200px] overflow-y-auto no-scrollbar border border-slate-50 rounded-2xl p-2 bg-slate-50/30 grid grid-cols-4 gap-3">
                  {AVAILABLE_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      onClick={() => setEditingCategory({...editingCategory, icon: iconName})}
                      className={`p-3 rounded-2xl flex items-center justify-center transition-all ${editingCategory.icon === iconName ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100 shadow-sm'}`}
                    >
                      <IconRenderer name={iconName} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleSaveCategory}
                  className="flex-1 bg-indigo-600 text-white py-5 rounded-[24px] font-bold flex items-center justify-center gap-2 shadow-2xl shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest text-[9px]"
                >
                  <Save size={18} /> Save
                </button>
                {editingCategory.id && editingCategory.id !== 'cat_gen' && (
                  <button 
                    onClick={() => handleDeleteCategory(editingCategory.id)}
                    className="p-5 bg-rose-50 text-rose-500 rounded-[24px] hover:bg-rose-100 transition-all active:scale-95 shadow-lg shadow-rose-100/20"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};
