import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Loader, Target, BookOpen, Layers, Download } from 'lucide-react';
import { cleanMarkdownTables, printHTMLContent } from '../utils/printUtils';

const API = 'http://localhost:8000';

export default function SummaryView({ activeProj, setIsBusy }) {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [abortController, setAbortController] = useState(null);

  const handleGenerateSummary = async () => {
    if (!activeProj) return;
    setIsGenerating(true);
    setSummary('');
    setError(null);

    const controller = new AbortController();
    setAbortController(controller);
    if (setIsBusy) setIsBusy(true);

    try {
      const res = await fetch(`${API}/projects/${activeProj}/summary`, { 
        method: 'POST',
        signal: controller.signal
      });
      if (!res.body) throw new Error('No body returned from server.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setSummary((prev) => prev + text);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setSummary((prev) => prev + '\n\n**[Generation Cancelled]**');
      } else {
        console.error(err);
        setError('Failed to generate summary. Please ensure documents are uploaded and the API is running.');
      }
    } finally {
      setIsGenerating(false);
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
    <div className="w-full h-full flex flex-col items-center justify-start p-6 overflow-hidden bg-[#e6ebf5]">
      <div className="w-full max-w-[800px] h-full flex flex-col bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] relative overflow-hidden">
        
        {/* Header Section */}
        <div className="px-6 py-5 border-b-4 border-slate-900 flex items-center justify-between shrink-0 bg-yellow-300">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <FileText className="w-6 h-6 text-slate-900 stroke-[3px]" />
              Document Summary
            </h2>
            <p className="text-sm font-bold text-slate-900 mt-2 bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a] inline-block">Get a high-level overview of all documents in this workspace.</p>
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating || !activeProj}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-400 text-slate-900 font-black border-4 border-slate-900 text-sm shadow-[4px_4px_0px_#0f172a] hover:bg-indigo-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-50 uppercase tracking-widest"
          >
            {isGenerating ? <Loader className="w-4 h-4 animate-spin stroke-[3px]" /> : <FileText className="w-4 h-4 stroke-[3px]" />}
            {isGenerating ? 'Generating...' : summary ? 'Regenerate Summary' : 'Generate Summary'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
             {error && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center p-4">
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-200 font-medium">
                  {error}
                </div>
              </motion.div>
            )}

            {!summary && !isGenerating && !error && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto"
              >
                <div className="w-20 h-20 bg-white border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[6px_6px_0px_#0f172a]">
                  <BookOpen className="w-10 h-10 text-slate-900 stroke-[2px]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Ready to Summarize</h3>
                <p className="text-slate-900 font-bold bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_#0f172a]">
                  Click the button above to synthesize all the uploaded documents into a single, comprehensive overview.
                </p>
              </motion.div>
            )}

            {isGenerating && !summary && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center"
              >
                <div className="relative">
                  <Loader className="w-16 h-16 text-slate-900 animate-spin relative z-10 stroke-[2px]" />
                </div>
                <p className="mt-6 text-slate-900 font-black border-2 border-slate-900 bg-white px-4 py-2 shadow-[4px_4px_0px_#0f172a] uppercase tracking-widest animate-pulse mb-6">
                  Analyzing all documents...
                </p>
                {abortController && (
                  <button onClick={cancelGeneration} className="px-5 py-2 bg-red-400 text-slate-900 font-black border-4 border-slate-900 hover:bg-red-500 transition-colors shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] uppercase tracking-widest">
                    Cancel Generation
                  </button>
                )}
              </motion.div>
            )}

            {summary && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto flex flex-col items-center pb-12 w-full"
              >
                <div className="w-full flex justify-end mb-4">
                   <button onClick={() => printHTMLContent('summary-print-content', `Project Summary: ${activeProj}`)} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-black border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all uppercase tracking-widest">
                      <Download className="w-4 h-4 stroke-[3px]" /> Download PDF
                   </button>
                </div>
                <div id="summary-print-content" className="prose prose-slate max-w-none w-full prose-headings:font-black prose-headings:text-slate-900 prose-headings:uppercase prose-p:font-bold prose-p:text-slate-800 prose-p:leading-relaxed prose-li:font-bold prose-strong:font-black prose-strong:text-slate-900 text-slate-900">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdownTables(summary)}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
