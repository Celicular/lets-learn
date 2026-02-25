import React from 'react';
import { motion } from 'framer-motion';
import { Play, Brain, BookOpen, Target, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Slide1 = () => {
  const navigate = useNavigate();
  
  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative px-4 text-center md:text-left">
      <div className="flex-1 space-y-8 z-10 mt-12 md:mt-0 flex flex-col items-center md:items-start">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight"
      >
        LetsLearn — <br/> Turn Any Document Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Smart Learning</span>
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-xl text-slate-600 max-w-2xl leading-relaxed"
      >
        Upload slides, PDFs, notes, or question banks and instantly generate adaptive quizzes, flashcards, and personalized learning paths powered by AI.
      </motion.p>
      <motion.button 
        onClick={() => navigate('/fulldemo')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="neu-panel px-8 py-4 text-lg font-bold text-indigo-700 flex items-center gap-3 hover:text-indigo-800"
      >
        <Play className="w-5 h-5 fill-current" /> Explore Demo
      </motion.button>
    </div>

    <div className="flex-1 flex justify-center items-center relative h-[600px] w-full z-0 hidden md:flex">
      <motion.div 
        className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 sphere-glow z-10"
      />
      
      {/* Orbiting / Floating cards */}
      <motion.div 
         animate={{ y: [-10, 10, -10] }}
         transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
         className="glass-panel absolute top-20 right-20 p-4 flex items-center gap-3 z-20"
      >
        <div className="bg-indigo-100 p-2 rounded-full"><Brain className="w-5 h-5 text-indigo-600" /></div>
        <span className="font-semibold text-slate-800">Adaptive Quiz Engine</span>
      </motion.div>

      <motion.div 
         animate={{ y: [10, -10, 10] }}
         transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
         className="glass-panel absolute bottom-32 right-10 p-4 flex items-center gap-3 z-20"
      >
        <div className="bg-cyan-100 p-2 rounded-full"><BookOpen className="w-5 h-5 text-cyan-600" /></div>
        <span className="font-semibold text-slate-800">Smart Flashcards</span>
      </motion.div>

      <motion.div 
         animate={{ y: [-15, 15, -15] }}
         transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
         className="glass-panel absolute top-40 left-10 p-4 flex items-center gap-3 z-20"
      >
        <div className="bg-coral-100 p-2 rounded-full"><Target className="w-5 h-5 text-coral-500" /></div>
        <span className="font-semibold text-slate-800">Weak Area Detection</span>
      </motion.div>

      <motion.div 
         animate={{ y: [15, -15, 15] }}
         transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
         className="glass-panel absolute bottom-20 left-20 p-4 flex items-center gap-3 z-20"
      >
        <div className="bg-lime-100 p-2 rounded-full"><Network className="w-5 h-5 text-lime-600" /></div>
        <span className="font-semibold text-slate-800">RAG Powered Intelligence</span>
      </motion.div>
    </div>
  </div>
  );
};

export default Slide1;
