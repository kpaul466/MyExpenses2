import React, { useState } from 'react';
import { AppCategory } from '../types';
import { IconRenderer, AVAILABLE_ICONS } from './IconRenderer';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryManagerProps {
  categories: AppCategory[];
  onSave: (cat: AppCategory) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onSave, onDelete, onClose }) => {
  const [editing, setEditing] = useState<Partial<AppCategory> | null>(null);

  const handleStartEdit = (cat?: AppCategory) => {
    setEditing(cat || { id: `cat_${Date.now()}`, name: '', icon: 'Coffee', color: '#6366f1' });
  };

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 font-heading">Manage Categories</h2>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => handleStartEdit()}
          className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100 transition-transform"
        >
          <Plus size={20} />
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
        {categories.map((cat, index) => (
          <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
            key={cat.id} 
            className="bg-white/60 backdrop-blur-md border border-white rounded-2xl p-4 flex items-center justify-between group hover:bg-white/90 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl text-white shadow-md transition-transform group-hover:scale-110" style={{ backgroundColor: cat.color }}>
                <IconRenderer name={cat.icon} size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-[13px] font-heading">{cat.name}</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{cat.icon}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleStartEdit(cat)} className="text-[9px] font-bold uppercase text-indigo-500 hover:text-indigo-700 px-2 py-1 bg-indigo-50 rounded-lg">Edit</motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => onDelete(cat.id)} className="text-slate-300 hover:text-rose-600 p-2 transition-colors"><Trash2 size={18} /></motion.button>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
      {editing && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 font-heading">{editing.name ? 'Refine' : 'New'} Category</h3>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditing(null)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20} /></motion.button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Label</label>
                <input type="text" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[13px]" autoFocus />
              </div>

              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-3 px-1">Glyph Icon</label>
                <div className="h-[180px] overflow-y-auto no-scrollbar border border-slate-50 rounded-2xl p-2 bg-slate-50/30">
                  <div className="grid grid-cols-5 gap-3">
                    {AVAILABLE_ICONS.map(iconName => (
                      <button
                        key={iconName}
                        onClick={() => setEditing({...editing, icon: iconName})}
                        className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${editing.icon === iconName ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100 shadow-sm'}`}
                      >
                        <IconRenderer name={iconName} size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { onSave(editing as AppCategory); setEditing(null); }}
                className="w-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white py-5 rounded-[24px] font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 transition-all uppercase tracking-widest text-[10px]"
              >
                <Save size={18} /> Update Collection
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
