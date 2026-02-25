import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Video, Eye, Languages } from 'lucide-react';

const FutureCard = ({ icon: Icon, title, items, delay, iconColor, dotColor, bgTheme }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 100 }}
    className={`bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-8 flex flex-col flex-1 group hover:-translate-y-2 hover:translate-x-1 hover:shadow-[0px_0px_0px_#0f172a] transition-all duration-200 relative overflow-hidden cursor-pointer`}
  >
    
    <div className="flex items-center justify-between mb-8 relative z-10">
      <div className={`w-14 h-14 bg-${bgTheme} border-4 border-slate-900 flex-shrink-0 flex items-center justify-center shadow-[4px_4px_0px_#0f172a] group-hover:scale-110 transition-transform duration-300 relative`}>
        <Icon className={`w-7 h-7 text-slate-900 stroke-[2.5px]`} />
      </div>
      <div className="w-4 h-4 rounded-none border-2 border-slate-900 flex items-center justify-center bg-slate-100 shadow-[2px_2px_0px_#0f172a]">
         <div className={`w-2 h-2 ${dotColor}`} />
      </div>
    </div>
    
    <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight leading-tight">{title}</h3>
    
    <ul className="space-y-3 flex-1 flex flex-col justify-start relative z-10">
      {items.map((item, i) => (
        <li key={i} className="flex items-center text-slate-800 font-bold text-[14px] leading-snug bg-slate-100 border-2 border-slate-900 px-3 py-2 group-hover:bg-slate-200 transition-colors duration-300">
          <div className={`w-3 h-3 border-2 border-slate-900 mr-3 flex-shrink-0 ${dotColor}`} />
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
);

const Slide3_2 = () => {
  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-center py-6 px-4">
      <div className="text-center mb-12">
        <h2 className="text-5xl lg:text-6xl font-black text-slate-900 mb-4 tracking-tighter uppercase inline-block bg-pink-400 px-6 py-2 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] rotate-[1deg]">
            Future Roadmap
        </h2>
        <p className="text-xl text-slate-800 font-bold mt-6">Next-generation features pushing the boundaries of AI education.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        <FutureCard 
          icon={Globe} title="Web Integration" delay={0.1}
          iconColor="text-blue-500" dotColor="bg-blue-500" bgTheme="blue-400"
          items={[
            "MCP-based Google Search",
            "Real-time internet context",
            "Live fact-checking",
            "Dynamic syllabus updates"
          ]}
        />
        <FutureCard 
          icon={Video} title="Autonomous Tutors" delay={0.2}
          iconColor="text-pink-500" dotColor="bg-pink-500" bgTheme="pink-400"
          items={[
            "Proactive learning interventions",
            "Continuous memory synthesis",
            "Automated curriculum building",
            "Multi-agent study simulations"
          ]}
        />
        <FutureCard 
          icon={Eye} title="Advanced Vision" delay={0.3}
          iconColor="text-amber-500" dotColor="bg-amber-500" bgTheme="amber-400"
          items={[
            "Visual QA on live camera",
            "Handwritten math solving",
            "Science diagram analysis",
            "Spatial screen awareness"
          ]}
        />
        <FutureCard 
          icon={Languages} title="Global Collab" delay={0.4}
          iconColor="text-rose-500" dotColor="bg-rose-500" bgTheme="rose-400"
          items={[
            "Real-time voice translation",
            "Peer-to-peer study rooms",
            "Personalized learning tracks",
            "Cross-lingual RAG queries"
          ]}
        />
      </div>
    </div>
  );
};

export default Slide3_2;
