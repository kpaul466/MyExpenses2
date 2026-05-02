import React, { useMemo, useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis } from 'recharts';
import { Transaction, AppCategory, TransactionType } from '../types';
import { BarChart3, TrendingUp, Wallet, ListChecks, Check, Download, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';

interface AnalyticsViewProps {
  expenses: Transaction[];
  categories: AppCategory[];
  incomePrivacy: boolean;
  expensePrivacy: boolean;
  currency: string;
  userName?: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ expenses, categories, incomePrivacy, expensePrivacy, currency, userName = "User" }) => {
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
      await new Promise(resolve => setTimeout(resolve, 1000));

      const reportEl = reportRef.current;
      const originalPosition = reportEl.style.position;
      const originalLeft = reportEl.style.left;
      const originalTop = reportEl.style.top;
      const originalZIndex = reportEl.style.zIndex;

      reportEl.style.position = 'fixed';
      reportEl.style.top = '0px';
      reportEl.style.left = '0px';
      reportEl.style.zIndex = '-9999';

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
        hotfixes: ['px_scaling']
      });

      const pages = reportEl.querySelectorAll('.pdf-page');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Prime the browser renderer for the page
        await htmlToImage.toJpeg(page, { quality: 0.1, width: 794, height: 1123, pixelRatio: 1 });
        
        const imgData = await htmlToImage.toJpeg(page, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          width: 794,
          height: 1123,
          style: { transform: 'none' }
        });

        if (i > 0) pdf.addPage();
        
        const imgProps = pdf.getImageProperties(imgData);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (imgProps.height * pageWidth) / imgProps.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      reportEl.style.position = originalPosition;
      reportEl.style.left = originalLeft;
      reportEl.style.top = originalTop;
      reportEl.style.zIndex = originalZIndex;

      pdf.save(`Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      alert('Unable to generate PDF: ' + (error?.message || error) + '. For best results, try opening the app in a new tab.');
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
      <style>{`
        .pdf-report-override { background-color: #ffffff !important; }
        .pdf-report-override .text-indigo-600 { color: #4f46e5 !important; }
        .pdf-report-override .text-slate-400 { color: #94a3b8 !important; }
        .pdf-report-override .text-emerald-600 { color: #059669 !important; }
        .pdf-report-override .text-emerald-700 { color: #047857 !important; }
        .pdf-report-override .text-rose-600 { color: #e11d48 !important; }
        .pdf-report-override .text-rose-700 { color: #be123c !important; }
        .pdf-report-override .text-blue-600 { color: #2563eb !important; }
        .pdf-report-override .text-blue-700 { color: #1d4ed8 !important; }
        .pdf-report-override .text-slate-700 { color: #334155 !important; }
        .pdf-report-override .text-slate-900 { color: #0f172a !important; }
        .pdf-report-override .text-slate-500 { color: #64748b !important; }
        .pdf-report-override .text-indigo-700 { color: #4338ca !important; }
        .pdf-report-override .text-white { color: #ffffff !important; }
        .pdf-report-override .bg-white { background-color: #ffffff !important; }
        .pdf-report-override .bg-slate-50 { background-color: #f8fafc !important; }
        .pdf-report-override .bg-emerald-50 { background-color: #ecfdf5 !important; }
        .pdf-report-override .bg-rose-50 { background-color: #fff1f2 !important; }
        .pdf-report-override .bg-blue-50 { background-color: #eff6ff !important; }
        .pdf-report-override .bg-indigo-50 { background-color: #eef2ff !important; }
        .pdf-report-override .bg-slate-900 { background-color: #0f172a !important; }
        .pdf-report-override .border-slate-100 { border-color: #f1f5f9 !important; }
        .pdf-report-override .border-emerald-100 { border-color: #d1fae5 !important; }
        .pdf-report-override .border-rose-100 { border-color: #ffe4e6 !important; }
        .pdf-report-override .border-blue-100 { border-color: #dbeafe !important; }
        .pdf-report-override .border-indigo-100 { border-color: #e0e7ff !important; }
        .pdf-report-override .border-slate-50 { border-color: #f8fafc !important; }
        .pdf-report-override .divide-slate-50 > :not([hidden]) ~ :not([hidden]) { border-color: #f8fafc !important; }
      `}</style>
      
      {/* Report Template for PDF Generation - Rendered off-screen with explicit layout */}
      <div 
        className="pdf-report-override"
        style={{ 
          position: 'absolute', 
          top: '0', 
          left: '-9999px', 
          width: '794px', 
          zIndex: -100
        }} 
        ref={reportRef}
      >
        {(() => {
          const itemsPerPage1 = 12;
          const itemsPerPageN = 30;
          const sortedExpenses = [...currentMonthExpenses].sort((a, b) => b.timestamp - a.timestamp);
          const firstPageItems = sortedExpenses.slice(0, itemsPerPage1);
          const remainingItems = sortedExpenses.slice(itemsPerPage1);
          
          const pages = [firstPageItems];
          for (let i = 0; i < remainingItems.length; i += itemsPerPageN) {
            pages.push(remainingItems.slice(i, i + itemsPerPageN));
          }

          return pages.map((pageItems, pageIndex) => (
            <div key={pageIndex} className="pdf-page bg-white" style={{ width: '794px', height: '1123px', padding: '40px', boxSizing: 'border-box' }}>
              
              {/* Header on every page */}
              <div className="flex items-center justify-between border-b pb-6 mb-6 border-slate-100">
                <div>
                  <h1 className="text-3xl font-black font-heading text-indigo-600">Monthly Expense Report</h1>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                    {userName} • {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Total</p>
                    <p className="text-xl font-black text-indigo-600 font-heading">{formatAmount(stats.expense, 'EXPENSE')}</p>
                  </div>
                </div>
              </div>

              {pageIndex === 0 && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
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

                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Wallet size={12} /> Allocation & Pie Chart
                      </h3>
                      <div className="h-[200px] w-full flex items-center justify-center">
                        <PieChart width={340} height={200}>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                            isAnimationActive={false}
                            label={({ cx, cy, midAngle, outerRadius, value, name }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = outerRadius * 1.3;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              return (
                                <text 
                                  x={x} 
                                  y={y} 
                                  fill="#475569" 
                                  textAnchor={x > cx ? 'start' : 'end'} 
                                  dominantBaseline="central" 
                                  fontSize="8" 
                                  fontWeight="bold"
                                >
                                  {`${name} (${formatAmount(value, 'EXPENSE')})`}
                                </text>
                              );
                            }}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={12} /> Trajectory Snapshot
                      </h3>
                      <div className="h-[180px] w-full border border-slate-100 rounded-3xl p-4 bg-slate-50/30 flex items-center justify-center">
                          <AreaChart width={300} height={140} data={trendData}>
                            <Area type="monotone" dataKey="expense" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} isAnimationActive={false} />
                            <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.1} isAnimationActive={false} />
                          </AreaChart>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {pageIndex === 0 ? "Recent Activity" : "Activity Continuation"}
                    </h3>
                    <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                      Page {pageIndex + 1} of {pages.length}
                    </div>
                </div>
                <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Note</th>
                        <th className="pb-3 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pageItems.map(tx => {
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
          ));
        })()}
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
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={10}
                dataKey="value"
                nameKey="name"
                stroke="none"
                label={({ cx, cy, midAngle, outerRadius, value, name }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius * 1.35;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      fill="#475569" 
                      textAnchor={x > cx ? 'start' : 'end'} 
                      dominantBaseline="central" 
                      fontSize="10" 
                      fontWeight="bold"
                    >
                      {`${name} (${formatAmount(value, 'EXPENSE')})`}
                    </text>
                  );
                }}
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
