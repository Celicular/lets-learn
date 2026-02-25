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
          className="absolute inset-0 bg-white border-4 border-slate-900 p-6 flex flex-col justify-between shadow-[8px_8px_0px_#0f172a]"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 w-fit">Question</div>
          <p className="text-slate-900 font-black text-lg leading-snug flex-1 flex items-center mt-3">{question}</p>
          <div className="text-xs text-slate-900 font-bold mt-2 uppercase tracking-tight">Tap to reveal answer →</div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-indigo-400 border-4 border-slate-900 p-6 flex flex-col justify-between shadow-[8px_8px_0px_#0f172a]"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 w-fit">Answer</div>
          <p className="text-slate-900 font-black text-lg leading-snug flex-1 flex items-center mt-3">{answer}</p>
          <div className="text-xs text-slate-900 font-bold mt-2 uppercase tracking-tight">← Tap to flip back</div>
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

export default function FlashcardsView({ activeProj, setIsBusy }) {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topic, setTopic] = useState('all');
  const [count, setCount] = useState(8);
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid');
  const [focusIdx, setFocusIdx] = useState(0);
  const [streamContent, setStreamContent] = useState('');
  const [availableTopics, setAvailableTopics] = useState([]);
  const [abortController, setAbortController] = useState(null);

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
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);
    
    try {
      const res = await fetch(`http://localhost:8000/projects/${activeProj}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, topic }),
        signal: controller.signal
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
      if (err.name === 'AbortError') {
         setError('Flashcard generation cancelled.');
      } else {
         setError('Failed to generate flashcards.');
         console.error(err);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
    }
  };

  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      if (setIsBusy) setIsBusy(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto bg-[#e6ebf5]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Flashcards</h1>
          <p className="text-slate-900 font-bold bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-block">AI-generated Q&A cards from your documents.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Controls */}
          <div className="flex items-center bg-white border-4 border-slate-900 px-4 py-3 shadow-[4px_4px_0px_#0f172a]">
            <label className="text-xs font-black text-slate-900 mr-3 uppercase tracking-widest">Target</label>
            <select value={topic} onChange={e => setTopic(e.target.value)} className="w-32 max-w-[12rem] text-sm font-black text-slate-900 bg-transparent focus:outline-none truncate uppercase tracking-widest">
              <option value="all">All Topics</option>
              {availableTopics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center bg-white border-4 border-slate-900 px-4 py-3 shadow-[4px_4px_0px_#0f172a]">
            <label className="text-xs font-black text-slate-900 mr-3 uppercase tracking-widest">Count</label>
            <select value={count} onChange={e => setCount(Number(e.target.value))} className="text-sm font-black text-slate-900 bg-transparent focus:outline-none">
              {[4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={isLoading || !activeProj}
            className="flex items-center gap-2 px-6 py-3.5 bg-yellow-300 text-slate-900 font-black border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] hover:bg-yellow-400 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] uppercase tracking-widest disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-5 h-5 animate-spin stroke-[3px]" /> : <Layers className="w-5 h-5 stroke-[3px]" />}
            {isLoading ? 'Generating...' : cards.length ? 'Regenerate' : 'Generate Cards'}
          </button>
        </div>
      </div>

      {/* View toggle */}
      {cards.length > 0 && (
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('grid')} className={`px-5 py-2 font-black text-sm uppercase tracking-widest transition-all ${view === 'grid' ? 'bg-indigo-400 border-4 border-slate-900 text-slate-900 shadow-[0px_0px_0px_#0f172a] translate-x-[2px] translate-y-[2px]' : 'bg-white border-4 border-slate-900 text-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]'}`}>Grid</button>
          <button onClick={() => { setView('focus'); setFocusIdx(0); }} className={`px-5 py-2 font-black text-sm uppercase tracking-widest transition-all ${view === 'focus' ? 'bg-indigo-400 border-4 border-slate-900 text-slate-900 shadow-[0px_0px_0px_#0f172a] translate-x-[2px] translate-y-[2px]' : 'bg-white border-4 border-slate-900 text-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]'}`}>Focus Mode</button>
        </div>
      )}

      {error && <div className="p-4 bg-red-300 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] text-slate-900 font-black uppercase tracking-widest mb-6">{error}</div>}

      {/* Empty state & Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-3xl mx-auto py-8">
          <Loader className="w-16 h-16 text-slate-900 animate-spin mb-6 stroke-[3px]" />
          <h3 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tight">Generating Flashcards</h3>
          <p className="text-slate-900 font-bold mb-10 bg-white border-2 border-slate-900 px-4 py-2 shadow-[4px_4px_0px_#0f172a]">AI is extracting facts from your documents...</p>
          
          {/* Abstract Progress Bar */}
          <div className="w-full max-w-md mx-auto">
            <div className="w-full bg-slate-100 border-4 border-slate-900 h-6 mb-4 shadow-[4px_4px_0px_#0f172a] overflow-hidden">
              <motion.div 
                className="bg-indigo-400 border-r-4 border-slate-900 h-full" 
                animate={{ width: `${Math.min(100, Math.round(((streamContent.match(/Q\s*:/g) || []).length / count) * 100))}%` }} 
                transition={{ duration: 0.3, ease: 'easeOut' }} 
              />
            </div>
            <div className="text-sm font-black text-slate-900 text-center animate-pulse mb-8 uppercase tracking-widest">
              Generated {(streamContent.match(/Q\s*:/g) || []).length} of {count} flashcards...
            </div>
          </div>
          {abortController && (
             <button onClick={cancelGeneration} className="px-6 py-3 bg-red-400 text-slate-900 font-black border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-red-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] self-center uppercase tracking-widest">
               Cancel Generation
             </button>
          )}
        </div>
      )}

      {!isLoading && cards.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-white border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[6px_6px_0px_#0f172a]">
            <Layers className="w-12 h-12 text-slate-900 stroke-[2px]" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Flashcards Yet</h3>
          <p className="text-slate-900 bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_#0f172a] max-w-md font-bold">Click "Generate Cards" to create AI flashcards from your documents.</p>
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
          <div className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b-4 border-slate-900 pb-1">{focusIdx + 1} / {cards.length}</div>
          <div className="w-full max-w-lg mb-10">
            <FlipCard question={cards[focusIdx].question} answer={cards[focusIdx].answer} />
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setFocusIdx(i => Math.max(0, i - 1))} disabled={focusIdx === 0} className="p-4 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] hover:bg-slate-100 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-40">
              <ChevronLeft className="w-6 h-6 text-slate-900 stroke-[3px]" />
            </button>
            <button onClick={() => setFocusIdx(i => Math.min(cards.length - 1, i + 1))} disabled={focusIdx === cards.length - 1} className="p-4 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] hover:bg-slate-100 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-40">
              <ChevronRight className="w-6 h-6 text-slate-900 stroke-[3px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
