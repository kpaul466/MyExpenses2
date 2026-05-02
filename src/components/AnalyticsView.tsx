import React, { useMemo, useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis } from 'recharts';
import { Transaction, AppCategory, TransactionType } from '../types';
import { BarChart3, TrendingUp, Wallet, ListChecks, Check, Download, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface AnalyticsViewProps {
  expenses: Transaction[];
  categories: AppCategory[];
  incomePrivacy: boolean;
  expensePrivacy: boolean;
  currency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ expenses, categories, incomePrivacy, expensePrivacy, currency }) => {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const realizedExpenses = useMemo(() => 
    expenses, 
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

  const stats = useMemo(() => {
    return currentMonthExpenses.reduce((acc, curr) => {
      if (curr.type === 'INCOME') acc.income += curr.amount;
      else acc.expense += curr.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [currentMonthExpenses]);

  const categoryData = useMemo(() => {
    const groups = currentMonthExpenses.filter(e => e.type === 'EXPENSE').reduce((acc, curr) => {
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

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);

    try {
      // Allow more time for initial chart rendering in the off-screen div
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        scrollY: -window.scrollY // Fixes issues when scrolled down
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
        hotfixes: ['px_scaling']
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      pdf.save(`Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      alert('Unable to generate PDF. For best results, try opening the app in a new tab or use a desktop browser.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-40">
      {/* Report Template for PDF Generation - Rendered off-screen with explicit layout */}
      <div 
        data-report-container="monthly-expense"
        style={{ 
          position: 'absolute', 
          top: '-9999px', 
          left: '0', 
          width: '794px', 
          backgroundColor: 'white',
          visibility: 'visible'
        }} 
        ref={reportRef}
      >
        <div className="p-10 space-y-8 bg-white">
          <div className="flex items-center justify-between border-b pb-8 border-slate-100">
            <div>
              <h1 className="text-3xl font-black font-heading text-indigo-600">Monthly Expense Report</h1>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                Generated: {new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Total</p>
                 <p className="text-xl font-black text-indigo-600 font-heading">{formatAmount(stats.expense, 'EXPENSE')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
               <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Income</p>
               <p className="text-lg font-black font-heading text-emerald-700">{formatAmount(stats.income, 'INCOME')}</p>
            </div>
            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100">
               <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Expenses</p>
               <p className="text-lg font-black font-heading text-rose-700">{formatAmount(stats.expense, 'EXPENSE')}</p>
            </div>
            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100">
               <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">Net Balance</p>
               <p className="text-lg font-black font-heading text-blue-700">{formatAmount(stats.income - stats.expense)}</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-8">
            <div className="col-span-2 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Wallet size={12} /> Category Allocation
              </h3>
              <div className="space-y-2">
                {categoryData.slice(0, 8).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[10px] font-bold text-slate-700">{cat.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-900">{formatAmount(cat.value, 'EXPENSE')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-3 space-y-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={12} /> Trajectory Snapshot
              </h3>
               <div className="h-[180px] w-full border border-slate-100 rounded-3xl p-4 bg-slate-50/30 flex items-center justify-center">
                  {/* Remove ResponsiveContainer for PDF generation stability */}
                  <AreaChart width={400} height={160} data={trendData}>
                    <Area type="monotone" dataKey="expense" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  </AreaChart>
               </div>
               <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                 <p className="text-[9px] font-bold text-indigo-700 leading-relaxed uppercase tracking-tight">
                    Primary expense segment: <strong>{categoryData[0]?.name || 'N/A'}</strong>. 
                    Savings Ratio: {Math.max(0, Math.round(((stats.income - stats.expense) / Math.max(1, stats.income)) * 100)) || 0}%
                 </p>
               </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h3>
                <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                  {currentMonthExpenses.length} Records
                </div>
             </div>
             <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Note</th>
                    <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentMonthExpenses.sort((a,b) => b.timestamp - a.timestamp).slice(0, 15).map(tx => {
                    const cat = categories.find(c => c.id === tx.categoryId);
                    return (
                      <tr key={tx.id}>
                        <td className="py-3 text-[9px] font-medium text-slate-500">{new Date(tx.timestamp).toLocaleDateString()}</td>
                        <td className="py-3 text-[9px] font-black text-slate-900 uppercase tracking-tight">{cat?.name}</td>
                        <td className="py-3 text-[9px] text-slate-400 italic truncate max-w-[150px]">{tx.note || '-'}</td>
                        <td className={`py-3 text-[9px] font-black text-right ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}{formatAmount(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </div>
      </div>

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
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExportPDF}
          disabled={isGenerating}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black font-heading uppercase tracking-widest transition-all ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 active:bg-slate-800'}`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Export PDF</span>
            </>
          )}
        </motion.button>
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
