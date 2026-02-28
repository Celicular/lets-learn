import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Trophy, Target, BookOpen, Shuffle, Trash2, Activity, Loader, Download } from 'lucide-react';
import MasteryHeatmap from './MasteryHeatmap';

const API = 'http://localhost:8000';

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
  const [masteryData, setMasteryData] = useState({});
  const [isLoadingMastery, setIsLoadingMastery] = useState(false);
  
  // Get current active project from results if available
  const activeProj = results.length > 0 ? results[0].project : null;

  useEffect(() => {
    if (activeProj) {
        fetchMastery();
    }
  }, [activeProj, results]);

  const fetchMastery = async () => {
    try {
        setIsLoadingMastery(true);
        const res = await fetch(`${API}/projects/${activeProj}/mastery`);
        if (res.ok) {
            const data = await res.json();
            setMasteryData(data.mastery || {});
        }
    } catch (err) {
        console.error("Failed to fetch mastery stats", err);
    } finally {
        setIsLoadingMastery(false);
    }
  };

  const formatTime = (s) => {
    if (!s) return null;
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  const handleExport = () => {
    const avgScore = Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length);
    const best = Math.max(...results.map(r => r.percentage));
    const resultsWithTime = results.filter(r => r.time_spent > 0);
    const avgSpeed = resultsWithTime.length > 0 
      ? (resultsWithTime.reduce((s, r) => s + (r.total / (r.time_spent / 60)), 0) / resultsWithTime.length).toFixed(1)
      : 0;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Study Performance Report - ${activeProj || 'All Projects'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { font-family: 'Inter', sans-serif; background: #e6ebf5 !important; color: #0f172a; padding: 40px; margin: 0; }
          .report-container { max-width: 900px; margin: 0 auto; background: white !important; border: 4px solid #0f172a; padding: 40px; box-shadow: 12px 12px 0px #0f172a; }
          .header { border-bottom: 4px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; font-size: 48px; font-weight: 900; text-transform: uppercase; letter-spacing: -2px; line-height: 0.9; }
          .header p { margin: 5px 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
          .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
          .stat-card { border: 4px solid #0f172a; padding: 10px 15px; box-shadow: 6px 6px 0px #0f172a; }
          .stat-card.yellow { background: #fde047 !important; }
          .stat-card.cyan { background: #67e8f9 !important; }
          .stat-card.lime { background: #a3e635 !important; }
          .stat-card.indigo { background: #a5b4fc !important; }
          .stat-value { font-size: 32px; font-weight: 900; }
          .stat-label { font-size: 10px; font-weight: 900; text-transform: uppercase; border-top: 2px solid #0f172a; margin-top: 5px; padding-top: 5px; }
          .section-title { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px; border-left: 12px solid #0f172a; padding-left: 15px; }
          .mastery-item { margin-bottom: 20px; }
          .mastery-header { display: flex; justify-content: space-between; font-weight: 900; text-transform: uppercase; font-size: 14px; margin-bottom: 5px; }
          .progress-bg { height: 20px; background: white !important; border: 4px solid #0f172a; box-shadow: 4px 4px 0px #0f172a; overflow: hidden; }
          .progress-fill { height: 100%; border-right: 4px solid #0f172a; }
          .history-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .history-table th { background: #0f172a !important; color: white !important; padding: 12px; text-align: left; text-transform: uppercase; font-size: 12px; font-weight: 900; }
          .history-table td { padding: 12px; border: 2px solid #0f172a; font-weight: 700; font-size: 13px; }
          .mode-tag { font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 2px 6px; border: 2px solid #0f172a; box-shadow: 2px 2px 0px #0f172a; background: white !important; }
          @media print { body { padding: 0; } .report-container { box-shadow: none; border: 4px solid #0f172a; max-width: 100%; } }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <div>
              <h1>Performance Report</h1>
              <p>${activeProj || 'All Projects'} // Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="stat-grid">
            <div class="stat-card yellow"><div class="stat-value">${results.length}</div><div class="stat-label">Total Quizzes</div></div>
            <div class="stat-card cyan"><div class="stat-value">${avgScore}%</div><div class="stat-label">Average Score</div></div>
            <div class="stat-card lime"><div class="stat-value">${best}%</div><div class="stat-label">Best Score</div></div>
            <div class="stat-card indigo"><div class="stat-value">${avgSpeed}</div><div class="stat-label">Avg Q/Min</div></div>
          </div>

          <div class="section-title">Topic Mastery</div>
          <div style="margin-bottom: 40px;">
            ${Object.entries(masteryData).map(([topic, data]) => {
              const pct = data.accuracy;
              const color = pct >= 70 ? '#a3e635' : pct >= 40 ? '#fde047' : '#f87171';
              return `
                <div class="mastery-item">
                  <div class="mastery-header"><span>${topic}</span><span>${pct}% Accuracy // ${data.attempted} Qs</span></div>
                  <div class="progress-bg"><div class="progress-fill" style="width: ${pct}%; background: ${color} !important;"></div></div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="section-title">Quiz History</div>
          <table class="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${[...results].reverse().map(r => `
                <tr>
                  <td>${new Date(r.timestamp).toLocaleDateString()}</td>
                  <td><span class="mode-tag">${r.mode}</span></td>
                  <td>${r.score}/${r.total} (${r.percentage}%)</td>
                  <td>${r.time_spent ? (r.time_spent >= 60 ? Math.floor(r.time_spent/60)+'m '+(r.time_spent%60)+'s' : r.time_spent+'s') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 50px; text-align: center; font-weight: 900; font-size: 12px; text-transform: uppercase; color: #94a3b8;">
            Generated by LetsLearn AI Platform
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(reportHtml);
    win.document.close();
  };

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
  
  const resultsWithTime = results.filter(r => r.time_spent > 0);
  const avgSpeed = resultsWithTime.length > 0 
    ? (resultsWithTime.reduce((s, r) => s + (r.total / (r.time_spent / 60)), 0) / resultsWithTime.length).toFixed(1)
    : 0;

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto bg-[#e6ebf5]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">My Results</h1>
          <p className="text-slate-900 font-bold bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-block">Track your learning performance over time.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleExport} className="flex items-center gap-2 px-6 py-3 bg-yellow-300 text-slate-900 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]">
            <Download className="w-5 h-5 stroke-[3px]" /> Export Report
          </button>
          <button onClick={onClear} className="flex items-center gap-2 px-6 py-3 bg-red-400 text-slate-900 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] font-black uppercase tracking-widest hover:bg-red-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]">
            <Trash2 className="w-5 h-5 stroke-[3px]" /> Clear All
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Quizzes', value: results.length, icon: <Trophy className="w-8 h-8 text-slate-900 stroke-[2px]" />, bg: 'bg-yellow-300' },
          { label: 'Average Score', value: `${avgScore}%`, icon: <BarChart2 className="w-8 h-8 text-slate-900 stroke-[2px]" />, bg: 'bg-cyan-300' },
          { label: 'Best Score', value: `${best}%`, icon: <Target className="w-8 h-8 text-slate-900 stroke-[2px]" />, bg: 'bg-lime-300' },
          { label: 'Average Speed', value: `${avgSpeed} Q/M`, icon: <Activity className="w-8 h-8 text-slate-900 stroke-[2px]" />, bg: 'bg-indigo-300' },
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

      {/* Mastery Heatmap Section */}
      <div className="mb-10">
        <div className="bg-white border-4 border-slate-900 p-6 shadow-[8px_8px_0px_#0f172a]">
          {isLoadingMastery ? (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader className="w-10 h-10 animate-spin text-indigo-500 mb-4 stroke-[3px]" />
                <p className="font-black text-slate-900 uppercase tracking-widest text-sm">Analyzing Strengths...</p>
            </div>
          ) : (
            <MasteryHeatmap mastery={masteryData} />
          )}
        </div>
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
                    <div className="flex items-center gap-4 mt-2">
                      <div className="font-bold text-slate-900 uppercase tracking-widest text-[10px] bg-slate-100 border-2 border-slate-900 px-2 py-1 shadow-[2px_2px_0px_#0f172a] inline-block">
                        {new Date(r.timestamp).toLocaleString()}
                      </div>
                      {r.time_spent > 0 && (
                        <div className="font-black text-indigo-700 uppercase tracking-widest text-[10px] bg-indigo-50 border-2 border-indigo-900 px-2 py-1 shadow-[2px_2px_0px_#4338ca] inline-block">
                           ⏱️ {formatTime(r.time_spent)}
                        </div>
                      )}
                      {r.time_spent > 0 && (
                        <div className="font-black text-emerald-700 uppercase tracking-widest text-[10px] bg-emerald-50 border-2 border-emerald-900 px-2 py-1 shadow-[2px_2px_0px_#059669] inline-block">
                           🏎️ {(r.total / (r.time_spent / 60)).toFixed(1)} Q/MIN
                        </div>
                      )}
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
