import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Loader, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

function FlipCard({ question, answer }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full h-52 cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full h-full relative"
      >
        {/* Front */}
        <div
          className="absolute inset-0 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-sm"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-xs font-black text-indigo-400 uppercase tracking-wider">Question</div>
          <p className="text-slate-800 font-bold text-base leading-snug flex-1 flex items-center mt-3">{question}</p>
          <div className="text-xs text-slate-400 font-medium mt-2">Tap to reveal answer →</div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 flex flex-col justify-between shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-xs font-black text-indigo-200 uppercase tracking-wider">Answer</div>
          <p className="text-white font-bold text-base leading-snug flex-1 flex items-center mt-3">{answer}</p>
          <div className="text-xs text-indigo-200 font-medium mt-2">← Tap to flip back</div>
        </div>
      </motion.div>
    </div>
  );
}

function parseFlashcards(raw) {
  const cards = [];
  const blocks = raw.split(/\n\n+/);
  for (const block of blocks) {
    const qMatch = block.match(/Q:\s*(.+)/i);
    const aMatch = block.match(/A:\s*([\s\S]+)/i);
    if (qMatch && aMatch) {
      cards.push({ question: qMatch[1].trim(), answer: aMatch[1].trim() });
    }
  }
  return cards;
}

export default function FlashcardsView({ activeProj }) {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topic, setTopic] = useState('all');
  const [count, setCount] = useState(8);
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid');
  const [focusIdx, setFocusIdx] = useState(0);
  const [streamContent, setStreamContent] = useState('');
  const [availableTopics, setAvailableTopics] = useState([]);

  useEffect(() => {
    if (activeProj) {
      fetch(`http://localhost:8000/projects/${activeProj}/topics`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableTopics(data);
        })
        .catch(err => console.error('Failed to pre-fetch topics for flashcards', err));
    }
  }, [activeProj]);

  const generate = async () => {
    if (!activeProj) return;
    setIsLoading(true);
    setError(null);
    setCards([]);
    
    try {
      const res = await fetch(`http://localhost:8000/projects/${activeProj}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, topic })
      });
      if (!res.ok) throw new Error('Server error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let raw = '';

      setStreamContent('');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        raw += chunk;
        setStreamContent(raw);
      }

      const parsed = parseFlashcards(raw);
      if (parsed.length === 0) throw new Error('Could not parse flashcards from response');
      setCards(parsed);
    } catch (err) {
      setError('Failed to generate flashcards.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">Flashcards</h1>
          <p className="text-slate-500 font-medium">AI-generated Q&A cards from your documents.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Controls */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
            <label className="text-xs font-black text-slate-400">Target</label>
            <select value={topic} onChange={e => setTopic(e.target.value)} className="w-32 max-w-[12rem] text-sm font-bold text-slate-700 bg-transparent focus:outline-none truncate">
              <option value="all">All Topics</option>
              {availableTopics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
            <label className="text-xs font-black text-slate-400">Count</label>
            <select value={count} onChange={e => setCount(Number(e.target.value))} className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none">
              {[4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={isLoading || !activeProj}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            {isLoading ? 'Generating...' : cards.length ? 'Regenerate' : 'Generate Cards'}
          </button>
        </div>
      </div>

      {/* View toggle */}
      {cards.length > 0 && (
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => setView('grid')} className={`px-4 py-1.5 rounded-xl font-bold text-sm transition-all ${view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Grid</button>
          <button onClick={() => { setView('focus'); setFocusIdx(0); }} className={`px-4 py-1.5 rounded-xl font-bold text-sm transition-all ${view === 'focus' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Focus Mode</button>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-medium mb-4">{error}</div>}

      {/* Empty state & Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-3xl mx-auto py-8">
          <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">Generating Flashcards</h3>
          <p className="text-slate-500 font-medium mb-8">AI is extracting facts from your documents...</p>
          
          {/* Abstract Progress Bar */}
          <div className="w-full max-w-md mx-auto">
            <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
              <motion.div 
                className="bg-indigo-500 h-full rounded-full" 
                animate={{ width: `${Math.min(100, Math.round(((streamContent.match(/Q\s*:/g) || []).length / count) * 100))}%` }} 
                transition={{ duration: 0.3, ease: 'easeOut' }} 
              />
            </div>
            <div className="text-sm font-bold text-slate-500 text-center animate-pulse">
              Generated {(streamContent.match(/Q\s*:/g) || []).length} of {count} flashcards...
            </div>
          </div>
        </div>
      )}

      {!isLoading && cards.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6">
            <Layers className="w-12 h-12 text-purple-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">No Flashcards Yet</h3>
          <p className="text-slate-500 max-w-md font-medium">Click "Generate Cards" to create AI flashcards from your documents.</p>
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' && cards.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {cards.map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <FlipCard question={card.question} answer={card.answer} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Focus View */}
      {view === 'focus' && cards.length > 0 && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">{focusIdx + 1} / {cards.length}</div>
          <div className="w-full max-w-lg mb-8">
            <FlipCard question={cards[focusIdx].question} answer={cards[focusIdx].answer} />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setFocusIdx(i => Math.max(0, i - 1))} disabled={focusIdx === 0} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-40">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={() => setFocusIdx(i => Math.min(cards.length - 1, i + 1))} disabled={focusIdx === cards.length - 1} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-40">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
