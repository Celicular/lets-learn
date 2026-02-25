import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Trophy, Target, BookOpen, Shuffle, Trash2 } from 'lucide-react';

const MODE_LABELS = {
  quick: { label: 'Quick Quiz', icon: <Target className="w-4 h-4 stroke-[3px]" />, color: 'bg-indigo-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] uppercase tracking-widest' },
  targeted: { label: 'Topic Quiz', icon: <BookOpen className="w-4 h-4 stroke-[3px]" />, color: 'bg-fuchsia-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] uppercase tracking-widest' },
  deep: { label: 'Deep Assessment', icon: <Shuffle className="w-4 h-4 stroke-[3px]" />, color: 'bg-pink-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] uppercase tracking-widest' },
};

function ScoreRing({ pct }) {
  const color = pct >= 70 ? '#a3e635' : pct >= 40 ? '#fde047' : '#f87171'; // lime-400, yellow-300, red-400
  const r = 28;
  const circ = 2 * Math.PI * r;
  const progress = (pct / 100) * circ;

  return (
    <svg width="72" height="72" className="shrink-0 overflow-visible">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#0f172a" strokeWidth="6" />
      <motion.circle
        cx="36" cy="36" r={r}
        fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="butt"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - progress }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="42" textAnchor="middle" fontSize="16" fontWeight="900" fill="#0f172a">{pct}%</text>
    </svg>
  );
}

export default function AnalyticsView({ results, onClear }) {
  if (results.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#e6ebf5]">
        <div className="w-24 h-24 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex items-center justify-center mb-6">
          <BarChart2 className="w-12 h-12 text-slate-900 stroke-[2px]" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Results Yet</h3>
        <p className="text-slate-900 font-bold max-w-sm bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_#0f172a]">
          Complete a quiz and save your results to track your performance over time.
        </p>
      </div>
    );
  }

  const avgScore = Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length);
  const best = Math.max(...results.map(r => r.percentage));

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto bg-[#e6ebf5]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">My Results</h1>
          <p className="text-slate-900 font-bold bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-block">Track your learning performance over time.</p>
        </div>
        <button onClick={onClear} className="flex items-center gap-2 px-6 py-3 bg-red-400 text-slate-900 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] font-black uppercase tracking-widest hover:bg-red-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]">
          <Trash2 className="w-5 h-5 stroke-[3px]" /> Clear All
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Quizzes', value: results.length, icon: <Trophy className="w-8 h-8 text-slate-900 stroke-[2px]" />, bg: 'bg-yellow-300' },
          { label: 'Average Score', value: `${avgScore}%`, icon: <BarChart2 className="w-8 h-8 text-slate-900 stroke-[2px]" />, bg: 'bg-cyan-300' },
          { label: 'Best Score', value: `${best}%`, icon: <Target className="w-8 h-8 text-slate-900 stroke-[2px]" />, bg: 'bg-lime-300' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`${stat.bg} border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 flex items-center gap-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all`}>
            <div>{stat.icon}</div>
            <div>
              <div className="text-3xl font-black text-slate-900 leading-tight">{stat.value}</div>
              <div className="text-xs font-black text-slate-900 uppercase tracking-widest border-t-2 border-slate-900 pt-1 mt-1">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Result cards */}
      <div className="space-y-6">
        <AnimatePresence>
          {[...results].reverse().map((r, i) => {
            const meta = MODE_LABELS[r.mode] || MODE_LABELS.quick;
            const topicEntries = r.breakdown ? Object.entries(r.breakdown).filter(([k]) => k !== 'all') : [];

            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white border-4 border-slate-900 p-8 shadow-[8px_8px_0px_#0f172a]"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className={`flex items-center gap-1.5 text-xs font-black px-3 py-1 ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {r.project && (
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest border-2 border-slate-900 px-3 py-1 shadow-[2px_2px_0px_#0f172a]">{r.project}</span>
                      )}
                    </div>
                    <div className="font-black text-2xl text-slate-900 uppercase tracking-tight mb-1">
                      {r.score} / {r.total} CORRECT
                    </div>
                    <div className="font-bold text-slate-900 uppercase tracking-widest text-sm bg-slate-100 border-2 border-slate-900 px-2 py-1 shadow-[2px_2px_0px_#0f172a] inline-block mt-2">
                       {new Date(r.timestamp).toLocaleString()}
                    </div>

                    {/* Topic breakdown */}
                    {topicEntries.length > 0 && (
                      <div className="mt-6 space-y-4">
                        {topicEntries.map(([topic, data]) => {
                          const pct = Math.round((data.correct / data.total) * 100);
                          const barColor = pct >= 70 ? 'bg-lime-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
                          return (
                            <div key={topic}>
                              <div className="flex justify-between text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">
                                <span>{topic}</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-3 border-4 border-slate-900 bg-white shadow-[2px_2px_0px_#0f172a] overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className={`h-full border-r-4 border-slate-900 ${barColor}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 shrink-0 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4 flex items-center justify-center">
                    <ScoreRing pct={r.percentage} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
