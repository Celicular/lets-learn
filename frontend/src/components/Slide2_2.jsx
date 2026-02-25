import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Server, BrainCircuit, FileSearch, Palette, LayoutTemplate } from 'lucide-react';

const Slide2_2 = () => {
  const techCategories = [
    {
      title: "Frontend & UI",
      icon: <LayoutTemplate className="w-6 h-6 lg:w-7 lg:h-7 text-slate-900 stroke-[2.5px]" />,
      bgTheme: "bg-indigo-300",
      dot: "bg-indigo-500",
      items: ["React 18", "Vite", "Tailwind CSS", "Framer Motion", "Mermaid.js", "React Markdown", "Lucide Icons", "Web Speech API"]
    },
    {
      title: "Backend & Data",
      icon: <Server className="w-6 h-6 lg:w-7 lg:h-7 text-slate-900 stroke-[2.5px]" />,
      bgTheme: "bg-emerald-300",
      dot: "bg-emerald-500",
      items: ["FastAPI", "Python", "Uvicorn", "ChromaDB", "PyMuPDF", "JSON Persistence", "Asyncio"]
    },
    {
      title: "AI & RAG Engine",
      icon: <BrainCircuit className="w-6 h-6 lg:w-7 lg:h-7 text-slate-900 stroke-[2.5px]" />,
      bgTheme: "bg-rose-300",
      dot: "bg-rose-500",
      items: ["Mistral 7B (GGUF)", "Llama-cpp-python", "ComfyUI API", "Dreamshaper XL", "SentenceTransformers", "BGE-Small-En", "CUDA Accel"]
    }
  ];

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-center py-4 px-4 lg:px-8 overflow-hidden">
      <div className="text-center mb-6 lg:mb-10 shrink-0">
        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2 uppercase inline-block bg-lime-400 px-6 py-2 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] rotate-[1deg]">
          The Tech Stack
        </h2>
        <p className="text-base lg:text-lg text-slate-800 font-bold max-w-2xl mx-auto mt-4">
          100% Local. 100% Private. High Performance Architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 shrink">
        {techCategories.map((category, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1 + (idx * 0.1), duration: 0.4 }}
            className={`bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-5 lg:p-6 flex flex-col relative overflow-hidden group hover:translate-x-1 hover:-translate-y-1 hover:shadow-[0px_0px_0px_#0f172a] transition-all duration-300`}
          >
            
            <div className="flex items-center mb-5 relative z-10">
              <div className={`${category.bgTheme} border-4 border-slate-900 w-12 h-12 lg:w-14 lg:h-14 mr-4 flex-shrink-0 flex items-center justify-center shadow-[4px_4px_0px_#0f172a] group-hover:scale-105 transition-transform duration-300`}>
                {category.icon}
              </div>
              <h3 className="text-xl lg:text-2xl font-black tracking-tight text-slate-900 leading-tight uppercase">{category.title}</h3>
            </div>

            <div className="flex flex-wrap content-start gap-2 lg:gap-3 relative z-10 flex-1">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-slate-100 border-2 border-slate-900 hover:bg-slate-200 transition-colors duration-300 px-3 py-1.5 lg:px-4 lg:py-2 flex items-center shadow-[2px_2px_0px_#0f172a] cursor-default group/item">
                  <span className={`w-2 h-2 ${category.dot} border-2 border-slate-900 mr-2 flex-shrink-0 group-hover/item:scale-125 transition-transform`} />
                  <span className="font-bold text-slate-800 text-xs lg:text-sm uppercase tracking-tight">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Slide2_2;
