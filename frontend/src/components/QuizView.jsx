import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Loader, CheckCircle, XCircle, Trophy, BarChart2, Shuffle, BookOpen, ArrowRight, RotateCcw } from 'lucide-react';

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
  const questions = JSON.parse(arrayMatch[0]);
  // IMPORTANT: first option is always correct — shuffle before display
  return questions.map(q => {
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    return { ...q, options: shuffled };
  });
}

async function fetchTopics(projectName, onProgress, signal) {
  const res = await fetch(`${API}/projects/${projectName}/topics`, { signal });
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

// --- Quiz Question Component ---
function QuizQuestion({ question, options, onAnswer, answered, selected, correct }) {
  return (
    <div className="w-full">
      <h3 className="text-2xl font-black text-slate-900 mb-8 leading-snug uppercase tracking-tight">{question}</h3>
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
              className={`w-full text-left px-5 py-4 border-4 font-black text-lg transition-all ${style} disabled:cursor-default`}
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
function ResultsScreen({ results, mode, onRetry, onSave, isSaving }) {
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto py-8">
      {/* Score card */}
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-8 text-center mb-6">
        <Trophy className="w-16 h-16 text-slate-900 mx-auto mb-4 stroke-[2px]" />
        <div className={`text-7xl font-black mb-2 text-slate-900 tracking-tighter`}>{pct}%</div>
        <div className="text-slate-900 font-bold mb-4 uppercase tracking-widest">{correct} of {results.length} correct</div>
        <div className={`inline-block border-2 border-slate-900 px-4 py-2 font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_#0f172a] ${pct >= 70 ? 'bg-lime-400 text-slate-900' : pct >= 40 ? 'bg-yellow-400 text-slate-900' : 'bg-red-400 text-slate-900'}`}>
          {pct >= 70 ? 'Strong Performance' : pct >= 40 ? 'Keep Studying' : 'Needs Improvement'}
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
          <RotateCcw className="w-5 h-5 stroke-[3px]" /> Retry
        </button>
        <button onClick={onSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-400 text-slate-900 font-black border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-indigo-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-60 text-lg uppercase tracking-widest">
          {isSaving ? <Loader className="w-5 h-5 animate-spin stroke-[3px]" /> : <CheckCircle className="w-5 h-5 stroke-[3px]" />}
          {isSaving ? 'Saving...' : 'Save Results'}
        </button>
      </div>
    </motion.div>
  );
}

// --- Main Quiz View ---
export default function QuizView({ activeProj, onResultSaved, setIsBusy }) {
  const [mode, setMode] = useState(null); // null | quick | targeted | deep
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

  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      if (setIsBusy) setIsBusy(false);
    }
  };

  const startQuick = async () => {
    setMode('quick');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    try {
      const qs = await fetchQuiz(activeProj, 5, 'all', setStreamContent, controller.signal);
      setQuestions(qs.map(q => ({ ...q, topic: 'all' })));
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
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
      const allTopics = await fetchTopics(activeProj, setStreamContent, controller.signal);
      const shuffled = [...allTopics].sort(() => Math.random() - 0.5).slice(0, 4);
      
      const results = [];
      for (const t of shuffled) {
        setStreamContent(`[DEEP ASSESSMENT] Initialising generator for topic: ${t}\n\n`);
        const qs = await fetchQuiz(activeProj, 3, t, (raw) => setStreamContent(raw), controller.signal);
        results.push(qs.map(q => ({ ...q, topic: t })));
      }
      
      const combined = results.flat().sort(() => Math.random() - 0.5);
      setQuestions(combined);
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setPhase('quiz');
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to generate deep assessment.');
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
      const qs = await fetchQuiz(activeProj, 5, selectedTopic, setStreamContent, controller.signal);
      setQuestions(qs.map(q => ({ ...q, topic: selectedTopic })));
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setPhase('quiz');
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to generate quiz.');
      setPhase('select');
    } finally {
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const handleAnswer = (opt) => {
    setSelectedOption(opt);
    setAnsweredCurrent(true);
  };

  const handleNext = () => {
    const q = questions[currentQ];
    const isCorrect = selectedOption === q.answer;
    const newAnswers = [...answers, {
      question: q.question, options: q.options, correct: q.answer,
      selected: selectedOption, isCorrect, topic: q.topic
    }];
    setAnswers(newAnswers);
    
    if (currentQ + 1 < questions.length) {
      setCurrentQ(i => i + 1);
      setAnsweredCurrent(false);
      setSelectedOption(null);
    } else {
      setPhase('results');
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
      onResultSaved?.({ mode, score: correct, total: answers.length, percentage: pct, breakdown: byTopic, timestamp: new Date().toISOString(), project: activeProj });
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
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto bg-[#e6ebf5]">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Adaptive Quiz</h1>
        <p className="text-slate-900 font-bold bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-block">Test your knowledge with AI-generated questions from your documents.</p>
      </div>

      {error && <div className="p-4 bg-red-300 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] text-slate-900 font-black uppercase tracking-widest mb-6">{error}</div>}

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
          const currentQ = (streamContent.match(/"question"\s*:/g) || []).length;
          const totalQ = mode === 'deep' ? 12 : 5;
          const label = mode === 'deep' 
            ? `Generating deep assessment (${Math.min(currentQ, totalQ)}/${totalQ})...` 
            : `Generating questions (${Math.min(currentQ, totalQ)}/${totalQ})...`;
          const progress = Math.min(100, Math.round((currentQ / totalQ) * 100));

          return (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl mx-auto py-8 text-center border-4 border-slate-900 bg-white shadow-[8px_8px_0px_#0f172a] p-12">
              <Loader className="w-16 h-16 text-slate-900 animate-spin mb-6 stroke-[3px]" />
              <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Generating Quiz</h3>
              <p className="font-bold text-slate-900 bg-white border-2 border-slate-900 px-4 py-2 shadow-[2px_2px_0px_#0f172a] mb-10">Reading documents and preparing your assessment...</p>
              
              {/* Abstract Progress Bar */}
              <div className="w-full max-w-md mx-auto">
                <div className="w-full bg-slate-100 border-4 border-slate-900 h-6 mb-4 shadow-[4px_4px_0px_#0f172a] overflow-hidden">
                  <motion.div 
                    className="bg-indigo-400 border-r-4 border-slate-900 h-full" 
                    animate={{ width: `${progress}%` }} 
                    transition={{ duration: 0.3, ease: 'easeOut' }} 
                  />
                </div>
                <div className="text-sm font-black text-slate-900 text-center animate-pulse mb-8 uppercase tracking-widest">
                  {label}
                </div>
              </div>
              {abortController && (
                 <button onClick={cancelGeneration} className="px-6 py-3 bg-red-400 text-slate-900 font-black border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-red-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] self-center uppercase tracking-widest">
                   Cancel Quiz
                 </button>
              )}
            </motion.div>
          );
        })()}

        {/* Active Quiz */}
        {phase === 'quiz' && questions.length > 0 && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl w-full">
            {/* Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest border-2 border-slate-900 bg-white px-2 py-1 shadow-[2px_2px_0px_#0f172a]">
                Question {currentQ + 1} of {questions.length}
                {questions[currentQ]?.topic && questions[currentQ].topic !== 'all' && (
                  <span className="ml-2 text-indigo-600">· {questions[currentQ].topic}</span>
                )}
              </span>
              <span className="text-lg font-black text-slate-900">{Math.round(((currentQ) / questions.length) * 100)}%</span>
            </div>
            <div className="w-full h-4 bg-white border-4 border-slate-900 shadow-[2px_2px_0px_#0f172a] mb-8 overflow-hidden">
              <motion.div
                animate={{ width: `${((currentQ) / questions.length) * 100}%` }}
                className="h-full bg-emerald-400 border-r-4 border-slate-900"
                transition={{ duration: 0.4 }}
              />
            </div>

            <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-8">
              <QuizQuestion
                question={questions[currentQ].question}
                options={questions[currentQ].options}
                onAnswer={handleAnswer}
                answered={answeredCurrent}
                selected={selectedOption}
                correct={questions[currentQ].answer}
              />
              
              {answeredCurrent && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex justify-end">
                  <button onClick={handleNext} className="flex items-center gap-2 px-6 py-3 bg-indigo-400 border-4 border-slate-900 text-slate-900 font-black shadow-[4px_4px_0px_#0f172a] hover:bg-indigo-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] uppercase tracking-widest">
                    {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'} <ArrowRight className="w-5 h-5 stroke-[3px]" />
                  </button>
                </motion.div>
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
