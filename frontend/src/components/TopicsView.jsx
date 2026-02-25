import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Loader, ArrowLeft, Target, FileText, ChevronRight, X, Download } from 'lucide-react';
import { cleanMarkdownTables, printHTMLContent } from '../utils/printUtils';

const TOPIC_COLORS = [
  'bg-violet-300',
  'bg-indigo-300',
  'bg-cyan-300',
  'bg-emerald-300',
  'bg-amber-300',
  'bg-pink-300',
  'bg-fuchsia-300',
  'bg-sky-300',
  'bg-lime-300',
  'bg-red-300',
];

export default function TopicsView({ activeProj, onSelectTopic, setIsBusy }) {
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [streamContent, setStreamContent] = useState('');
  const [notesCache, setNotesCache] = useState({});
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const extractTopics = async () => {
    if (!activeProj) return;
    setIsLoading(true);
    setError(null);
    setTopics([]);
    
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);

    try {
      const res = await fetch(`http://localhost:8000/projects/${activeProj}/topics`, { signal: controller.signal });
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
      if (err.name === 'AbortError') {
        setError('Topic extraction cancelled.');
      } else {
        setError('Failed to extract topics. Make sure documents are uploaded and the server is running.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      if (setIsBusy) setIsBusy(false);
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
    
    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);

    try {
      const res = await fetch(`http://localhost:8000/projects/${activeProj}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
        signal: controller.signal
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
      if (err.name === 'AbortError') {
         setNotesCache(prev => ({ ...prev, [topic]: streamContent + '\n\n**[Generation Cancelled]**' }));
      } else {
         setError('Failed to generate notes.');
      }
    } finally {
      setIsGeneratingNotes(false);
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
          <h1 className="text-3xl font-black text-slate-900 mb-1 uppercase tracking-tight">Key Topics</h1>
          <p className="text-slate-900 font-bold bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] mt-2 inline-block">Extract major concepts from your uploaded documents.</p>
        </div>
        <button
          onClick={extractTopics}
          disabled={isLoading || !activeProj}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-300 text-slate-900 font-black border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] hover:bg-yellow-400 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest"
        >
          {isLoading ? <Loader className="w-4 h-4 animate-spin stroke-[3px]" /> : <Sparkles className="w-4 h-4 stroke-[3px]" />}
          {isLoading ? 'Analysing...' : topics.length ? 'Refresh Topics' : 'Extract Topics'}
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-3xl mx-auto py-8">
          <Loader className="w-16 h-16 text-slate-900 animate-spin mb-4 stroke-[2px]" />
          <h3 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tight">Analyzing Documents</h3>
          <p className="text-slate-900 font-bold mb-8 bg-white border-2 border-slate-900 px-4 py-2 shadow-[4px_4px_0px_#0f172a]">AI is extracting key topics...</p>
          
          {/* Abstract Progress Bar */}
          <div className="w-full max-w-md mx-auto">
            <div className="w-full bg-slate-100 border-4 border-slate-900 h-6 mb-3 shadow-[4px_4px_0px_#0f172a] overflow-hidden">
              <motion.div 
                className="bg-indigo-400 h-full border-r-4 border-slate-900" 
                animate={{ width: `${Math.min(100, Math.round(((streamContent.match(/"/g) || []).length / 2 / 8) * 100))}%` }} 
                transition={{ duration: 0.3, ease: 'easeOut' }} 
              />
            </div>
            <div className="text-sm font-black text-slate-900 text-center animate-pulse mb-6 uppercase tracking-widest">
              Extracting concepts... ({Math.floor((streamContent.match(/"/g) || []).length / 2)} found)
            </div>
          </div>
          {abortController && (
            <button onClick={cancelGeneration} className="px-5 py-2 bg-red-400 text-slate-900 font-black border-2 border-slate-900 hover:bg-red-500 transition-colors shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] mt-4 uppercase tracking-widest">
              Cancel Extraction
            </button>
          )}
        </div>
      )}

      {!isLoading && topics.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-white border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[6px_6px_0px_#0f172a]">
            <BookOpen className="w-12 h-12 text-slate-900 stroke-[2px]" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Topics Yet</h3>
          <p className="text-slate-900 max-w-md font-bold bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_#0f172a]">
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
            className="flex flex-col h-full bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] overflow-hidden"
          >
            <div className={`p-8 ${TOPIC_COLORS[topics.indexOf(selected) % TOPIC_COLORS.length] || TOPIC_COLORS[0]} text-slate-900 border-b-4 border-slate-900 shrink-0`}>
              <button 
                onClick={() => setSelected(null)} 
                className="flex items-center gap-2 text-xs font-black text-slate-900 hover:bg-white/50 transition-colors mb-4 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] px-3 py-1.5 w-fit uppercase tracking-widest hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0px_0px_0px_#0f172a]"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[3px]" /> Back to Topics
              </button>
              <h2 className="text-4xl font-black mb-2 uppercase tracking-tight">{selected}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <button
                  onClick={() => onSelectTopic?.(selected)}
                  className="flex items-center gap-2 bg-indigo-400 text-slate-900 border-4 border-slate-900 px-5 py-2.5 font-black shadow-[4px_4px_0px_#0f172a] hover:bg-indigo-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] uppercase tracking-widest"
                >
                  <Target className="w-4 h-4 stroke-[3px]" /> Start Quiz
                </button>
                {!notesCache[selected] && (
                  <button
                    onClick={() => generateNotes(selected)}
                    disabled={isGeneratingNotes}
                    className="flex items-center gap-2 bg-lime-400 text-slate-900 border-4 border-slate-900 px-5 py-2.5 font-black shadow-[4px_4px_0px_#0f172a] hover:bg-lime-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-50 uppercase tracking-widest"
                  >
                    {isGeneratingNotes ? <Loader className="w-4 h-4 animate-spin stroke-[3px]" /> : <FileText className="w-4 h-4 stroke-[3px]" />}
                    {isGeneratingNotes ? 'Generating...' : 'Generate Study Notes'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
              {isGeneratingNotes ? (
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  {/* Subtle Loading Indicator at the top */}
                  <div className="flex items-center gap-2 mb-6 bg-white border-2 border-slate-900 border-b-4 p-4 shadow-[4px_4px_0px_#0f172a] text-slate-900 w-fit">
                    <Loader className="w-5 h-5 animate-spin stroke-[3px]" />
                    <span className="text-sm font-black uppercase tracking-widest animate-pulse">AI is writing study notes...</span>
                  </div>
                  
                  <div id="topics-print-content" className="prose prose-slate max-w-none text-slate-900 prose-headings:font-black prose-headings:text-slate-900 prose-headings:uppercase prose-a:text-indigo-600 prose-a:font-black prose-strong:text-slate-900 prose-strong:font-black prose-ul:list-disc prose-ul:pl-4 prose-p:font-medium prose-p:leading-relaxed prose-h3:mt-8 prose-h3:mb-4 pb-12">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdownTables(streamContent)}</ReactMarkdown>
                  </div>

                  {abortController && (
                    <div className="sticky bottom-8 flex justify-center mt-auto pb-4">
                      <button onClick={cancelGeneration} className="px-6 py-2.5 bg-red-400 text-slate-900 font-black border-4 border-slate-900 hover:bg-red-500 transition-all shadow-[6px_6px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] flex items-center gap-2 uppercase tracking-widest">
                         <X className="w-4 h-4 stroke-[3px]" /> Cancel Generation
                      </button>
                    </div>
                  )}
                </div>
              ) : notesCache[selected] ? (
                <div className="max-w-4xl mx-auto flex flex-col items-center">
                  <div className="w-full flex justify-end mb-4">
                     <button onClick={() => printHTMLContent('topics-print-content', `Study Notes: ${selected}`)} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-black border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all uppercase tracking-widest">
                        <Download className="w-4 h-4 stroke-[3px]" /> Download PDF
                     </button>
                  </div>
                  <div id="topics-print-content" className="prose prose-slate max-w-none w-full text-slate-900 prose-headings:font-black prose-headings:text-slate-900 prose-headings:uppercase prose-a:text-indigo-600 prose-a:font-black prose-strong:text-slate-900 prose-strong:font-black prose-ul:list-disc prose-ul:pl-4 prose-p:font-medium prose-p:leading-relaxed prose-h3:mt-8 prose-h3:mb-4 pb-12">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdownTables(notesCache[selected])}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <FileText className="w-16 h-16 text-slate-300 mb-4" />
                  <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Notes Generated</h3>
                  <p className="text-slate-800 font-bold bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_#0f172a]">Click the button above to generate a comprehensive study guide for this topic.</p>
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
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {topics.map((topic, i) => (
              <motion.button
                key={topic}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelect(topic)}
                className={`relative overflow-hidden group p-6 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] ${TOPIC_COLORS[i % TOPIC_COLORS.length]} text-slate-900 text-left transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]`}
              >
                <div className="font-black text-xl leading-tight mb-4 uppercase tracking-tight">{topic}</div>
                <div className="text-slate-900 text-xs font-black uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform border-t-2 border-slate-900 pt-2">
                  View Topic Details <ChevronRight className="w-4 h-4 stroke-[3px]" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
