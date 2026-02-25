import React from 'react';
import { motion } from 'framer-motion';
import { Play, Brain, BookOpen, Target, Network, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Slide1 = () => {
  const navigate = useNavigate();
  
  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative px-4 text-center md:text-left pt-12">
      
      {/* LEFT COLUMN - TEXT CONTENT */}
      <div className="flex-1 space-y-10 z-10 flex flex-col items-center md:items-start">
        
        {/* Brutalist Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-yellow-400 border-4 border-slate-900 px-4 py-1.5 font-black uppercase text-sm tracking-widest text-slate-900 shadow-[4px_4px_0px_#0f172a] rotate-[-2deg]"
        >
          100% Local AI Learning
        </motion.div>

        {/* Hero Headline */}
        <motion.h1 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
          className="text-6xl lg:text-8xl font-black tracking-tighter text-slate-900 leading-[1.1] uppercase"
        >
          LetsLearn <br/> 
          <span className="text-white text-stroke-brutal inline-block mt-2">
             Smart 
          </span>
          <span className="bg-cyan-400 border-4 border-slate-900 px-4 ml-4 shadow-[6px_6px_0px_#0f172a] rotate-[1deg] inline-block">
             Tutor.
          </span>
        </motion.h1>

        {/* Hero Paragraph */}
        <motion.p 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className="text-xl lg:text-2xl text-slate-800 font-bold max-w-2xl leading-relaxed bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0px_#0f172a]"
        >
          Upload slides, PDFs, notes, or question banks and instantly generate adaptive quizzes, flashcards, and personalized learning paths powered by AI.
        </motion.p>

        {/* Brutalist Button */}
        <motion.button 
          onClick={() => navigate('/fulldemo')}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ x: 4, y: 4, boxShadow: "0px 0px 0px #0f172a" }}
          transition={{ duration: 0.1 }}
          className="bg-indigo-500 border-4 border-slate-900 px-10 py-5 text-xl font-black uppercase tracking-wider text-white flex items-center gap-4 shadow-[8px_8px_0px_#0f172a] transition-all cursor-pointer"
        >
          <Play className="w-7 h-7 fill-white stroke-slate-900 stroke-[3px]" /> Explore Demo
        </motion.button>
      </div>

      {/* RIGHT COLUMN - BRUTALIST FLOATING GRID */}
      <div className="flex-1 flex justify-center items-center relative h-[600px] w-full z-0 hidden md:flex">
        
        {/* Core Block */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 50 }}
          className="absolute w-72 h-72 bg-coral-400 border-8 border-slate-900 shadow-[16px_16px_0px_#0f172a] z-10 flex items-center justify-center rotate-3"
        >
           <Brain className="w-32 h-32 text-slate-900 stroke-[1.5px]" />
        </motion.div>
        
        {/* Floating cards */}
        <motion.div 
           animate={{ y: [-5, 5, -5] }}
           transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-10 right-10 bg-white border-4 border-slate-900 p-4 shadow-[6px_6px_0px_#0f172a] flex items-center gap-4 z-20 cursor-pointer hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] transition-all"
        >
          <div className="bg-indigo-400 border-2 border-slate-900 p-2"><Database className="w-6 h-6 text-slate-900" /></div>
          <span className="font-black text-slate-900 uppercase tracking-widest text-sm">FAISS Engine</span>
        </motion.div>

        <motion.div 
           animate={{ y: [5, -5, 5] }}
           transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
           className="absolute bottom-20 right-4 bg-yellow-400 border-4 border-slate-900 p-4 shadow-[6px_6px_0px_#0f172a] flex items-center gap-4 z-20 cursor-pointer hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] transition-all"
        >
          <div className="bg-white border-2 border-slate-900 p-2"><BookOpen className="w-6 h-6 text-slate-900" /></div>
          <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Smart Flashcards</span>
        </motion.div>

        <motion.div 
           animate={{ y: [-8, 8, -8] }}
           transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-32 left-0 bg-lime-400 border-4 border-slate-900 p-4 shadow-[6px_6px_0px_#0f172a] flex items-center gap-4 z-20 -rotate-3 cursor-pointer hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] hover:-rotate-1 transition-all"
        >
          <div className="bg-white border-2 border-slate-900 p-2"><Target className="w-6 h-6 text-slate-900" /></div>
          <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Local Mastery</span>
        </motion.div>

        <motion.div 
           animate={{ y: [6, -6, 6] }}
           transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
           className="absolute bottom-32 left-10 bg-cyan-400 border-4 border-slate-900 p-4 shadow-[6px_6px_0px_#0f172a] flex items-center gap-4 z-20 rotate-2 cursor-pointer hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] hover:rotate-1 transition-all"
        >
          <div className="bg-white border-2 border-slate-900 p-2"><Network className="w-6 h-6 text-slate-900" /></div>
          <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Mistral 7B</span>
        </motion.div>
      </div>
    </div>
  );
};

export default Slide1;
