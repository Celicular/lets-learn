import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Brain, ShieldAlert, Zap, ShieldCheck } from 'lucide-react';
import { useTimer } from '../utils/TimerContext';

export default function FocusTimer() {
  const {
    timeLeft,
    isActive,
    activePreset,
    isHardcore,
    violations,
    PRESETS,
    toggleTimer,
    resetTimer,
    handlePresetChange,
    toggleHardcore
  } = useTimer();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (activePreset.minutes * 60));

  return (
    <div className={`h-full flex flex-col items-center justify-center p-8 transition-colors duration-500 ${isHardcore && isActive ? 'bg-slate-900' : 'bg-[#f7f8fb]'}`}>
      
      {/* Violations Warning Overlay */}
      <AnimatePresence>
        {isHardcore && violations > 0 && isActive && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 flex gap-4 z-50"
          >
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className={`w-12 h-12 border-4 border-white flex items-center justify-center shadow-[4px_4px_0px_#000] rotate-3 ${i < violations ? 'bg-red-500 animate-pulse' : 'bg-slate-800'}`}
              >
                <ShieldAlert className={`w-6 h-6 ${i < violations ? 'text-white' : 'text-slate-600'}`} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className={`max-w-md w-full border-8 border-slate-900 shadow-[16px_16px_0px_#0f172a] p-10 flex flex-col items-center transition-colors ${isHardcore && isActive ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}
      >
        <div className="w-full flex justify-between mb-8 gap-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p)}
              className={`flex-1 py-3 px-2 border-4 border-slate-900 font-black text-[10px] uppercase tracking-widest transition-all shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none flex flex-col items-center gap-2 text-slate-900 ${activePreset.id === p.id ? p.color : 'bg-white'}`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative w-64 h-64 mb-10">
          {/* Progress Ring */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              className={isHardcore && isActive ? 'text-slate-700' : 'text-slate-100'}
            />
            <motion.circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              strokeDasharray="753.98"
              initial={{ strokeDashoffset: 753.98 }}
              animate={{ strokeDashoffset: 753.98 * (1 - progress) }}
              transition={{ duration: 0.5, ease: "linear" }}
              className={isHardcore && isActive ? 'text-lime-400' : 'text-slate-900'}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className={`text-xs font-black uppercase tracking-widest mt-2 ${isHardcore && isActive ? 'text-lime-400' : 'text-slate-500'}`}>
              {isHardcore && isActive ? 'HARDCORE FOCUS' : (isActive ? 'Focusing...' : 'Ready?')}
            </span>
          </div>
        </div>

        {/* Hardcore Toggle */}
        <div className="w-full mb-8">
           <button 
             onClick={toggleHardcore}
             disabled={isActive}
             className={`w-full flex items-center justify-between p-4 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 ${isHardcore ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-900'}`}
           >
              <div className="flex items-center gap-3">
                {isHardcore ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                <div className="text-left">
                   <div className="font-black text-sm uppercase tracking-widest">Hardcore Mode</div>
                   <div className="text-[10px] font-bold opacity-80 uppercase">No tab switching allowed</div>
                </div>
              </div>
              <div className={`w-12 h-6 border-4 border-slate-900 relative ${isHardcore ? 'bg-lime-400' : 'bg-white'}`}>
                <motion.div 
                  animate={{ x: isHardcore ? 24 : 0 }}
                  className="absolute top-0 bottom-0 w-4 bg-slate-900 border-2 border-slate-800" 
                />
              </div>
           </button>
        </div>

        <div className="flex gap-6 w-full">
          <button
            onClick={toggleTimer}
            className={`flex-1 py-4 border-4 border-slate-900 font-black text-lg uppercase tracking-widest transition-all shadow-[8px_8px_0px_#0f172a] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none flex items-center justify-center gap-3 text-slate-900 ${isActive ? 'bg-red-400' : 'bg-lime-400'}`}
          >
            {isActive ? <Pause className="w-6 h-6 stroke-[3px]" /> : <Play className="w-6 h-6 stroke-[3px]" />}
            {isActive ? 'Pause' : 'Start'}
          </button>
          
          <button
            onClick={resetTimer}
            className="w-20 py-4 bg-white border-4 border-slate-900 hover:bg-slate-100 font-black flex items-center justify-center transition-all shadow-[8px_8px_0px_#0f172a] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
          >
            <RotateCcw className="w-6 h-6 stroke-[3px] text-slate-900" />
          </button>
        </div>

        <div className={`mt-10 p-4 border-4 border-dashed w-full text-center transition-colors ${isHardcore && isActive ? 'border-slate-600' : 'border-slate-300'}`}>
           <Brain className={`w-6 h-6 mx-auto mb-2 ${isHardcore && isActive ? 'text-slate-500' : 'text-slate-300'}`} />
           <p className={`text-xs font-bold uppercase tracking-tighter ${isHardcore && isActive ? 'text-slate-500' : 'text-slate-400'}`}>
             {isHardcore && isActive ? "Don't look away. Focus is binary." : "The mind is not a vessel to be filled, but a fire to be kindled."}
           </p>
        </div>
      </motion.div>
    </div>
  );
}
