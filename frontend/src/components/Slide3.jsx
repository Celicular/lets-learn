import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, Users, Database } from 'lucide-react';

const CapabilityCard = ({ icon: Icon, title, items, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="neu-panel p-8 flex flex-col flex-1"
  >
    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white">
      <Icon className="w-7 h-7 text-indigo-600" />
    </div>
    <h3 className="text-xl font-extrabold text-slate-800 mb-6">{title}</h3>
    <ul className="space-y-4 flex-1 flex flex-col justify-start">
      {items.map((item, i) => (
        <li key={i} className="flex items-center text-slate-600 font-semibold text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-3 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
);

const Slide3 = () => {
  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-center">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Platform Ecosystem</h2>
        <p className="text-xl text-slate-600 font-medium">Built for scale, intelligence, and deep learning.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <CapabilityCard 
          icon={Brain} title="Core Engine" delay={0.1}
          items={[
            "RAG-based document intelligence",
            "Question generation (MCQ + Subj)",
            "Flashcard auto-creation",
            "Chapter summarization"
          ]}
        />
        <CapabilityCard 
          icon={Target} title="Adaptive Learning" delay={0.2}
          items={[
            "Smart retry intervals",
            "Weak area drill-downs",
            "Mastery heatmap tracking",
            "Skill-based ranking"
          ]}
        />
        <CapabilityCard 
          icon={Users} title="Institution Tools" delay={0.3}
          items={[
            "Teacher course builder",
            "Assessment regeneration",
            "Report card analytics",
            "ERP integration ready"
          ]}
        />
        <CapabilityCard 
          icon={Database} title="Infrastructure" delay={0.4}
          items={[
            "Vector DB storage",
            "Embedding agent workflow",
            "LLM orchestration",
            "Robust CI/CD pipeline"
          ]}
        />
      </div>
    </div>
  );
};

export default Slide3;
