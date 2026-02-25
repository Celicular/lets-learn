import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Loader, ArrowLeft, Target, FileText, ChevronRight } from 'lucide-react';

const TOPIC_COLORS = [
  'from-violet-500 to-indigo-500',
  'from-indigo-500 to-blue-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-fuchsia-500 to-purple-500',
  'from-sky-500 to-indigo-500',
  'from-lime-500 to-green-500',
  'from-red-500 to-pink-500',
];

export default function TopicsView({ activeProj, onSelectTopic }) {
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [streamContent, setStreamContent] = useState('');
  const [notesCache, setNotesCache] = useState({});
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  const extractTopics = async () => {
    if (!activeProj) return;
    setIsLoading(true);
    setError(null);
    setTopics([]);
    
    try {
      const res = await fetch(`http://localhost:8000/projects/${activeProj}/topics`);
      if (!res.ok) throw new Error('Failed to fetch topics');
      
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
      
      const arrayMatch = raw.match(/\[[\s\S]*\]/);
      if (!arrayMatch) throw new Error('No valid JSON array found in response.');
      const parsed = JSON.parse(arrayMatch[0]);
      setTopics(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      setError('Failed to extract topics. Make sure documents are uploaded and the server is running.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (topic) => {
    setSelected(topic);
    setStreamContent('');
  };

  const generateNotes = async (topic) => {
    if (!activeProj || notesCache[topic]) return;
    setIsGeneratingNotes(true);
    setError(null);
    setStreamContent('');
    
    try {
      const res = await fetch(`http://localhost:8000/projects/${activeProj}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (!res.ok) throw new Error('Failed to generate notes');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let raw = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        raw += chunk;
        setStreamContent(raw);
      }
      
      setNotesCache(prev => ({ ...prev, [topic]: raw }));
    } catch (err) {
      setError('Failed to generate notes.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">Key Topics</h1>
          <p className="text-slate-500 font-medium">Extract major concepts from your uploaded documents.</p>
        </div>
        <button
          onClick={extractTopics}
          disabled={isLoading || !activeProj}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isLoading ? 'Analysing...' : topics.length ? 'Refresh Topics' : 'Extract Topics'}
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-3xl mx-auto py-8">
          <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">Analyzing Documents</h3>
          <p className="text-slate-500 font-medium mb-8">AI is extracting key topics...</p>
          
          {/* Abstract Progress Bar */}
          <div className="w-full max-w-md mx-auto">
            <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
              <motion.div 
                className="bg-indigo-500 h-full rounded-full" 
                animate={{ width: `${Math.min(100, Math.round(((streamContent.match(/"/g) || []).length / 2 / 8) * 100))}%` }} 
                transition={{ duration: 0.3, ease: 'easeOut' }} 
              />
            </div>
            <div className="text-sm font-bold text-slate-500 text-center animate-pulse">
              Extracting concepts... ({Math.floor((streamContent.match(/"/g) || []).length / 2)} found)
            </div>
          </div>
        </div>
      )}

      {!isLoading && topics.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-indigo-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">No Topics Yet</h3>
          <p className="text-slate-500 max-w-md font-medium">
            Click "Extract Topics" to let the AI scan your documents and identify the most important concepts.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Topics Dynamic View */}
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key="topic-details"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col h-full bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden"
          >
            <div className={`p-8 bg-gradient-to-br ${TOPIC_COLORS[topics.indexOf(selected) % TOPIC_COLORS.length] || TOPIC_COLORS[0]} text-white shrink-0`}>
              <button 
                onClick={() => setSelected(null)} 
                className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors mb-4 bg-black/10 px-3 py-1.5 rounded-xl hover:bg-black/20 w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Topics
              </button>
              <h2 className="text-3xl font-black mb-2">{selected}</h2>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => onSelectTopic?.(selected)}
                  className="flex items-center gap-2 bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-black/10 hover:shadow-xl transition-all hover:scale-105"
                >
                  <Target className="w-4 h-4" /> Start Quiz
                </button>
                {!notesCache[selected] && (
                  <button
                    onClick={() => generateNotes(selected)}
                    disabled={isGeneratingNotes}
                    className="flex items-center gap-2 bg-black/20 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black/30 transition-all disabled:opacity-50"
                  >
                    {isGeneratingNotes ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {isGeneratingNotes ? 'Generating...' : 'Generate Study Notes'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
              {isGeneratingNotes ? (
                <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center">
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden shadow-inner">
                    <motion.div 
                      className="bg-indigo-500 h-full rounded-full" 
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(100, (streamContent.length / 500) * 100)}%` }} 
                      transition={{ duration: 0.3, ease: 'easeOut' }} 
                    />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 mb-2 mt-4 text-center w-full">Writing Study Guide...</h3>
                  <div className="w-full bg-slate-900 rounded-2xl p-6 text-emerald-400 font-mono text-xs text-left shadow-inner flex flex-col-reverse h-[400px] overflow-y-auto mt-4">
                    <div className="whitespace-pre-wrap">{streamContent}</div>
                  </div>
                </div>
              ) : notesCache[selected] ? (
                <div className="max-w-4xl mx-auto prose prose-slate prose-indigo prose-headings:text-indigo-900 prose-a:text-indigo-600 prose-strong:text-indigo-800 prose-ul:list-disc prose-ul:pl-4 prose-p:leading-relaxed prose-h3:mt-8 prose-h3:mb-4 pb-12">
                  <ReactMarkdown>{notesCache[selected]}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <FileText className="w-16 h-16 text-slate-200 mb-4" />
                  <h3 className="text-xl font-bold text-slate-400 mb-2">No Notes Generated</h3>
                  <p className="text-slate-500">Click the button above to generate a comprehensive study guide for this topic.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : topics.length > 0 ? (
          <motion.div
            key="topic-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {topics.map((topic, i) => (
              <motion.button
                key={topic}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelect(topic)}
                className={`relative overflow-hidden group p-6 rounded-3xl bg-gradient-to-br ${TOPIC_COLORS[i % TOPIC_COLORS.length]} text-white text-left shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
              >
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full" />
                <div className="absolute -right-1 -top-6 w-14 h-14 bg-white/10 rounded-full" />
                <div className="font-black text-lg leading-tight mb-3">{topic}</div>
                <div className="text-white/70 text-xs font-bold uppercase tracking-wider flex items-center gap-1 group-hover:text-white transition-colors">
                  View Topic Details <ChevronRight className="w-3 h-3" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
