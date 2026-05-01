import React, { useState } from 'react';
import { ShoppingItem, AppCategory, Transaction, TransactionGroup } from '../types';
import { localDB } from '../db';
import { IconRenderer } from './IconRenderer';
import { 
  Trash2, 
  Circle, 
  Plus, 
  ArrowRight,
  X,
  Edit2,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlannerViewProps {
  categories: AppCategory[];
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
  privacyMode: boolean;
}

export const PlannerView: React.FC<PlannerViewProps> = ({ categories, transactions, onAddTransaction, privacyMode }) => {
  const [groups, setGroups] = useState<TransactionGroup[]>(localDB.getPlannerGroups());
  const [items, setItems] = useState<ShoppingItem[]>(localDB.getPlannerItems());
  const [showConfirm, setShowConfirm] = useState<ShoppingItem | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<TransactionGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<TransactionGroup | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(groups[0]?.id || null);
  const [actualPrice, setActualPrice] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const refreshState = () => {
    const updatedGroups = localDB.getPlannerGroups();
    setGroups(updatedGroups);
    setItems(localDB.getPlannerItems());
    return updatedGroups;
  };

  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      localDB.savePlannerItem(editingItem);
      refreshState();
      setEditingItem(null);
    }
  };

  const handleSaveGroupEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      localDB.savePlannerGroup(editingGroup);
      const updated = refreshState();
      if (!expandedGroupId) setExpandedGroupId(editingGroup.id);
      setEditingGroup(null);
    }
  };

  const handleDeleteItem = (id: string) => {
    localDB.deletePlannerItem(id);
    refreshState();
  };

  const handleDeleteGroup = (id: string) => {
    localDB.deletePlannerGroup(id);
    const updated = refreshState();
    
    if (expandedGroupId === id) {
      setExpandedGroupId(updated.length > 0 ? updated[0].id : null);
    }
    setGroupToDelete(null);
  };

  const startCheckout = (item: ShoppingItem) => {
    setShowConfirm(item);
    setActualPrice(item.estimatedAmount.toString());
    setSelectedCategoryId(item.categoryId);
  };

  const confirmBought = () => {
    if (!showConfirm || isNaN(Number(actualPrice))) return;
    const tx: Transaction = {
      id: crypto.randomUUID(),
      amount: Number(actualPrice),
      categoryId: selectedCategoryId,
      groupId: showConfirm.groupId,
      timestamp: Date.now(),
      note: `Planned: ${showConfirm.name}`,
      type: 'EXPENSE',
      paymentMode: 'CASH'
    };
    onAddTransaction(tx);
    localDB.deletePlannerItem(showConfirm.id);
    refreshState();
    setShowConfirm(null);
  };

  const formatCurrency = (amount: number) => {
    if (privacyMode) return '₹ ••••';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 pb-40 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2.5 rounded-2xl shadow-lg">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 font-heading">Budget Planner</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{groups.length} groups active</p>
          </div>
        </div>
        <button 
          onClick={() => setEditingGroup({ id: crypto.randomUUID(), name: '', budget: 0, createdAt: Date.now() })}
          className="bg-white text-slate-900 p-2.5 rounded-2xl border border-white shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-indigo-100 rounded-[40px] p-12 text-center space-y-4">
             <div className="bg-indigo-50 w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto text-indigo-400">
               <FolderOpen size={32} />
             </div>
             <div>
               <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">No Active Collections</p>
               <p className="text-slate-300 text-[11px] mt-1 font-bold">Start by adding a new planning group.</p>
             </div>
             <button 
               onClick={() => setEditingGroup({ id: crypto.randomUUID(), name: '', budget: 0, createdAt: Date.now() })}
               className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100"
             >
               Create Collection
             </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
          {groups.map(group => {
            const isExpanded = expandedGroupId === group.id;
            const groupItems = items.filter(i => i.groupId === group.id && !i.isBought);
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={group.id} 
                className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-[32px] border border-white shadow-sm overflow-hidden transition-all duration-500"
              >
                <div 
                  className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-600/5' : ''}`}
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${isExpanded ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg scale-110' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}>
                      <FolderOpen size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-800 text-sm font-heading truncate uppercase tracking-tighter">{group.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500/60 bg-indigo-50/50 px-2 py-0.5 rounded-md">Limit: {formatCurrency(group.budget)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={18} className="text-indigo-400" /> : <ChevronRight size={18} className="text-slate-300" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 pt-4 space-y-4 border-t border-white/40 animate-in slide-in-from-top duration-300">
                     <div className="space-y-3">
                       {groupItems.length === 0 ? (
                         <div className="text-center py-8">
                           <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">Queue is empty</p>
                         </div>
                       ) : (
                         groupItems.map(item => {
                           const cat = categories.find(c => c.id === item.categoryId);
                           return (
                              <div 
                                key={item.id} 
                                className="bg-gradient-to-br from-white via-indigo-50/50 to-purple-50/50 rounded-2xl p-4 flex items-center justify-between border border-white shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
                              >
                                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: cat?.color || '#cbd5e1' }} />
                                
                                <div className="flex items-center gap-4 min-w-0 flex-1 pl-2">
                                  <button onClick={() => startCheckout(item)} className="text-indigo-600/20 hover:text-indigo-600 shrink-0 transition-colors">
                                    <Circle size={24} strokeWidth={2.5} />
                                  </button>
                                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditingItem(item)}>
                                    <h4 className="font-black text-slate-800 text-[14px] font-heading truncate group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-black text-slate-900 tracking-tight font-heading">
                                        {formatCurrency(item.estimatedAmount)}
                                      </span>
                                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        {cat?.name}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 pl-3 ml-2 border-l border-white/60">
                                  <button 
                                    onClick={() => setEditingItem(item)} 
                                    className="p-2.5 text-indigo-500 hover:text-indigo-700 bg-white/80 rounded-xl shadow-sm border border-indigo-50 transition-all hover:scale-110 active:scale-95"
                                  >
                                    <Edit2 size={14}/>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteItem(item.id)} 
                                    className="p-2.5 text-rose-300 hover:text-rose-500 bg-white/80 rounded-xl shadow-sm border border-rose-50 transition-all hover:scale-110 active:scale-95"
                                  >
                                    <Trash2 size={14}/>
                                  </button>
                                </div>
                              </div>
                           )
                         })
                       )}
                     </div>
                     <button 
                      onClick={() => setEditingItem({ 
                        id: crypto.randomUUID(), name: '', estimatedAmount: 0, categoryId: categories[0]?.id || 'cat_1', 
                        groupId: group.id, isBought: false, createdAt: Date.now() 
                      })}
                      className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-2xl text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] hover:bg-indigo-50/80 transition-all bg-white/40 group/btn shadow-sm"
                     >
                       <span className="group-hover/btn:scale-110 transition-transform inline-block">+ Add Plan Item</span>
                     </button>
                     <div className="pt-4 flex items-center justify-between border-t border-white/40">
                        <button onClick={() => setEditingGroup(group)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Preferences</button>
                        <button onClick={() => setGroupToDelete(group)} className="text-[9px] font-black text-rose-300 uppercase tracking-widest hover:text-rose-500 transition-colors">Dissolve Group</button>
                     </div>
                  </div>
                )}
              </motion.div>
            )
          })}
          </AnimatePresence>
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 border border-white/50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800 font-heading tracking-tight">Plan Details</h3>
              <button onClick={() => setEditingItem(null)} className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveItemEdit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Description</label>
                <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Estimated Cost</label>
                <input type="number" value={editingItem.estimatedAmount || ''} onChange={e => setEditingItem({...editingItem, estimatedAmount: Number(e.target.value)})} className="w-full bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" required />
              </div>
              <button type="submit" className="w-full bg-gradient-to-br from-indigo-600 to-violet-700 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-200 active:scale-95 transition-all mt-4">Confirm Plan</button>
            </form>
          </div>
        </div>
      )}

      {editingGroup && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 border border-white/50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800 font-heading tracking-tight">Collection Settings</h3>
              <button onClick={() => setEditingGroup(null)} className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveGroupEdit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Collection Name</label>
                <input value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Monthly Limit</label>
                <input type="number" value={editingGroup.budget || ''} onChange={e => setEditingGroup({...editingGroup, budget: Number(e.target.value)})} className="w-full bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" required />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-95 transition-all mt-4">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {groupToDelete && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-300 text-center space-y-6">
            <div className="bg-rose-50 w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto text-rose-500">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 font-heading">Dissolve Collection?</h3>
              <p className="text-slate-500 text-[11px] font-bold leading-relaxed px-4">
                This will permanently delete "<span className="text-slate-800 font-black">{groupToDelete.name}</span>" and all items within it.
              </p>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => handleDeleteGroup(groupToDelete.id)}
                className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all"
              >
                Delete Forever
              </button>
              <button 
                onClick={() => setGroupToDelete(null)}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 font-heading">Plan Realized</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">Finalize your transaction</p>
              </div>
              <button onClick={() => setShowConfirm(null)} className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={18}/></button>
            </div>
            <div className="space-y-8">
              <div className="text-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-8 rounded-[40px] border border-indigo-100/50 shadow-inner">
                <label className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-3">Actual Outflow</label>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-3xl font-black text-indigo-300">₹</span>
                  <input 
                    type="number" 
                    value={actualPrice} 
                    onChange={e => setActualPrice(e.target.value)} 
                    className="bg-transparent text-5xl font-black text-slate-900 outline-none w-48 text-center tracking-tighter" 
                    autoFocus 
                  />
                </div>
              </div>
              <button 
                onClick={confirmBought} 
                className="w-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white py-6 rounded-[32px] font-black flex items-center justify-center gap-4 shadow-xl shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest text-[11px]"
              >
                Sync with Ledger <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
