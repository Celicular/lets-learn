import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BrainCircuit, Target, ShieldAlert, Sparkles, 
  ChevronRight, CheckCircle2, CheckCircle, XCircle, Award, FastForward,
  Activity, Zap, Clock, Trophy, Heart, Timer, Settings, BookOpen, Shuffle, ArrowRight, Loader, RotateCcw
} from 'lucide-react';
import ArcheryGame from './ArcheryGame';

const API = 'http://localhost:8000';

async function fetchQuiz(projectName, count = 5, topic = 'all', onProgress, signal) {
  const res = await fetch(`${API}/projects/${projectName}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, fmt: 'json', topic }),
    signal
  });
  if (!res.ok) throw new Error('Server error');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let raw = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    raw += chunk;
    if (onProgress) onProgress(raw);
  }
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (!arrayMatch) throw new Error('No valid JSON array found in response.');
  return JSON.parse(arrayMatch[0]);
}

async function fetchTopics(projectName, onProgress, signal) {
  const res = await fetch(`${API}/projects/${projectName}/topics?check_cached=true`, { signal });
  if (!res.ok) throw new Error('Server error');
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let raw = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    raw += chunk;
    if (onProgress) onProgress(raw);
  }
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (!arrayMatch) throw new Error('No valid JSON array found in response.');
  return JSON.parse(arrayMatch[0]);
}

// --- Hangman Visual ---
function HangmanVisual({ lives }) {
  // lives start at 3.
  // 3 lives: gallows only
  // 2 lives: head + rope
  // 1 life: body + arms
  // 0 lives: legs (Done)
  return (
    <div className="flex flex-col items-center">
      <div className="w-full aspect-[4/5] max-w-[300px] border-8 border-slate-900 bg-white shadow-[12px_12px_0px_#0f172a] p-4 flex items-center justify-center relative overflow-hidden mb-6">
        <svg width="100%" height="100%" viewBox="0 0 100 120" className="stroke-slate-900 fill-none stroke-[6]" strokeLinecap="round" strokeLinejoin="round">
          {/* Detailed Gallows */}
          <path d="M10 110 L90 110" strokeWidth="8" /> {/* Base */}
          <path d="M25 110 L25 10 L70 10" />             {/* Vertical & Top Beam */}
          <path d="M25 30 L45 10" strokeWidth="4" />    {/* Brace */}
          <path d="M70 10 L70 25" strokeWidth="4" />    {/* Rope Top */}
          
          {/* Character */}
          <AnimatePresence>
            {lives < 3 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Head & Rope */}
                <circle cx="70" cy="35" r="10" />
                <path d="M70 20 L70 25" strokeWidth="4" />
              </motion.g>
            )}
            {lives < 2 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Body & Arms */}
                <path d="M70 45 L70 75" />
                <path d="M55 55 L70 50 L85 55" />
              </motion.g>
            )}
            {lives < 1 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Legs */}
                <path d="M55 90 L70 75 L85 90" />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>
      
      {/* Neural Link Indicators */}
      <div className="flex gap-3">
         {[...Array(3)].map((_, i) => (
           <motion.div 
              key={i} 
              animate={i < lives ? { scale: [1, 1.1, 1], opacity: 1 } : { scale: 1, opacity: 0.3 }}
              transition={{ repeat: i < lives ? Infinity : 0, duration: 2 }}
              className={`w-5 h-5 border-4 border-slate-900 shadow-[2px_2px_0px_#000] ${i < lives ? 'bg-red-500' : 'bg-slate-200'}`} 
           />
         ))}
      </div>
      <div className="mt-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">Neural Stability: {lives}/3</div>
    </div>
  );
}

function QuizQuestion({ question, options, onAnswer, answered, selected, correct, onHelp }) {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-8">
        <h3 className="text-2xl font-black text-slate-900 leading-snug uppercase tracking-tight">{question}</h3>
        {onHelp && (
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    const context = `QUESTION: ${question}\n\nOPTIONS:\n${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}\n\nCORRECT ANSWER: ${correct}`;
                    const prompt = `I am stuck on this quiz question. Could you explain the logic behind the correct answer and help me understand why it is correct compared to the other options?`;
                    onHelp(context, prompt); 
                }}
                className="p-2 bg-indigo-100 border-2 border-slate-900 text-slate-900 hover:bg-indigo-300 transition-all shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                title="Ask AI for help"
            >
                <BrainCircuit className="w-5 h-5 stroke-[2.5px]" />
            </button>
        )}
      </div>
      <div className="space-y-4">
        {options.map((opt, i) => {
          let style = 'border-slate-900 bg-white hover:bg-yellow-100 shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]';
          if (answered) {
            if (opt === correct) style = 'border-slate-900 bg-lime-400 text-slate-900 shadow-[0px_0px_0px_#0f172a] translate-x-[2px] translate-y-[2px]';
            else if (opt === selected && opt !== correct) style = 'border-slate-900 bg-red-400 text-slate-900 shadow-[0px_0px_0px_#0f172a] translate-x-[2px] translate-y-[2px]';
            else style = 'border-slate-900 bg-slate-100 opacity-50 shadow-[0px_0px_0px_#0f172a] translate-x-[2px] translate-y-[2px]';
          }
          return (
            <button
              key={i}
              onClick={() => !answered && onAnswer(opt)}
              disabled={answered}
              className={`w-full text-left px-4 py-3 border-4 font-black text-sm transition-all ${style} disabled:cursor-default`}
            >
              <span className="mr-3 opacity-50 font-black">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Results Screen ---
function ResultsScreen({ results, mode, onRetry, onSave, isSaving, timeSpent }) {
  const correct = results.filter(r => r.isCorrect).length;
  const pct = Math.round((correct / results.length) * 100);
  
  // Group by topic if deep assessment
  const byTopic = {};
  if (mode === 'deep') {
    results.forEach(r => {
      if (!byTopic[r.topic]) byTopic[r.topic] = { correct: 0, total: 0 };
      byTopic[r.topic].total++;
      if (r.isCorrect) byTopic[r.topic].correct++;
    });
  }

  const formatTime = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };
  
  const avgSpeed = (timeSpent / results.length).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto py-8">
      {/* Score card */}
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-8 text-center mb-6">
        <Trophy className="w-16 h-16 text-slate-900 mx-auto mb-4 stroke-[2px]" />
        <div className={`text-7xl font-black mb-2 text-slate-900 tracking-tighter`}>{pct}%</div>
        <div className="text-slate-900 font-bold mb-4 uppercase tracking-widest">{correct} of {results.length} correct</div>
        
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="bg-slate-50 border-2 border-slate-900 px-4 py-2 shadow-[4px_4px_0px_#0f172a]">
             <div className="text-[10px] font-black uppercase text-slate-500">Time Taken</div>
             <div className="text-xl font-black text-slate-900 uppercase tracking-tighter">{formatTime(timeSpent)}</div>
          </div>
          <div className="bg-slate-50 border-2 border-slate-900 px-4 py-2 shadow-[4px_4px_0px_#0f172a]">
             <div className="text-[10px] font-black uppercase text-slate-500">Avg Speed</div>
             <div className="text-xl font-black text-slate-900 uppercase tracking-tighter">{avgSpeed}s / Q</div>
          </div>
        </div>

        <div className={`inline-block border-2 border-slate-900 px-4 py-2 font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_#0f172a] ${pct >= 70 ? 'bg-lime-400 text-slate-900' : pct >= 40 ? 'bg-yellow-400 text-slate-900' : 'bg-red-400 text-slate-900'}`}>
          {mode === 'survival' && pct < 100 && results.length < 10 ? 'DRAW // MISSION FAILED' : 
           pct >= 70 ? 'Strong Performance' : pct >= 40 ? 'Keep Studying' : 'Needs Improvement'}
        </div>
      </div>

      {/* Topic breakdown for deep mode */}
      {mode === 'deep' && Object.keys(byTopic).length > 0 && (
        <div className="bg-cyan-300 border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 mb-6">
          <h3 className="font-black text-slate-900 uppercase tracking-widest bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-flex items-center gap-2 mb-6"><BarChart2 className="w-5 h-5 text-slate-900 stroke-[3px]" /> Topic Breakdown</h3>
          <div className="space-y-6">
            {Object.entries(byTopic).map(([topic, data]) => {
              const tPct = Math.round((data.correct / data.total) * 100);
              const barColor = tPct >= 70 ? 'bg-lime-400' : tPct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
              return (
                <div key={topic}>
                  <div className="flex justify-between text-sm font-black text-slate-900 mb-2 uppercase tracking-tight">
                    <span>{topic}</span>
                    <span>{tPct}%</span>
                  </div>
                  <div className="w-full h-4 bg-white border-4 border-slate-900 shadow-[2px_2px_0px_#0f172a] overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${tPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} className={`h-full border-r-4 border-slate-900 ${barColor}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wrong answers review */}
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 mb-6">
        <h3 className="font-black text-slate-900 mb-6 uppercase tracking-widest inline-block border-b-4 border-slate-900">Answer Review</h3>
        <div className="space-y-4 max-h-64 overflow-y-auto pr-4">
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] ${r.isCorrect ? 'bg-lime-200' : 'bg-red-200'}`}>
              {r.isCorrect ? <CheckCircle className="w-6 h-6 text-slate-900 shrink-0 mt-0.5 stroke-[2.5px]" /> : <XCircle className="w-6 h-6 text-slate-900 shrink-0 mt-0.5 stroke-[2.5px]" />}
              <div>
                <div className="text-base font-black text-slate-900 mb-1">{r.question}</div>
                {!r.isCorrect && (
                  <div className="text-sm font-bold text-slate-900 mt-2 bg-white border-2 border-slate-900 p-2 shadow-[2px_2px_0px_#0f172a]">
                    <span className="text-red-600 font-black">Your answer:</span> {r.selected} <br/> <span className="text-emerald-600 font-black mt-1 inline-block">Correct:</span> {r.correct}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-2 py-4 bg-yellow-300 text-slate-900 font-black border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-yellow-400 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] text-lg uppercase tracking-widest">
          <RotateCcw className="w-5 h-5 stroke-[3px]" /> Restart Quiz
        </button>
        <button 
          onClick={async () => { await onSave(); onRetry(); }} 
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-400 text-slate-900 font-black border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-indigo-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] text-lg uppercase tracking-widest disabled:opacity-50"
        >
          {isSaving ? <><Loader className="w-5 h-5 animate-spin" /> Saving...</> : 'Finish & Return'}
        </button>
      </div>
    </motion.div>
  );
}

// --- Main Quiz View ---
export default function QuizView({ activeProj, onResultSaved, setIsBusy, onContextHelp, initialTopic, onResetTopic }) {
  const [mode, setMode] = useState(null); // null | quick | targeted | deep | survival
  const [phase, setPhase] = useState('select'); // select | topic-pick | loading | quiz | results
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]); // { question, options, correct, selected, isCorrect, topic? }
  const [answeredCurrent, setAnsweredCurrent] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [streamContent, setStreamContent] = useState('');
  const [abortController, setAbortController] = useState(null);
  const [usedTopicsBuffer, setUsedTopicsBuffer] = useState([]);
  const [deepLoadingInfo, setDeepLoadingInfo] = useState({ topics: [], activeIndex: -1 });
  const [questionCount, setQuestionCount] = useState(5);
  const [startTime, setStartTime] = useState(null);
  const [sessionTime, setSessionTime] = useState(0); // seconds
  const [lives, setLives] = useState(3);
  const [survivalTimer, setSurvivalTimer] = useState(10);
  const [survivalTimerActive, setSurvivalTimerActive] = useState(false);
  
  // Zen Mode 5s Timer (per pause)
  const [zenTimer, setZenTimer] = useState(5);
  const [zenTimerActive, setZenTimerActive] = useState(false);

  // Zen Archer State
  const [zenState, setZenState] = useState({
    active: false,
    wrongInCurrentShot: 0,
    isPaused: false, // True when arrow reaches a checkpoint
    shotIndex: 0, 
    waitingForImpact: false, // True after 3rd question until final hit
    impactResult: null // 'hit' or 'miss'
  });

  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      if (setIsBusy) setIsBusy(false);
    }
    setSurvivalTimerActive(false);
    setZenTimerActive(false); // Also stop zen timer
  };

  // Handle Initial Topic from Dashboard
  useEffect(() => {
    if (initialTopic && phase === 'select') {
      setSelectedTopic(initialTopic);
      // Auto-start targeted quiz for this topic
      const autoStart = async () => {
        setMode('targeted');
        setPhase('loading');
        setError(null);
        setStreamContent('');
        const controller = new AbortController();
        setAbortController(controller);
        if (setIsBusy) setIsBusy(true);
        try {
          const qs = await fetchQuiz(activeProj, 5, initialTopic, setStreamContent, controller.signal);
          if (!qs || qs.length === 0) throw new Error('Failed to generate questions.');
          setQuestions(qs.map(q => ({ ...q, topic: initialTopic })));
          setCurrentQ(0);
          setAnswers([]);
          setAnsweredCurrent(false);
          setSelectedOption(null);
          setStartTime(Date.now());
          setPhase('quiz');
          if (onResetTopic) onResetTopic();
        } catch (err) {
          if (err.name !== 'AbortError') setError('Failed to generate targeted quiz.');
          setPhase('select');
        } finally {
          setAbortController(null);
          if (setIsBusy) setIsBusy(false);
        }
      };
      autoStart();
    }
  }, [initialTopic, activeProj]);

  const startQuick = async () => {
    setMode('quick');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    try {
      const qs = await fetchQuiz(activeProj, questionCount, 'all', setStreamContent, controller.signal);
      await new Promise(r => setTimeout(r, 300)); // UI stabilization
      if (!qs || qs.length === 0) {
        throw new Error('No questions generated. Try uploading more documents.');
      }
      setQuestions(qs.map(q => ({ ...q, topic: 'all' })));
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setStartTime(Date.now());
      setPhase('quiz');
    } catch (err) {
      if (err.name === 'AbortError') { setPhase('select'); }
      else {
        setError('Failed to generate quiz. Is the server running?');
        setPhase('select');
      }
    } finally {
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const startTargeted = async () => {
    setMode('targeted');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    try {
      const topics = await fetchTopics(activeProj, setStreamContent, controller.signal);
      setAvailableTopics(topics);
      setPhase('topic-pick');
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to fetch topics.');
      setPhase('select');
    } finally {
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const startDeep = async () => {
    setMode('deep');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    try {
      const allTopicsRaw = await fetchTopics(activeProj, setStreamContent, controller.signal);
      const uniqueAll = [...new Set(allTopicsRaw)];
      
      let filtered = uniqueAll.filter(t => !usedTopicsBuffer.includes(t));
      if (filtered.length < 4) {
        filtered = uniqueAll;
        setUsedTopicsBuffer([]);
      }

      const selected = [...filtered].sort(() => Math.random() - 0.5).slice(0, 4);
      setUsedTopicsBuffer(prev => [...new Set([...prev, ...selected])]);
      setDeepLoadingInfo({ topics: selected, activeIndex: 0 });
      
      const sessionResults = [];
      for (let i = 0; i < selected.length; i++) {
        const t = selected[i];
        
        // Reset both state pieces together to avoid progress bar jumping
        setStreamContent('');
        setDeepLoadingInfo(prev => ({ ...prev, activeIndex: i }));
        
        // Small delay to ensure UI registers the topic switch
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const qs = await fetchQuiz(activeProj, 5, t, (raw) => setStreamContent(raw), controller.signal);
        sessionResults.push(qs.map(q => ({ ...q, topic: t })));
        
        // Stabilization delay after each topic
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const combined = sessionResults.flat().sort(() => Math.random() - 0.5);
      if (combined.length === 0) {
        throw new Error('No questions were generated. Please check if your documents have enough content.');
      }
      setQuestions(combined);
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setStartTime(Date.now());
      setPhase('quiz');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setError('Failed to generate deep assessment.');
      }
      setPhase('select');
    } finally {
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const startTopicQuiz = async () => {
    if (!selectedTopic) return;
    setPhase('loading');
    setStreamContent('');
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    try {
      setStreamContent('');
      const qs = await fetchQuiz(activeProj, questionCount, selectedTopic, setStreamContent, controller.signal);
      await new Promise(r => setTimeout(r, 300)); // UI stabilization
      if (!qs || qs.length === 0) {
        throw new Error('Failed to generate questions for this topic.');
      }
      setQuestions(qs.map(q => ({ ...q, topic: selectedTopic })));
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setStartTime(Date.now());
      setPhase('quiz');
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to generate quiz.');
      setPhase('select');
    } finally {
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const startSurvival = async () => {
    setMode('survival');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    setLives(3);
    setSurvivalTimer(10);
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    try {
      const qs = await fetchQuiz(activeProj, 10, 'all', setStreamContent, controller.signal);
      if (!qs || qs.length === 0) throw new Error('Failed to generate survival questions.');
      setQuestions(qs.map(q => ({ ...q, topic: 'all' })));
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setStartTime(Date.now());
      setPhase('quiz');
      setSurvivalTimerActive(true);
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to initiate Save Him mode.');
      setPhase('select');
    } finally {
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  // --- Survival Timer ---
  useEffect(() => {
    let timer;
    if (survivalTimerActive && phase === 'quiz' && !answeredCurrent && survivalTimer > 0) {
      timer = setInterval(() => {
        setSurvivalTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Time's up -> Wrong answer
            handleAnswer('time_up_' + Date.now());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [survivalTimerActive, phase, answeredCurrent, survivalTimer]);

  // --- Zen 15s Timer ---
  useEffect(() => {
    let timer;
    if (zenTimerActive && phase === 'quiz' && !answeredCurrent && zenTimer > 0) {
      timer = setInterval(() => {
        setZenTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAnswer('time_up_' + Date.now());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [zenTimerActive, phase, answeredCurrent, zenTimer]);

  const startZen = async () => {
    setMode('zen');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    try {
      // Fetch exactly 3 questions for a single 15-second rapid-fire flight sequence
      const qs = await fetchQuiz(activeProj, 3, 'all', (raw) => setStreamContent(raw), controller.signal);
      setQuestions(qs);
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setStartTime(Date.now());
      setZenState({ active: true, wrongInCurrentShot: 0, isPaused: false, shotIndex: 0, waitingForImpact: false, impactResult: null });
      setZenTimer(5);
      // Timer does NOT start here. It starts when ArcheryGame emits a 'paused' event.
      setZenTimerActive(false); 
      setPhase('quiz');
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to initiate Zen Archer mode.');
      setPhase('select');
    } finally {
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const handleAnswer = (opt) => {
    if (answeredCurrent) return;
    setAnsweredCurrent(true);
    setSelectedOption(opt);
    setSurvivalTimerActive(false);
    setZenTimerActive(false);

    const q = questions[currentQ];
    const isCorrect = opt === (q.answer || q.correct);

    const newAnswers = [...answers, {
      question: q.text || q.question, 
      options: q.options, 
      correct: q.answer || q.correct,
      selected: opt, 
      isCorrect, 
      topic: q.topic || 'General'
    }];
    setAnswers(newAnswers);

    let isDead = false;
    if (mode === 'survival' && !isCorrect) {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        isDead = true;
        setTimeout(() => {
          setSessionTime(Math.round((Date.now() - startTime) / 1000));
          setPhase('results');
        }, 1500); 
      }
    }

    if (mode === 'zen') {
      if (!isCorrect) {
        setZenState(prev => ({ ...prev, wrongInCurrentShot: prev.wrongInCurrentShot + 1 }));
      }
      // Give a brief moment to show correct/wrong before resuming arrow flight
      setTimeout(() => {
         // Advance question state so ArcheryGame knows the next checkpoint
         if (currentQ + 1 < questions.length) {
            const isEndOfShot = (currentQ + 1) % 3 === 0;
            if (!isEndOfShot) {
              setCurrentQ(i => i + 1);
              setAnsweredCurrent(false);
              setSelectedOption(null);
            }
         }
         // This makes the arrow fly to the next point or impact
         setZenState(prev => ({ ...prev, isPaused: false }));
      }, 1000);
      
      return; 
    }

    if (!isDead) {
      // This logic only runs for survival/other modes now
      if (mode !== 'zen') {
        setTimeout(() => {
          if (currentQ + 1 < questions.length) {
            setCurrentQ(i => i + 1);
            setAnsweredCurrent(false);
            setSelectedOption(null);
            if (mode === 'survival') {
              setSurvivalTimer(10);
              setSurvivalTimerActive(true);
            }
          } else {
            setSessionTime(Math.round((Date.now() - startTime) / 1000));
            setPhase('results');
          }
        }, 800);
      }
    }
  };

  const handleZenImpact = (forceImpact = false) => {
    // Called by ArcheryGame when the arrow physically hits the target/misses
    if (zenState.waitingForImpact || forceImpact) {
       // Display Hit or Miss text
       let resultType = 'hit';
       if (zenState.wrongInCurrentShot >= 3) resultType = 'miss';
       else if (zenState.wrongInCurrentShot > 0) resultType = 'deviation';

       setZenState(prev => ({ 
         ...prev, 
         impactResult: resultType 
       }));
       
       // Wait 2 seconds for user to read text before next shot / results
       setTimeout(() => {
         if (currentQ + 1 < questions.length) {
            // Reset for next shot
            setZenState(prev => ({ ...prev, active: false, waitingForImpact: false, impactResult: null }));
            setTimeout(() => {
              setCurrentQ(i => i + 1);
              setAnsweredCurrent(false);
              setSelectedOption(null);
              setZenState({ active: true, wrongInCurrentShot: 0, isPaused: false, shotIndex: zenState.shotIndex + 1, waitingForImpact: false, impactResult: null });
              setZenTimer(5);
              setZenTimerActive(false); // Wait for first pause
            }, 500);
         } else {
            // Game over
            setSessionTime(Math.round((Date.now() - startTime) / 1000));
            setPhase('results');
         }
       }, 2000);
    }
  };

  const saveResults = async () => {
    const correct = answers.filter(r => r.isCorrect).length;
    const pct = Math.round((correct / answers.length) * 100);
    const byTopic = {};
    answers.forEach(r => {
      if (!byTopic[r.topic]) byTopic[r.topic] = { correct: 0, total: 0 };
      byTopic[r.topic].total++;
      if (r.isCorrect) byTopic[r.topic].correct++;
    });

    setIsSaving(true);
    if (setIsBusy) setIsBusy(true);
    try {
      // Simulate slight network delay for UI UX to register "saving"
      await new Promise(r => setTimeout(r, 600)); 
      onResultSaved?.({ 
        mode, 
        score: correct, 
        total: answers.length, 
        percentage: pct, 
        breakdown: byTopic, 
        timestamp: new Date().toISOString(), 
        project: activeProj,
        time_spent: sessionTime 
      });
    } catch (err) {
      console.error('Failed to save results', err);
    } finally {
      setIsSaving(false);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const reset = () => {
    setMode(null);
    setPhase('select');
    setQuestions([]);
    setAnswers([]);
    setCurrentQ(0);
    setError(null);
    setLives(3); // Reset lives for survival
    setSurvivalTimer(10);
    setSurvivalTimerActive(false);
    setZenTimer(15); // Reset zen timer
    setZenTimerActive(false);
    setZenState({ active: false, wrongInCurrentShot: 0, isPaused: false, shotIndex: 0, waitingForImpact: false });
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto bg-[#e6ebf5]">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Adaptive Quiz</h1>
        <p className="text-slate-900 font-bold bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-block">Test your knowledge with AI-generated questions from your documents.</p>
      </div>

      {error && <div className="p-4 bg-red-300 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] text-slate-900 font-black uppercase tracking-widest mb-6">{error}</div>}

      {/* Global Settings */}
      {phase === 'select' && (
        <div className="max-w-5xl mb-10 bg-white border-4 border-slate-900 p-6 shadow-[8px_8px_0px_#0f172a]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Settings className="w-5 h-5" /> Quiz Parameters
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase">Set your preferred intensity for the next session.</p>
                </div>
                
                <div className="flex-1 max-w-md">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs font-black uppercase">Questions: {questionCount}</span>
                        <span className="text-xs font-black uppercase text-indigo-600">
                            {questionCount <= 5 ? 'Quick Session' : questionCount <= 12 ? 'Standard' : 'Marathon'}
                        </span>
                    </div>
                    <input 
                        type="range" min="3" max="25" step="1" 
                        value={questionCount} 
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full h-4 bg-slate-100 border-4 border-slate-900 appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Mode Selection */}
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            {[
              {
                id: 'quick', icon: <Target className="w-10 h-10 stroke-[2px] text-slate-900" />, color: 'bg-indigo-300',
                title: 'Quick Quiz', desc: 'Random questions from all your documents. No ranking, just a fast knowledge check.',
                badge: 'Unranked', onClick: startQuick
              },
              {
                id: 'targeted', icon: <BookOpen className="w-10 h-10 stroke-[2px] text-slate-900" />, color: 'bg-fuchsia-300',
                title: 'Topic Quiz', desc: 'Choose a specific topic and receive a focused quiz. Get ranked scores per topic.',
                badge: 'Ranked by Topic', onClick: startTargeted
              },
              {
                id: 'deep', icon: <Shuffle className="w-10 h-10 stroke-[2px] text-slate-900" />, color: 'bg-pink-300',
                title: 'Deep Assessment', desc: 'The AI picks 3-4 random topics and creates a comprehensive multi-topic exam.',
                badge: 'Full Breakdown', onClick: startDeep
              },
              {
                id: 'survival', icon: <Zap className="w-10 h-10 stroke-[2px] text-slate-900" />, color: 'bg-yellow-300',
                title: 'Save Him', desc: 'Survival mode: 10 seconds per question. 3 Lives. If he dies, it is a DRAW. Answer fast!',
                badge: '3 Lives · 10s Timer', onClick: startSurvival
              },
              {
                id: 'zen', icon: <Zap className="w-10 h-10 stroke-[2px] text-slate-900" />, color: 'bg-lime-300',
                title: 'Zen Archer 3D', desc: 'Neural Focus: 3 Questions per arrow. Accuracy tied to neural sync. Full 3D POV.',
                badge: '3D Simulation', onClick: startZen
              }
            ].map(item => (
              <motion.button
                key={item.id}
                onClick={item.onClick}
                disabled={!activeProj}
                className={`text-left p-8 border-4 border-slate-900 ${item.color} text-slate-900 shadow-[8px_8px_0px_#0f172a] relative overflow-hidden group disabled:opacity-50 disabled:pointer-events-none transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]`}
              >
                <div className="mb-6">{item.icon}</div>
                <div className="font-black text-2xl mb-3 uppercase tracking-tight">{item.title}</div>
                <div className="text-slate-900 text-sm font-bold leading-relaxed mb-6 border-t-2 border-slate-900 pt-3">{item.desc}</div>
                <div className="inline-block px-3 py-1 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-xs font-black uppercase tracking-widest">
                  {item.badge}
                </div>
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                  <ArrowRight className="w-6 h-6 stroke-[3px]" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Topic selection for targeted quiz */}
        {phase === 'topic-pick' && (
          <motion.div key="topic-pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl bg-white border-4 border-slate-900 p-8 shadow-[8px_8px_0px_#0f172a]">
            <h3 className="font-black text-slate-900 text-2xl mb-6 uppercase tracking-tight">Select a Topic</h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {availableTopics.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTopic(t)}
                  className={`px-4 py-4 border-4 text-sm font-black text-left transition-all uppercase tracking-widest shadow-[4px_4px_0px_#0f172a] ${selectedTopic === t ? 'border-slate-900 bg-indigo-400 text-slate-900 translate-x-[2px] translate-y-[2px] shadow-[0px_0px_0px_#0f172a]' : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-100'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={reset} className="px-6 py-4 bg-white border-4 border-slate-900 text-slate-900 font-black shadow-[4px_4px_0px_#0f172a] hover:bg-slate-100 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] uppercase tracking-widest">← Back</button>
              <button onClick={startTopicQuiz} disabled={!selectedTopic} className="flex-1 py-4 bg-yellow-300 border-4 border-slate-900 text-slate-900 font-black shadow-[4px_4px_0px_#0f172a] hover:bg-yellow-400 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-50 uppercase tracking-widest">
                Start Quiz on "{selectedTopic}"
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {phase === 'loading' && (() => {
          const questionsPerTopic = 5;
          const currentTopicQ = (streamContent.match(/"question"\s*:/g) || []).length;
          const activeIdx = mode === 'deep' ? deepLoadingInfo.activeIndex : 0;
          const totalTopics = mode === 'deep' ? 4 : 1;

          const totalCurrent = (activeIdx * questionsPerTopic) + Math.min(currentTopicQ, questionsPerTopic);
          const totalMax = totalTopics * questionsPerTopic;
          const masterProgress = Math.min(100, Math.round((totalCurrent / totalMax) * 100));

          return (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto py-8 text-center border-4 border-slate-900 bg-white shadow-[12px_12px_0px_#0f172a] p-12">
              <div className="flex items-center gap-6 mb-10">
                 <div className="w-20 h-20 bg-indigo-500 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center shrink-0">
                    <Loader className="w-12 h-12 text-white animate-spin stroke-[3px]" />
                 </div>
                 <div className="text-left">
                    <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">System Assessment</h3>
                    <p className="font-bold text-slate-900 bg-yellow-300 border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-block uppercase tracking-widest text-xs mt-1">Synchronizing neural pathways...</p>
                 </div>
              </div>

              {/* Master Progress */}
              <div className="w-full mb-12">
                <div className="flex justify-between items-end mb-3">
                   <div className="text-left">
                      <span className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-1">Global Mission Progress</span>
                      <span className="text-2xl font-black text-slate-900">{masterProgress}% COMPLETE</span>
                   </div>
                   <div className="text-right text-xs font-black uppercase tracking-widest text-slate-900">
                      Step {totalCurrent} / {totalMax}
                   </div>
                </div>
                <div className="w-full bg-slate-100 border-4 border-slate-900 h-10 shadow-[6px_6px_0px_#0f172a] overflow-hidden p-1">
                   <motion.div 
                     className="bg-indigo-500 h-full border-2 border-slate-900 shadow-[inset_-4px_0_0_rgba(0,0,0,0.1)]" 
                     animate={{ width: `${masterProgress}%` }} 
                     transition={{ duration: 0.3 }}
                   />
                </div>
              </div>

              {/* Individual Topic Progress (Deep Mode Only) */}
              {mode === 'deep' && (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                   {deepLoadingInfo.topics.map((topic, i) => {
                      let progress = 0;
                      if (i < activeIdx) progress = 100;
                      else if (i === activeIdx) progress = Math.min(100, Math.round((currentTopicQ / questionsPerTopic) * 100));
                      
                      const isActive = i === activeIdx;
                      const isDone = i < activeIdx;

                      return (
                        <div key={i} className={`p-4 border-4 transition-all ${isActive ? 'bg-white border-slate-900 shadow-[4px_4px_0px_#0f172a]' : isDone ? 'bg-lime-50 border-slate-900 opacity-80' : 'bg-slate-50 border-slate-300 opacity-60'}`}>
                           <div className="flex justify-between mb-2 gap-4">
                              <span className="text-[10px] font-black uppercase tracking-widest truncate text-left">{topic}</span>
                              <span className="text-[10px] font-black">{progress}%</span>
                           </div>
                           <div className="w-full h-3 bg-white border-2 border-slate-900 overflow-hidden">
                              <motion.div 
                                className={`h-full ${isDone ? 'bg-lime-400' : isActive ? 'bg-indigo-400' : 'bg-slate-200'}`}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                           </div>
                        </div>
                      );
                   })}
                </div>
              )}

              {abortController && (
                 <button onClick={cancelGeneration} className="px-8 py-4 bg-red-400 text-slate-900 font-black border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] hover:bg-red-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none self-center uppercase tracking-widest text-xs flex items-center gap-3">
                   <XCircle className="w-5 h-5 stroke-[3px]" /> Emergency Abort
                 </button>
              )}
            </motion.div>
          );
        })()}

        {/* Active Quiz */}
        {phase === 'quiz' && questions.length > 0 && (
          <motion.div 
            key="quiz" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }} 
            className={`w-full mx-auto ${mode === 'survival' || mode === 'zen' ? 'max-w-6xl' : 'max-w-2xl'}`}
          >
            <div className={`flex flex-col ${(mode === 'survival' || mode === 'zen') ? 'lg:flex-row gap-8 lg:gap-12 items-start' : ''}`}>
              
              {/* 3D Game Area for Zen Mode (Left Sidebar) */}
              {mode === 'zen' && (
                <div className="w-full lg:flex-[3] shrink-0 sticky lg:top-4 border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] overflow-hidden">
                  <div className="relative h-[400px] lg:h-[600px]">
                    <ArcheryGame 
                      active={zenState.active}
                      shotKey={Math.floor(currentQ / 3)} // Changes every 3 questions
                      currentQIndex={currentQ % 3}
                      isPaused={zenState.isPaused}
                      wrongCount={zenState.wrongInCurrentShot}
                      onShotEvent={(e) => {
                        if (e === 'paused') {
                           setZenState(prev => ({ ...prev, isPaused: true }));
                           setZenTimer(5);
                           setZenTimerActive(true); // Start the 5s timer
                        }
                        if (e === 'hit') {
                           // Hit target, trigger the result overlay
                           setZenState(prev => ({ ...prev, waitingForImpact: true }));
                           handleZenImpact(true);
                        }
                      }}
                    />
                    
                    {/* Impact Result Overlay */}
                    <AnimatePresence>
                      {zenState.impactResult && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1, y: -20 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                        >
                           <div className={`text-6xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] ${
                             zenState.impactResult === 'miss' ? 'text-red-500' : 
                             zenState.impactResult === 'deviation' ? 'text-yellow-400' : 'text-emerald-400'
                           }`}>
                             {zenState.impactResult === 'miss' ? 'MISS!' : 
                              zenState.impactResult === 'deviation' ? 'OFF CENTER' : 'BULLSEYE!'}
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Main Quiz Area (Right for Zen, Left for Survival/Normal) */}
              <div className={`flex-1 w-full min-w-0 ${mode === 'zen' ? 'lg:flex-[2]' : ''}`}>

                {/* Question Info (Only show if arrow is paused) */}
                {(mode !== 'zen' || zenState.isPaused) && !zenState.waitingForImpact && (
                  <div className="flex flex-col">
                    {/* Top Bar with Timer for Survival and Zen */}
                    <div className="flex justify-between items-center bg-slate-100 p-4 border-b-4 border-slate-900">
                      <div>
                        {mode === 'survival' ? (
                          <div className="flex gap-2 items-center text-sm font-bold text-slate-500 uppercase">
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Lives: {lives}/3
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-slate-500 uppercase">
                            Q{currentQ + 1}/{questions.length} - <span className="text-indigo-600">{questions[currentQ]?.topic || 'General'}</span>
                          </div>
                        )}
                      </div>
                      
                      {(mode === 'survival' || mode === 'zen') && (
                        <div className="flex items-center gap-3">
                          <Timer className={`w-5 h-5 ${
                            (mode === 'survival' && survivalTimer <= 3) || (mode === 'zen' && zenTimer <= 5) 
                            ? 'text-red-500 animate-pulse' 
                            : 'text-slate-600'
                          }`} />
                          <div className={`text-2xl font-black tabular-nums tracking-tighter ${
                            (mode === 'survival' && survivalTimer <= 3) || (mode === 'zen' && zenTimer <= 5)
                              ? 'text-red-500' 
                              : 'text-slate-800'
                          }`}>
                            {mode === 'zen' ? zenTimer : survivalTimer}s
                          </div>
                          {mode === 'zen' && (
                            <div className="ml-4 pl-4 border-l-2 border-slate-300">
                              <span className="text-xs font-bold text-slate-500 uppercase">Focus Time</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest border-2 border-slate-900 bg-white px-2 py-1 shadow-[2px_2px_0px_#0f172a]">
                          Question {currentQ + 1} of {questions.length}
                        </span>
                        {mode === 'survival' && (
                           <span className="text-xs font-black text-white uppercase tracking-widest border-2 border-slate-900 bg-red-500 px-2 py-1 shadow-[2px_2px_0px_#0f172a] animate-pulse">
                             URGENT: SAVE HIM
                           </span>
                        )}
                        {mode === 'zen' && (
                           <span className="text-xs font-black text-white uppercase tracking-widest border-2 border-slate-900 bg-indigo-500 px-2 py-1 shadow-[2px_2px_0px_#0f172a]">
                             NEURAL SYNC: {questions[currentQ].topic || 'General'}
                           </span>
                        )}
                      </div>
                      <span className="text-lg font-black text-slate-900">{Math.round(((currentQ) / questions.length) * 100)}%</span>
                    </div>
                    
                    <div className="w-full h-4 bg-white border-4 border-slate-900 shadow-[2px_2px_0px_#0f172a] mb-6 overflow-hidden">
                      <motion.div
                        animate={{ width: `${((currentQ) / questions.length) * 100}%` }}
                        className="h-full bg-emerald-400 border-r-4 border-slate-900"
                        transition={{ duration: 0.4 }}
                      />
                    </div>

                    {mode === 'survival' && !answeredCurrent && (
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-black uppercase text-red-600">Time Running Out!</span>
                           <span className="text-xs font-black uppercase">{survivalTimer}s</span>
                        </div>
                        <div className="w-full h-3 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] overflow-hidden">
                           <motion.div 
                             initial={{ width: '100%' }}
                             animate={{ width: `${(survivalTimer / 10) * 100}%` }}
                             className={`h-full ${survivalTimer < 4 ? 'bg-red-500' : 'bg-yellow-400'}`}
                             transition={{ duration: 1, ease: 'linear' }}
                           />
                        </div>
                      </div>
                    )}

                    <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-8">
                      <QuizQuestion
                        question={questions[currentQ].question || questions[currentQ].text}
                        options={questions[currentQ].options}
                        onAnswer={handleAnswer}
                        answered={answeredCurrent}
                        selected={selectedOption}
                        correct={questions[currentQ].answer || questions[currentQ].correct}
                        onHelp={onContextHelp}
                      />
                      
                      {/* Next Button Removed - Auto advances after showing result */}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Hangman Sidebar */}
              {mode === 'survival' && (
                <div className="w-full lg:w-[320px] shrink-0 sticky top-0">
                   <div className="mb-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] p-2 text-center border-b-4 border-indigo-500">
                     Neural Destabilization Visualizer
                   </div>
                   <HangmanVisual lives={lives} />
                   
                   <div className="mt-8 p-4 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a]">
                      <h4 className="font-black text-slate-900 uppercase text-xs mb-2 border-b-2 border-slate-900 pb-1">Status Report</h4>
                      <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase">
                        Subject's digital integrity is tied to your response speed and accuracy. 
                        {lives === 3 ? " Integrity is holding." : lives === 2 ? " Warning: Initial link breach detected." : " Critical: Neural cascade imminent!"}
                      </p>
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <ResultsScreen
              results={answers}
              mode={mode}
              onRetry={reset}
              onSave={saveResults}
              isSaving={isSaving}
              timeSpent={sessionTime}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
