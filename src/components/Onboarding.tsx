import React, { useState } from 'react';
import { 
  Sparkles, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  MousePointer2, 
  BarChart3, 
  LayoutGrid,
  Zap,
  PlusCircle,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingProps {
  onFinish: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Welcome to My Expenses",
      description: "A high-performance Android-style vault for your finances. Fast, fluid, and focused on privacy.",
      icon: <Zap size={64} className="text-amber-500" />,
      color: "from-amber-50 to-orange-50",
      accent: "bg-amber-500"
    },
    {
      title: "Quick Start: Add",
      description: "Tap the floating '+' button to record an expense. Type a note like 'Pizza' and Gemini AI will auto-categorize it for you!",
      icon: <PlusCircle size={64} className="text-indigo-600" />,
      color: "from-indigo-50 to-blue-50",
      accent: "bg-indigo-600"
    },
    {
      title: "Ledgers & Groups",
      description: "Organize by context. Create Groups (Work, Home, Trip) to track specific project spending separately from your daily pulse.",
      icon: <Users size={64} className="text-indigo-500" />,
      color: "from-indigo-50/50 to-violet-50/50",
      accent: "bg-indigo-500"
    },
    {
      title: "Settling Credits",
      description: "Mark transactions as 'Credit' when lending or borrowing. Go to the Ledger tab to settle them with one tap when paid back.",
      icon: <CheckCircle2 size={64} className="text-emerald-500" />,
      color: "from-emerald-50 to-teal-50",
      accent: "bg-emerald-500"
    },
    {
      title: "Privacy & Security",
      description: "Enable Privacy Shields in Settings to blur amounts in public. Set a 4-digit PIN to lock your vault completely.",
      icon: <ShieldCheck size={64} className="text-violet-500" />,
      color: "from-violet-50 to-fuchsia-50",
      accent: "bg-violet-500"
    },
    {
      title: "Pro Tip: Customise",
      description: "In the 'Add' screen, long-press any category icon to change its name or symbol to fit your unique spending style.",
      icon: <MousePointer2 size={64} className="text-rose-500" />,
      color: "from-rose-50 to-pink-50",
      accent: "bg-rose-500"
    }
  ];

  const nextStep = () => {
    if (step >= slides.length - 1) {
      onFinish();
    } else {
      setStep(s => Math.min(s + 1, slides.length - 1));
    }
  };

  const current = slides[step];

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 bg-gradient-to-br ${current.color} transition-colors duration-700`}>
      <AnimatePresence mode="wait">
      <motion.div 
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm flex flex-col items-center text-center space-y-8"
      >
        
        <div className={`w-32 h-32 rounded-[40px] ${current.accent}/10 flex items-center justify-center shadow-xl shadow-black/5 animate-bounce-subtle`}>
          {current.icon}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-800 font-heading tracking-tight leading-none uppercase">
            {current.title}
          </h1>
          <p className="text-slate-500 text-[13px] font-medium leading-relaxed px-4">
            {current.description}
          </p>
        </div>

        <div className="flex gap-2.5">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${step === i ? `w-6 ${current.accent}` : 'w-1 bg-slate-300/50'}`} 
            />
          ))}
        </div>

        <div className="w-full pt-8">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={nextStep}
            className={`w-full ${current.accent} text-white py-5 rounded-[28px] font-bold flex items-center justify-center gap-3 shadow-2xl transition-all uppercase tracking-widest text-[11px]`}
          >
            {step === slides.length - 1 ? "Start Your Vault" : "Next Insight"}
            <ArrowRight size={18} />
          </motion.button>
        </div>
      </motion.div>
      </AnimatePresence>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
};
