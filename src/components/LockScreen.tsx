import React, { useState, useEffect, useRef } from 'react';
import { Lock, Delete, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

interface LockScreenProps {
  correctPin: string;
  onUnlocked: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ correctPin, onUnlocked }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyClick = (key: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + key);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlocked();
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  }, [pin, correctPin, onUnlocked]);

  useEffect(() => {
    const handleInteraction = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('click', handleInteraction);
    inputRef.current?.focus();
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-8 cursor-text" 
      onClick={() => inputRef.current?.focus()}
    >
      <input 
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setPin(val);
          if (error) setError(false);
        }}
        className="absolute opacity-0 pointer-events-none h-0 w-0"
        autoFocus
      />

      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-500 blur-[120px] rounded-full" />
      </div>

      <div className="text-center mb-16 relative z-10">
        <div className={`mx-auto w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 transition-all duration-300 border-2 ${error ? 'bg-rose-500 border-rose-400 text-white animate-shake shadow-2xl shadow-rose-500/30' : 'bg-white/10 border-white/20 text-indigo-400 shadow-2xl shadow-black/20'}`}>
          {error ? <ShieldAlert size={28} /> : <KeyRound size={28} />}
        </div>
        <h1 className="text-white text-2xl font-bold mb-2 tracking-tight font-heading uppercase">Security Vault</h1>
        <p className={`text-[8px] font-bold uppercase tracking-[0.4em] transition-colors ${error ? 'text-rose-400' : 'text-slate-500'}`}>
          {error ? 'Invalid PIN Code' : 'Authorize Identity'}
        </p>
      </div>

      <div className="flex gap-5 mb-20 relative z-10">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
              pin.length > i 
                ? 'bg-indigo-400 border-indigo-400 scale-125 shadow-[0_0_15px_rgba(129,140,248,0.5)]' 
                : 'border-white/10 bg-white/5'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8 max-w-[300px] relative z-10 pointer-events-none opacity-50 hidden sm:grid">
        {keys.map((key, i) => {
          if (key === '') return <div key={i} />;
          if (key === 'delete') {
            return (
              <motion.button
                whileTap={{ scale: 0.9 }}
                key={i}
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="w-20 h-20 flex items-center justify-center text-slate-500 hover:text-white transition-all pointer-events-auto"
              >
                <Delete size={28} />
              </motion.button>
            );
          }
          return (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={i}
              onClick={(e) => { e.stopPropagation(); handleKeyClick(key); }}
              className="w-20 h-20 rounded-[24px] bg-white/5 text-white text-3xl font-bold flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all border border-white/5 shadow-xl backdrop-blur-md pointer-events-auto"
            >
              {key}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-20 flex items-center gap-3 text-slate-600 relative z-10">
        <ShieldCheck size={16} />
        <span className="text-[9px] font-black uppercase tracking-[0.4em]">Encrypted Session</span>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-12px); }
          75% { transform: translateX(12px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </motion.div>
  );
};
