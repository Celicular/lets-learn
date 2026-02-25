import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Loader, CheckCircle, XCircle, Trophy, BarChart2, Shuffle, BookOpen, ArrowRight, RotateCcw } from 'lucide-react';

const API = 'http://localhost:8000';

async function fetchQuiz(projectName, count = 5, topic = 'all', onProgress) {
  const res = await fetch(`${API}/projects/${projectName}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, fmt: 'json', topic })
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

async function fetchTopics(projectName, onProgress) {
  const res = await fetch(`${API}/projects/${projectName}/topics`);
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
      <h3 className="text-lg font-extrabold text-slate-900 mb-6 leading-snug">{question}</h3>
      <div className="space-y-3">
        {options.map((opt, i) => {
          let style = 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50';
          if (answered) {
            if (opt === correct) style = 'border-emerald-500 bg-emerald-50 text-emerald-800';
            else if (opt === selected && opt !== correct) style = 'border-red-400 bg-red-50 text-red-800';
          }
          return (
            <button
              key={i}
              onClick={() => !answered && onAnswer(opt)}
              disabled={answered}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${style} disabled:cursor-default`}
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
  const scoreColor = pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';
  
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center mb-6">
        <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <div className={`text-6xl font-black mb-2 ${scoreColor}`}>{pct}%</div>
        <div className="text-slate-500 font-medium mb-4">{correct} of {results.length} correct</div>
        <div className={`inline-block px-4 py-1.5 rounded-full font-black text-sm ${pct >= 70 ? 'bg-emerald-100 text-emerald-700' : pct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {pct >= 70 ? '🎉 Strong Performance' : pct >= 40 ? '📚 Keep Studying' : '❌ Needs Improvement'}
        </div>
      </div>

      {/* Topic breakdown for deep mode */}
      {mode === 'deep' && Object.keys(byTopic).length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
          <h3 className="font-extrabold text-slate-900 mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-500" /> Topic Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(byTopic).map(([topic, data]) => {
              const tPct = Math.round((data.correct / data.total) * 100);
              const barColor = tPct >= 70 ? 'bg-emerald-500' : tPct >= 40 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={topic}>
                  <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>{topic}</span>
                    <span className={tPct >= 70 ? 'text-emerald-600' : tPct >= 40 ? 'text-amber-600' : 'text-red-600'}>{tPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${tPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} className={`h-full rounded-full ${barColor}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wrong answers review */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        <h3 className="font-extrabold text-slate-900 mb-4">Answer Review</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl ${r.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {r.isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
              <div>
                <div className="text-sm font-bold text-slate-800">{r.question}</div>
                {!r.isCorrect && (
                  <div className="text-xs font-medium text-slate-500 mt-0.5">
                    <span className="text-red-500">Your answer:</span> {r.selected} · <span className="text-emerald-600">Correct:</span> {r.correct}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors">
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
        <button onClick={onSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors disabled:opacity-60">
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Results'}
        </button>
      </div>
    </motion.div>
  );
}

// --- Main Quiz View ---
export default function QuizView({ activeProj, onResultSaved }) {
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

  const startQuick = async () => {
    setMode('quick');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    try {
      const qs = await fetchQuiz(activeProj, 5, 'all', setStreamContent);
      setQuestions(qs.map(q => ({ ...q, topic: 'all' })));
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setPhase('quiz');
    } catch (err) {
      setError('Failed to generate quiz. Is the server running?');
      setPhase('select');
    }
  };

  const startTargeted = async () => {
    setMode('targeted');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    try {
      const topics = await fetchTopics(activeProj, setStreamContent);
      setAvailableTopics(topics);
      setPhase('topic-pick');
    } catch (err) {
      setError('Failed to fetch topics.');
      setPhase('select');
    }
  };

  const startDeep = async () => {
    setMode('deep');
    setPhase('loading');
    setError(null);
    setStreamContent('');
    try {
      const allTopics = await fetchTopics(activeProj, setStreamContent);
      const shuffled = [...allTopics].sort(() => Math.random() - 0.5).slice(0, 4);
      
      const results = [];
      for (const t of shuffled) {
        setStreamContent(`[DEEP ASSESSMENT] Initialising generator for topic: ${t}\n\n`);
        const qs = await fetchQuiz(activeProj, 3, t, (raw) => setStreamContent(raw));
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
      setError('Failed to generate deep assessment.');
      setPhase('select');
    }
  };

  const startTopicQuiz = async () => {
    if (!selectedTopic) return;
    setPhase('loading');
    setStreamContent('');
    try {
      const qs = await fetchQuiz(activeProj, 5, selectedTopic, setStreamContent);
      setQuestions(qs.map(q => ({ ...q, topic: selectedTopic })));
      setCurrentQ(0);
      setAnswers([]);
      setAnsweredCurrent(false);
      setSelectedOption(null);
      setPhase('quiz');
    } catch (err) {
      setError('Failed to generate quiz.');
      setPhase('select');
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
    try {
      // Simulate slight network delay for UI UX to register "saving"
      await new Promise(r => setTimeout(r, 600)); 
      onResultSaved?.({ mode, score: correct, total: answers.length, percentage: pct, breakdown: byTopic, timestamp: new Date().toISOString(), project: activeProj });
    } catch (err) {
      console.error('Failed to save results', err);
    } finally {
      setIsSaving(false);
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
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 mb-1">Adaptive Quiz</h1>
        <p className="text-slate-500 font-medium">Test your knowledge with AI-generated questions from your documents.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-medium mb-6">{error}</div>}

      <AnimatePresence mode="wait">
        {/* Mode Selection */}
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl">
            {[
              {
                id: 'quick', icon: <Target className="w-8 h-8" />, color: 'from-indigo-500 to-blue-500',
                title: 'Quick Quiz', desc: 'Random questions from all your documents. No ranking, just a fast knowledge check.',
                badge: 'Unranked', onClick: startQuick
              },
              {
                id: 'targeted', icon: <BookOpen className="w-8 h-8" />, color: 'from-violet-500 to-purple-500',
                title: 'Topic Quiz', desc: 'Choose a specific topic and receive a focused quiz. Get ranked scores per topic.',
                badge: 'Ranked by Topic', onClick: startTargeted
              },
              {
                id: 'deep', icon: <Shuffle className="w-8 h-8" />, color: 'from-rose-500 to-pink-500',
                title: 'Deep Assessment', desc: 'The AI picks 3-4 random topics and creates a comprehensive multi-topic exam.',
                badge: 'Full Breakdown', onClick: startDeep
              }
            ].map(item => (
              <motion.button
                key={item.id}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={item.onClick}
                disabled={!activeProj}
                className={`text-left p-7 rounded-3xl bg-gradient-to-br ${item.color} text-white shadow-xl relative overflow-hidden group disabled:opacity-50 disabled:pointer-events-none transition-all`}
              >
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full" />
                <div className="mb-5 opacity-90">{item.icon}</div>
                <div className="font-black text-xl mb-2">{item.title}</div>
                <div className="text-white/80 text-sm font-medium leading-snug mb-5">{item.desc}</div>
                <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black backdrop-blur-sm">
                  {item.badge}
                </div>
                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Topic selection for targeted quiz */}
        {phase === 'topic-pick' && (
          <motion.div key="topic-pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl">
            <h3 className="font-extrabold text-slate-800 text-xl mb-4">Select a Topic</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {availableTopics.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTopic(t)}
                  className={`px-4 py-3 rounded-2xl border-2 text-sm font-bold text-left transition-all ${selectedTopic === t ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="px-5 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors">← Back</button>
              <button onClick={startTopicQuiz} disabled={!selectedTopic} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors disabled:opacity-50">
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
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl mx-auto py-8 text-center">
              <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Generating Quiz</h3>
              <p className="font-medium text-slate-500 mb-8">Reading documents and preparing your assessment...</p>
              
              {/* Abstract Progress Bar */}
              <div className="w-full max-w-md mx-auto">
                <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                  <motion.div 
                    className="bg-indigo-500 h-full rounded-full" 
                    animate={{ width: `${progress}%` }} 
                    transition={{ duration: 0.3, ease: 'easeOut' }} 
                  />
                </div>
                <div className="text-sm font-bold text-slate-500 text-center animate-pulse">
                  {label}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Active Quiz */}
        {phase === 'quiz' && questions.length > 0 && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl w-full">
            {/* Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Question {currentQ + 1} of {questions.length}
                {questions[currentQ]?.topic && questions[currentQ].topic !== 'all' && (
                  <span className="ml-2 text-indigo-500">· {questions[currentQ].topic}</span>
                )}
              </span>
              <span className="text-xs font-black text-slate-400">{Math.round(((currentQ) / questions.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full mb-8">
              <motion.div
                animate={{ width: `${((currentQ) / questions.length) * 100}%` }}
                className="h-full bg-indigo-600 rounded-full"
                transition={{ duration: 0.4 }}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
              <QuizQuestion
                question={questions[currentQ].question}
                options={questions[currentQ].options}
                onAnswer={handleAnswer}
                answered={answeredCurrent}
                selected={selectedOption}
                correct={questions[currentQ].answer}
              />
              
              {answeredCurrent && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex justify-end">
                  <button onClick={handleNext} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all hover:-translate-y-0.5">
                    {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'} <ArrowRight className="w-4 h-4" />
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
