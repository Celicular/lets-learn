import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Cpu, Target, TrendingUp } from 'lucide-react';

const Slide2 = () => {
  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-center py-6">
      <div className="text-center mb-12">
        <h2 className="text-5xl lg:text-6xl font-black text-slate-900 mb-4 tracking-tighter uppercase inline-block bg-coral-400 px-6 py-2 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] rotate-[1deg]">
          The Evolution of Learning
        </h2>
        <p className="text-xl text-slate-800 font-bold mt-6">From static struggles to dynamic mastery.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch h-auto lg:h-[520px] px-4">
        {/* Left: Problem */}
        <div className="flex-1 flex flex-col justify-between bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-8 md:p-10 relative">
          <h3 className="text-3xl font-black text-slate-900 mb-8 flex items-center uppercase tracking-tight">
            <div className="bg-coral-400 border-4 border-slate-900 w-12 h-12 mr-4 flex items-center justify-center shadow-[4px_4px_0px_#0f172a]">
              <span className="text-2xl font-black text-slate-900">✖</span>
            </div>
            The Problem
          </h3>
          
          <div className="space-y-4 flex-1 flex flex-col justify-center relative z-10">
            {[
              "Students manually convert notes into questions",
              "Weak areas remain unidentified",
              "Static quizzes don’t adapt to performance",
              "Revision lacks spaced repetition"
            ].map((text, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="bg-slate-100 border-4 border-slate-900 px-6 py-4 text-slate-800 font-bold text-lg leading-relaxed flex items-center group hover:bg-coral-100 hover:translate-x-2 transition-transform"
              >
                <div className="w-4 h-4 bg-slate-900 mr-5 flex-shrink-0 group-hover:bg-coral-500 transition-colors" />
                {text}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: AI Pipeline Visualization */}
        <div className="flex-1 flex flex-col bg-cyan-400 border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-8 md:p-10 relative overflow-hidden">
          
          <h3 className="text-3xl font-black text-slate-900 mb-8 flex items-center relative z-10 uppercase tracking-tight">
            <div className="bg-white border-4 border-slate-900 w-12 h-12 mr-4 flex items-center justify-center shadow-[4px_4px_0px_#0f172a]">
              <span className="text-3xl font-black text-emerald-500">✓</span>
            </div>
            LetsLearn Solution
          </h3>

          <div className="relative flex-1 flex flex-col justify-between md:justify-center gap-5 z-10">
            {/* Pipeline connection line */}
            <div className="absolute left-[36px] top-6 bottom-6 w-2 bg-slate-900 hidden md:block" />
            
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-6 group">
              <div className="bg-white border-4 border-slate-900 w-16 h-16 z-10 flex-shrink-0 flex items-center justify-center shadow-[4px_4px_0px_#0f172a] group-hover:bg-indigo-400 transition-colors">
                <Upload className="w-8 h-8 text-slate-900" />
              </div>
              <div className="bg-white border-4 border-slate-900 px-6 py-4 flex-1 font-black shadow-[4px_4px_0px_#0f172a] text-slate-900 text-lg group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:shadow-[0px_0px_0px_#0f172a] transition-all">1. Upload Docs & Extract Concepts</div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-center gap-6 group">
              <div className="bg-white border-4 border-slate-900 w-16 h-16 z-10 flex-shrink-0 flex items-center justify-center shadow-[4px_4px_0px_#0f172a] group-hover:bg-indigo-400 transition-colors">
                <Cpu className="w-8 h-8 text-slate-900" />
              </div>
              <div className="bg-white border-4 border-slate-900 px-6 py-4 flex-1 font-black shadow-[4px_4px_0px_#0f172a] text-slate-900 text-lg group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:shadow-[0px_0px_0px_#0f172a] transition-all">2. Generate Quiz & Track Performance</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="flex items-center gap-6 group">
              <div className="bg-white border-4 border-slate-900 w-16 h-16 z-10 flex-shrink-0 flex items-center justify-center shadow-[4px_4px_0px_#0f172a] group-hover:bg-indigo-400 transition-colors">
                <Target className="w-8 h-8 text-slate-900" />
              </div>
              <div className="bg-white border-4 border-slate-900 px-6 py-4 flex-1 font-black shadow-[4px_4px_0px_#0f172a] text-slate-900 text-lg group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:shadow-[0px_0px_0px_#0f172a] transition-all">3. Detect Weak Areas & Smart Retry</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="flex items-center gap-6 group">
              <div className="bg-white border-4 border-slate-900 w-16 h-16 z-10 flex-shrink-0 flex items-center justify-center shadow-[4px_4px_0px_#0f172a] group-hover:bg-yellow-400 transition-colors">
                <TrendingUp className="w-8 h-8 text-slate-900" />
              </div>
              <div className="bg-white border-4 border-slate-900 px-6 py-4 flex-1 font-black shadow-[4px_4px_0px_#0f172a] text-slate-900 text-lg group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:shadow-[0px_0px_0px_#0f172a] transition-all">4. Mastery via Spaced Repetition</div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
};

export default Slide2;
