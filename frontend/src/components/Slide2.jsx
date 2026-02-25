import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Cpu, Target, TrendingUp } from 'lucide-react';

const Slide2 = () => {
  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-center">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">The Evolution of Learning</h2>
        <p className="text-xl text-slate-600 font-medium">From static struggles to dynamic mastery.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 items-stretch h-auto lg:h-[500px]">
        {/* Left: Problem */}
        <div className="flex-1 flex flex-col justify-between">
          <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="bg-coral-100 text-coral-600 p-2 rounded-lg mr-3 shadow-sm text-sm">✖</span> 
            The Problem
          </h3>
          
          <div className="space-y-5 flex-1 flex flex-col justify-center">
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
                className="skeu-notebook p-5 text-slate-700 font-semibold text-lg leading-relaxed flex items-start"
              >
                <div className="w-2 h-2 rounded-full bg-coral-400 mt-2.5 mr-4 flex-shrink-0" />
                {text}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: AI Pipeline Visualization */}
        <div className="flex-1 flex flex-col bg-slate-50/50 rounded-[30px] p-8 md:p-10 border border-white/60 shadow-xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-200 rounded-full blur-[100px] opacity-40 translate-x-1/2 -translate-y-1/2" />
          <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center relative z-10">
            <span className="bg-lime-100 text-lime-600 p-2 rounded-lg mr-3 shadow-sm text-sm">✓</span> 
            LetsLearn Solution
          </h3>

          <div className="relative flex-1 flex flex-col justify-center gap-6 z-10">
            {/* Pipeline arrows */}
            <div className="absolute left-[27px] top-10 bottom-10 w-1 bg-gradient-to-b from-indigo-400 to-cyan-400 rounded-full hidden md:block" />
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-white shadow-md hidden md:flex items-center justify-center border-2 border-indigo-100 z-10 flex-shrink-0">
                <Upload className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="neu-panel px-6 py-4 flex-1 font-bold text-slate-700">1. Upload Docs & Extract Concepts</div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-white shadow-md hidden md:flex items-center justify-center border-2 border-indigo-100 z-10 flex-shrink-0">
                <Cpu className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="neu-panel px-6 py-4 flex-1 font-bold text-slate-700">2. Generate Quiz & Track Performance</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-white shadow-md hidden md:flex items-center justify-center border-2 border-indigo-100 z-10 flex-shrink-0">
                <Target className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="neu-panel px-6 py-4 flex-1 font-bold text-slate-700">3. Detect Weak Areas & Smart Retry</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-white shadow-md hidden md:flex items-center justify-center border-2 border-indigo-100 z-10 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="neu-panel px-6 py-4 flex-1 font-bold text-slate-700">4. Spaced Repetition for Mastery</div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
};

export default Slide2;
