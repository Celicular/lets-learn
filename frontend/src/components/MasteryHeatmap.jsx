import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Target, TrendingUp } from 'lucide-react';

const colorMap = {
  weak: 'bg-red-400',
  practice: 'bg-orange-300',
  good: 'bg-yellow-300',
  mastered: 'bg-lime-400'
};

const levelLabels = {
  weak: 'Weak',
  practice: 'Needs Practice',
  good: 'Good',
  mastered: 'Mastered'
};

export default function MasteryHeatmap({ mastery }) {
  const topics = Object.entries(mastery || {});

  if (topics.length === 0) {
    return (
      <div className="bg-white border-4 border-slate-900 p-8 shadow-[8px_8px_0px_#0f172a] text-center">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">No topic data available yet.</p>
      </div>
    );
  }

  const formatTime = (s) => {
    if (!s) return '0s';
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-5 h-5 stroke-[3px]" /> Topic Mastery Heatmap
        </h3>
        <div className="flex gap-2">
            {Object.entries(colorMap).map(([lvl, color]) => (
                <div key={lvl} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 border-2 border-slate-900 ${color}`} />
                    <span className="text-[10px] font-black uppercase text-slate-500">{levelLabels[lvl]}</span>
                </div>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map(([topic, data], idx) => (
          <motion.div
            key={topic}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-6 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] relative overflow-hidden group hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${colorMap[data.level]}`}
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-black text-slate-900 uppercase text-lg leading-tight flex-1 mr-4">{topic}</h4>
                <div className="bg-white border-2 border-slate-900 px-2 py-0.5 text-xs font-black shadow-[2px_2px_0px_#0f172a]">
                  {data.accuracy}%
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 border-t-2 border-slate-900 pt-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-900/60 leading-none mb-1">Total Time</span>
                    <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(data.total_time)}
                    </span>
                </div>
                <div className="flex flex-col border-l-2 border-slate-900/20 pl-4">
                    <span className="text-[10px] font-black uppercase text-slate-900/60 leading-none mb-1">Top Speed</span>
                    <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {data.best_speed || 0} Q/M
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-900/60 leading-none mb-1">Attempts</span>
                    <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                        <Target className="w-3 h-3" /> {data.attempted}
                    </span>
                </div>
                <div className="flex flex-col border-l-2 border-slate-900/20 pl-4">
                    <span className="text-[10px] font-black uppercase text-slate-900/60 leading-none mb-1">Avg Speed</span>
                    <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {data.avg_speed || 0} Q/M
                    </span>
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-12 h-12" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
