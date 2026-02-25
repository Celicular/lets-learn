import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Trophy, Target, BookOpen, Shuffle, Trash2 } from 'lucide-react';

const MODE_LABELS = {
  quick: { label: 'Quick Quiz', icon: <Target className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700' },
  targeted: { label: 'Topic Quiz', icon: <BookOpen className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
  deep: { label: 'Deep Assessment', icon: <Shuffle className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700' },
};

function ScoreRing({ pct }) {
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const progress = (pct / 100) * circ;

  return (
    <svg width="72" height="72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      <motion.circle
        cx="36" cy="36" r={r}
        fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - progress }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="900" fill={color}>{pct}%</text>
    </svg>
  );
}

export default function AnalyticsView({ results, onClear }) {
  if (results.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <BarChart2 className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800 mb-2">No Results Yet</h3>
        <p className="text-slate-500 font-medium max-w-sm">
          Complete a quiz and save your results to track your performance over time.
        </p>
      </div>
    );
  }

  const avgScore = Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length);
  const best = Math.max(...results.map(r => r.percentage));

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">My Results</h1>
          <p className="text-slate-500 font-medium">Track your learning performance over time.</p>
        </div>
        <button onClick={onClear} className="flex items-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 border border-red-100 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors">
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Quizzes', value: results.length, icon: <Trophy className="w-6 h-6 text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'Average Score', value: `${avgScore}%`, icon: <BarChart2 className="w-6 h-6 text-indigo-500" />, bg: 'bg-indigo-50' },
          { label: 'Best Score', value: `${best}%`, icon: <Target className="w-6 h-6 text-emerald-500" />, bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`${stat.bg} rounded-3xl p-5 border border-white shadow-sm flex items-center gap-4`}>
            <div>{stat.icon}</div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Result cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {[...results].reverse().map((r, i) => {
            const meta = MODE_LABELS[r.mode] || MODE_LABELS.quick;
            const topicEntries = r.breakdown ? Object.entries(r.breakdown).filter(([k]) => k !== 'all') : [];

            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {r.project && (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{r.project}</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800">
                      {r.score}/{r.total} correct
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">
                      {new Date(r.timestamp).toLocaleString()}
                    </div>

                    {/* Topic breakdown */}
                    {topicEntries.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {topicEntries.map(([topic, data]) => {
                          const pct = Math.round((data.correct / data.total) * 100);
                          const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
                          return (
                            <div key={topic}>
                              <div className="flex justify-between text-xs font-bold text-slate-600 mb-0.5">
                                <span>{topic}</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${barColor}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <ScoreRing pct={r.percentage} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
