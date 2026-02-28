import React from 'react';
import { motion } from 'framer-motion';
import { Zap, MessageSquare, FileQuestion, Gamepad2, AlertOctagon, CheckCircle2, Sparkles } from 'lucide-react';

const Slide2 = () => {
  const situations = [
    {
      title: "The Cramming Crisis",
      problem: "80% of Indian students study primarily one day before the exam, rushing to finish huge syllabuses.",
      solution: "Accelerated content processing helps them complete their entire syllabus as fast as possible.",
      icon: <Zap className="w-8 h-8 text-slate-900 stroke-[2px]" />,
      color: "bg-coral-400"
    },
    {
      title: "Unanswered Doubts",
      problem: "Students have many doubts but feel uncomfortable asking questions or don't have anyone to ask.",
      solution: "A dedicated, judgment-free AI tutor is available 24/7 to specialize in answering any question deeply.",
      icon: <MessageSquare className="w-8 h-8 text-slate-900 stroke-[2px]" />,
      color: "bg-cyan-400"
    },
    {
      title: "Unsolved Q-Banks",
      problem: "Massive question banks are useless when you don't know the answers or where to find them.",
      solution: "Upload any question bank to instantly generate accurate answers and step-by-step explanations.",
      icon: <FileQuestion className="w-8 h-8 text-slate-900 stroke-[2px]" />,
      color: "bg-fuchsia-400"
    },
    {
      title: "Mental Exhaustion",
      problem: "Traditional studying and repetitive revision lead to burnout and brain-draining exhaustion.",
      solution: "Gamified 3D learning turns boring revision into addictive, high-stakes gameplay.",
      icon: <Gamepad2 className="w-8 h-8 text-slate-900 stroke-[2px]" />,
      color: "bg-lime-400"
    }
  ];

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-center py-2 px-4">
      {/* Header Section */}
      <div className="text-center mb-6 flex flex-col items-center">
        <motion.h2 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-4 tracking-tighter uppercase inline-block bg-yellow-300 px-8 py-3 border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] -rotate-1"
        >
          The Problems We Tackle
        </motion.h2>
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-white font-black mt-2 uppercase tracking-[0.2em] bg-slate-900 border-4 border-slate-900 px-6 py-2 shadow-[4px_4px_0px_#000] rotate-1"
        >
          Last-Minute Exam Preparation Made Easy
        </motion.div>
      </div>

      {/* Grid of Solutions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 max-w-6xl mx-auto w-full">
        {situations.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + (index * 0.1) }}
            className="flex flex-col border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] bg-white group hover:-translate-y-2 hover:translate-x-2 hover:shadow-[0px_0px_0px_#0f172a] transition-all duration-300"
          >
            {/* Card Title Bar */}
            <div className="bg-slate-900 text-white p-4 flex items-center gap-4 border-b-4 border-slate-900">
               <div className={`p-2 ${item.color} border-2 border-white shadow-[2px_2px_0px_#fff]`}>
                 {item.icon}
               </div>
               <h3 className="text-2xl font-black uppercase tracking-widest leading-none">
                 {item.title}
               </h3>
            </div>
            
            <div className="flex flex-col sm:flex-row h-full">
              {/* Problem Section */}
              <div className="bg-red-50 p-4 md:p-5 flex-1 relative overflow-hidden sm:border-r-4 border-b-4 sm:border-b-0 border-slate-900">
                <div className="flex items-center gap-2 mb-2 text-red-600 relative z-10">
                  <AlertOctagon className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
                  <span className="font-black uppercase text-xs md:text-sm tracking-widest">The Problem</span>
                </div>
                <p className="font-bold text-slate-800 text-sm md:text-base leading-snug relative z-10">
                  {item.problem}
                </p>
                <AlertOctagon className="w-24 h-24 md:w-32 md:h-32 absolute -bottom-6 -right-6 text-red-200 stroke-[1px] opacity-40 rotate-[15deg] pointer-events-none" />
              </div>
              
              {/* Solution Section */}
              <div className={`${item.color} p-4 md:p-5 flex-1 relative overflow-hidden flex flex-col justify-center`}>
                <div className="flex items-center gap-2 mb-2 text-slate-900 relative z-10">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
                  <span className="font-black uppercase text-xs md:text-sm tracking-widest">Our Solution</span>
                </div>
                <p className="font-black text-slate-900 text-base md:text-xl leading-snug relative z-10">
                  {item.solution}
                </p>
                <Sparkles className="w-24 h-24 md:w-32 md:h-32 absolute -bottom-4 -right-4 text-white stroke-[1px] opacity-30 -rotate-[15deg] pointer-events-none" />
              </div>
            </div>
            
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Slide2;
