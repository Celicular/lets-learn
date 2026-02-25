import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader, MessageSquare, Quote } from 'lucide-react';

const API = 'http://localhost:8000';

export default function ContextualChat({ activeProj, selectedText, initialQuery, onClose, isBusy, setIsBusy }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentContext, setCurrentContext] = useState(selectedText);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialQuery && selectedText && !initialized.current) {
      initialized.current = true;
      setCurrentContext(selectedText);
      handleSend(initialQuery, selectedText);
    }
  }, [initialQuery, selectedText]);

  const handleSend = async (query = inputVal, contextSource = currentContext) => {
    if (!query.trim() || !activeProj || isTyping) return;

    if (isBusy) {
      setMessages((prev) => [
        ...prev, 
        { role: 'user', content: query },
        { role: 'ai', content: '⏳ Waiting for existing process to finish...' }
      ]);
      setInputVal('');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);
    if (setIsBusy) setIsBusy(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${API}/projects/${activeProj}/chat/contextual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, selected_text: contextSource }),
        signal: controller.signal
      });

      if (!res.body) throw new Error('No body in response');
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let aiResponseText = '';
      let hasAddedAi = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        aiResponseText += text;
        setMessages((prev) => {
          if (!hasAddedAi) {
            hasAddedAi = true;
            return [...prev, { role: 'ai', content: aiResponseText }];
          }
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', content: aiResponseText };
          return updated;
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Contextual chat aborted');
      } else {
        console.error(err);
        setMessages((prev) => {
          const updated = [...prev];
          updated.push({ role: 'ai', content: 'Connection lost or API error.' });
          return updated;
        });
      }
    } finally {
      setIsTyping(false);
      if (setIsBusy) setIsBusy(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const closeChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (setIsBusy) setIsBusy(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-6 right-6 shadow-[12px_12px_0px_#0f172a] border-4 border-slate-900 flex flex-col z-[9999] bg-white resize overflow-hidden"
      style={{ width: 400, height: 550, minWidth: 320, minHeight: 400, maxWidth: '90vw', maxHeight: '90vh' }}
    >
      {/* Header */}
      <div className="bg-indigo-400 border-b-4 border-slate-900 px-5 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-slate-900 stroke-[2px]" />
          </div>
          <div>
            <h3 className="text-slate-900 font-black text-sm uppercase tracking-widest">Contextual Assistant</h3>
            <p className="text-slate-900 font-bold text-xs mt-0.5">Answering based on selection</p>
          </div>
        </div>
        <button onClick={closeChat} className="p-2 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-slate-100 transition-all text-slate-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]">
          <X className="w-5 h-5 stroke-[3px]" />
        </button>
      </div>

      {/* Selected Context Preview */}
      <div className="bg-yellow-300 px-5 py-3 border-b-4 border-slate-900 shrink-0 relative z-[9]">
        <div className="flex items-start gap-3">
          <Quote className="w-4 h-4 text-slate-900 font-bold mt-0.5 shrink-0 stroke-[3px]" />
          <p className="text-xs font-bold text-slate-900 italic line-clamp-2 leading-relaxed uppercase tracking-tight">
            "{currentContext}"
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6 bg-slate-50 relative">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] mb-6 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-slate-900 stroke-[2px]" />
            </div>
            <p className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">How can I help?</p>
            <p className="text-sm font-bold text-slate-900 bg-white border-2 border-slate-900 px-3 py-1 shadow-[4px_4px_0px_#0f172a]">Ask any question related to the highlighted text.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] px-5 py-4 text-sm leading-relaxed border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] break-words overflow-hidden ${msg.role === 'user' ? 'bg-lime-300 text-slate-900 font-bold' : 'bg-white text-slate-900 font-bold'}`}>
              <div className="break-words" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
            </div>
          </motion.div>
        ))}
        {isTyping && (!messages.length || messages[messages.length - 1]?.role === 'user' || messages[messages.length - 1]?.content === '') && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
             <div className="bg-white border-4 border-slate-900 px-5 py-3 shadow-[4px_4px_0px_#0f172a] flex gap-2 items-center h-[46px]">
               <span className="w-2.5 h-2.5 bg-slate-900 animate-pulse"></span>
               <span className="w-2.5 h-2.5 bg-slate-900 animate-pulse [animation-delay:-0.15s]"></span>
               <span className="w-2.5 h-2.5 bg-slate-900 animate-pulse [animation-delay:-0.3s]"></span>
             </div>
           </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 pr-5 pb-5 bg-white border-t-4 border-slate-900 shrink-0 relative z-10">
        {/* Visual cue for the native resize handle */}
        <div className="absolute right-1 bottom-1 pointer-events-none text-slate-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
            <polyline points="21 15 21 21 15 21" />
            <line x1="21" y1="21" x2="15" y2="15" />
          </svg>
        </div>
        {isTyping && (
          <div className="absolute left-1/2 -top-12 -translate-x-1/2">
            <button 
              type="button" 
              onClick={cancelGeneration} 
              className="flex items-center gap-2 px-5 py-2 z-20 bg-red-400 text-slate-900 border-4 border-slate-900 font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_#0f172a] hover:bg-red-500 hover:translate-x-[2px] hover:translate-y-[2px] transition-all hover:shadow-[0px_0px_0px_#0f172a]"
            >
              <X className="w-4 h-4 stroke-[3px]" /> Stop
            </button>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(inputVal); }} className="flex gap-3">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isTyping}
            placeholder={(isTyping) ? "AI is typing..." : "Ask about this text..."}
            className="flex-1 bg-white border-4 border-slate-900 px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:bg-slate-50 transition-all shadow-[inset_4px_4px_0_rgba(15,23,42,0.1)] disabled:opacity-50 placeholder:text-slate-400 uppercase tracking-widest placeholder:uppercase"
          />
          <button
            type="submit"
            disabled={isTyping || !inputVal.trim()}
            className="bg-indigo-400 text-slate-900 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4 hover:bg-indigo-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] disabled:opacity-50 disabled:hover:bg-indigo-400 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#0f172a] flex items-center justify-center shrink-0"
          >
            {isTyping ? <Loader className="w-5 h-5 animate-spin text-slate-900 stroke-[3px]" /> : <Send className="w-5 h-5 stroke-[3px]" />}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
