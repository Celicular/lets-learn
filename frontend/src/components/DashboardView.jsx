import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Layers, FileText, ArrowRight, Activity, Percent, MessageSquare, Rocket, Sparkles, Zap, BrainCircuit, PhoneCall, Star } from 'lucide-react';

export default function DashboardView({ activeProj, projects, results, onNavigate }) {
  const currentProject = projects.find(p => p.id === activeProj);
  const totalDocs = currentProject?.docs?.length || 0;
  
  // Calculate stats
  const totalQuizzes = results.length;
  const avgScore = totalQuizzes > 0 
    ? Math.round(results.reduce((acc, r) => acc + (r.percentage || 0), 0) / totalQuizzes)
    : 0;
    
  let knowledgeLevel = "Rookie Explorer";
  let badgeColor = "bg-indigo-300";
  let levelIcon = <Rocket className="w-5 h-5 text-slate-900 stroke-[2.5px]" />;
  
  if (avgScore >= 70 && totalDocs > 0) { 
    knowledgeLevel = "Tech Pilot"; 
    badgeColor = "bg-fuchsia-300"; 
    levelIcon = <Zap className="w-5 h-5 text-slate-900 stroke-[2.5px]" />;
  }
  if (avgScore >= 85 && totalQuizzes > 1) { 
    knowledgeLevel = "Neural Master"; 
    badgeColor = "bg-amber-300"; 
    levelIcon = <Star className="w-5 h-5 text-slate-900 stroke-[2.5px]" />;
  }
  if (totalDocs === 0) { 
    knowledgeLevel = "No Signal"; 
    badgeColor = "bg-slate-300"; 
    levelIcon = <Activity className="w-5 h-5 text-slate-900 stroke-[2.5px]" />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.4, duration: 0.8 } }
  };

  const floatingVariants = {
    animate: {
      y: [0, -15, 0],
      rotate: [0, 5, -5, 0],
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-8 overflow-y-auto bg-slate-50 relative font-sans text-slate-900">
      
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 max-w-6xl mx-auto space-y-12 mt-4">
        
        {/* Header: Mission Control */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-cyan-300 border-4 border-slate-900 p-8 shadow-[8px_8px_0px_#0f172a] relative overflow-hidden group">
           <div className="relative z-10">
               <motion.div variants={floatingVariants} animate="animate" className="inline-block mb-4">
                   <div className="w-16 h-16 bg-white border-4 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_#0f172a]">
                       <BrainCircuit className="w-8 h-8 text-slate-900 stroke-[2.5px]" />
                   </div>
               </motion.div>
               <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-2 uppercase">
                 Mission Control: {currentProject?.name}
               </h1>
               <p className="text-slate-800 text-lg font-bold max-w-xl leading-relaxed mt-4 bg-white border-2 border-slate-900 p-3 shadow-[4px_4px_0px_#0f172a]">
                 Welcome to your learning hub. Equip your brain, test your limits, and level up your neural network!
               </p>
           </div>
           
           <div className="relative z-10 shrink-0">
               <div className="text-center space-y-2">
                   <div className="text-xs font-black tracking-widest text-slate-900 uppercase">Current Rank</div>
                   <motion.div whileHover={{ scale: 1.05, rotate: 2 }} className={`flex items-center gap-3 px-6 py-3 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] overflow-hidden relative`}>
                       <div className="relative z-10 flex items-center gap-3">
                           <div className={`text-slate-900 border-2 border-slate-900 p-1 ${badgeColor}`}>{levelIcon}</div>
                           <span className="font-black text-xl tracking-wide text-slate-900 uppercase">{knowledgeLevel}</span>
                       </div>
                   </motion.div>
               </div>
           </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Stat Card 1 */}
           {/* Stat Card 1 */}
           <motion.div variants={cardVariants} className="bg-emerald-300 border-4 border-slate-900 p-6 shadow-[6px_6px_0px_#0f172a] relative overflow-hidden group cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all">
               <div className="flex items-center justify-between mb-4 relative z-10">
                   <div className="w-12 h-12 bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] group-hover:animate-pulse">
                       <Percent className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
                   </div>
                   <Trophy className="w-8 h-8 text-slate-900 stroke-[2.5px] opacity-20 group-hover:opacity-100 transition-opacity" />
               </div>
               <div className="relative z-10">
                   <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-1">Accuracy Core</h4>
                   <div className="flex items-baseline gap-1 mt-2">
                       <span className="text-6xl font-black text-slate-900 -ml-1 tracking-tighter">{avgScore}</span>
                       <span className="text-2xl font-black text-slate-900">%</span>
                   </div>
               </div>
           </motion.div>

           {/* Stat Card 2 */}
           <motion.div variants={cardVariants} className="bg-fuchsia-300 border-4 border-slate-900 p-6 shadow-[6px_6px_0px_#0f172a] relative overflow-hidden group cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all">
               <div className="flex items-center justify-between mb-4 relative z-10">
                   <div className="w-12 h-12 bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] group-hover:animate-bounce">
                       <Target className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
                   </div>
                   <Rocket className="w-8 h-8 text-slate-900 stroke-[2.5px] opacity-20 group-hover:opacity-100 transition-opacity" />
               </div>
               <div className="relative z-10">
                   <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-1">Missions Cleared</h4>
                   <div className="flex items-baseline gap-1 mt-2">
                       <span className="text-6xl font-black text-slate-900 -ml-1 tracking-tighter">{totalQuizzes}</span>
                   </div>
               </div>
           </motion.div>

           {/* Stat Card 3 */}
           <motion.div variants={cardVariants} className="bg-yellow-300 border-4 border-slate-900 p-6 shadow-[6px_6px_0px_#0f172a] relative overflow-hidden group cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all">
               <div className="flex items-center justify-between mb-4 relative z-10">
                   <div className="w-12 h-12 bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] group-hover:animate-pulse">
                       <Layers className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
                   </div>
                   <FileText className="w-8 h-8 text-slate-900 stroke-[2.5px] opacity-20 group-hover:opacity-100 transition-opacity" />
               </div>
               <div className="relative z-10">
                   <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-1">Data Banks</h4>
                   <div className="flex items-baseline gap-1 mt-2">
                       <span className="text-6xl font-black text-slate-900 -ml-1 tracking-tighter">{totalDocs}</span>
                   </div>
               </div>
           </motion.div>
        </div>

        {/* Action Terminals */}
        <div className="space-y-6 pb-12">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
               <Sparkles className="w-6 h-6 text-indigo-400" /> Terminals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Action Card: Call Mode */}
                <motion.button variants={cardVariants} onClick={() => onNavigate('call')} className="col-span-1 min-h-[160px] border-4 border-slate-900 bg-indigo-400 p-6 text-left relative shadow-[6px_6px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-40 transition-all duration-500 transform group-hover:rotate-12">
                        <PhoneCall className="w-32 h-32 text-slate-900 stroke-[3px]" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between space-y-6">
                        <div className="w-12 h-12 shrink-0 bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a]">
                            <PhoneCall className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">Holo-Call AI</h4>
                            <p className="text-slate-900 font-bold border-t-2 border-slate-900 pt-1 uppercase tracking-widest text-xs">Talk hands-free</p>
                        </div>
                    </div>
                </motion.button>

                {/* Action Card: Tutor Chat */}
                <motion.button variants={cardVariants} onClick={() => onNavigate('chat')} className="col-span-1 min-h-[160px] border-4 border-slate-900 bg-emerald-300 p-6 text-left relative shadow-[6px_6px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-40 transition-all duration-500 transform -rotate-12">
                        <MessageSquare className="w-32 h-32 text-slate-900 stroke-[3px]" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between space-y-6">
                        <div className="w-12 h-12 shrink-0 bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a]">
                            <MessageSquare className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">Comm Link</h4>
                            <p className="text-slate-900 font-bold border-t-2 border-slate-900 pt-1 uppercase tracking-widest text-xs">Text chat with AI</p>
                        </div>
                    </div>
                </motion.button>
                
                {/* Action Card: Quiz */}
                <motion.button variants={cardVariants} onClick={() => onNavigate('quiz')} className="col-span-1 min-h-[160px] border-4 border-slate-900 bg-pink-400 p-6 text-left relative shadow-[6px_6px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-40 transition-all duration-500 transform rotate-12">
                        <Target className="w-32 h-32 text-slate-900 stroke-[3px]" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between space-y-6">
                        <div className="w-12 h-12 shrink-0 bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a]">
                            <Target className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">Simulation</h4>
                            <p className="text-slate-900 font-bold border-t-2 border-slate-900 pt-1 uppercase tracking-widest text-xs">Test your skills</p>
                        </div>
                    </div>
                </motion.button>

                {/* Action Card: Flashcards */}
                <motion.button variants={cardVariants} onClick={() => onNavigate('flashcards')} className="col-span-1 min-h-[160px] border-4 border-slate-900 bg-amber-300 p-6 text-left relative shadow-[6px_6px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-40 transition-all duration-500 transform group-hover:rotate-12">
                        <Layers className="w-32 h-32 text-slate-900 stroke-[3px]" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between space-y-6">
                        <div className="w-12 h-12 shrink-0 bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a]">
                            <Layers className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">Memory Core</h4>
                            <p className="text-slate-900 font-bold border-t-2 border-slate-900 pt-1 uppercase tracking-widest text-xs">Review knowledge</p>
                        </div>
                    </div>
                </motion.button>

            </div>
        </div>

      </motion.div>
    </div>
  );
}
