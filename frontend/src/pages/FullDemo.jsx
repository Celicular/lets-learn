import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Layers, Target, BookOpen, BarChart2, 
  ChevronRight, FileText, BrainCircuit, Sparkles, Plus,
  UploadCloud, Send, Cpu, X, Folder, FolderOpen, Settings, ArrowLeft, Check, Menu, Activity
} from 'lucide-react';

import TopicsView from '../components/TopicsView';
import QuizView from '../components/QuizView';
import FlashcardsView from '../components/FlashcardsView';
import AnalyticsView from '../components/AnalyticsView';
import SummaryView from '../components/SummaryView';
import ContextualChat from '../components/ContextualChat';
import DashboardView from '../components/DashboardView';
import CallView from '../components/CallView';
import { useTextSelection } from '../utils/useTextSelection';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Square } from 'lucide-react';

const API = 'http://localhost:8000';

// ─── Mini Chat ──────────────────────────────────────────────────────────────
function ChatView({ activeProj, isBusy, setIsBusy }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [showCallWarning, setShowCallWarning] = useState(false);
  
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: "Hello! Select a project and upload documents to get started." }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightweightContext, setLightweightContext] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Refs for speaking
  const isBusyRef = useRef(isBusy);
  
  useEffect(() => { isBusyRef.current = isBusy; }, [isBusy]);

  // Initialize mermaid once
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
  }, []);

  // Re-render any .mermaid blocks whenever messages update
  useEffect(() => {
    mermaid.run({ querySelector: '.mermaid-diagram' }).catch(() => {});
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
           setInputVal(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) recognition.start(); // Keep alive if manually enabled
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListen = (forceState = null) => {
    if (forceState !== null) {
      if (forceState) {
        recognitionRef.current?.start();
        setIsListening(true);
      } else {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speakText = (text) => {
    if (!autoSpeak || !window.speechSynthesis) return;
    
    // Strip markdown formatting for cleaner speech
    const cleanText = text.replace(/(\\*|#|_|`|~|>|-)/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // Prioritize natural sounding human voices specifically provided by Edge/Chrome
    const preferredVoice = voices.find(v => v.name.includes("Online (Natural)") && v.lang.includes("en"))
                        || voices.find(v => v.name.includes("Google UK English Female"))
                        || voices.find(v => v.name.includes("Google US English"))
                        || voices.find(v => v.name.includes("Google") && v.name.includes("Female") && v.lang.includes("en")) 
                        || voices.find(v => v.name.includes("Natural") && v.lang.includes("en"))
                        || voices.find(v => v.name.includes("Zira"))
                        || voices.find(v => v.lang.startsWith("en"));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0; // keep it at normal 1.0 pace to sound more natural
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const query = inputVal;
    
    if (!query.trim() || !activeProj) return;
    const userMsg = query.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMsg }]);
    setInputVal('');
    
    setIsTyping(true);
    setIsBusy(true);
    isBusyRef.current = true;
    
    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
    }

    const controller = new AbortController();
    setAbortController(controller);

    if (autoSpeak) {
        window.speechSynthesis?.cancel();
    }

    try {
      const res = await fetch(`${API}/chat/visual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: userMsg,
            project_name: activeProj,
            k: lightweightContext ? 1 : 3,
            max_chars: lightweightContext ? 800 : 3000
        }),
        signal: controller.signal
      });

      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let msgId = Date.now() + 1;
      let aiText = '';
      let spokenTextLength = 0;
      let gotFirst = false;
      let buffer = '';

      setMessages(prev => [...prev, { id: msgId, role: 'ai', text: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (!gotFirst && value) { gotFirst = true; setIsTyping(false); }
        if (done) { 
            if (!gotFirst) setIsTyping(false); 
            if (autoSpeak && aiText.length > spokenTextLength) {
                speakText(aiText.slice(spokenTextLength));
            }
            break; 
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'text') {
              aiText += parsed.content;
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: aiText } : m));
              if (autoSpeak) {
                const unprocessed = aiText.slice(spokenTextLength);
                const match = unprocessed.match(/([.?!,;:\n])(\s|\n|$)/);
                if (match && match.index !== undefined) {
                  speakText(unprocessed.substring(0, match.index + 1));
                  spokenTextLength += match.index + 1;
                }
              }
            } else if (parsed.type === 'image') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, image: parsed.content, imagePath: parsed.path } : m
              ));
            } else if (parsed.type === 'new_message') {
              msgId = Date.now() + Math.random();
              aiText = '';
              spokenTextLength = 0;
              setMessages(prev => [...prev, { id: msgId, role: 'ai', text: '' }]);
            } else if (parsed.type === 'mermaid') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, mermaid: parsed.content } : m
              ));
            }
          } catch {
            // incomplete JSON chunk — ignore
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
         setMessages(prev => [...prev.filter(m => m.text !== ''), { id: Date.now(), role: 'ai', text: 'Generation Cancelled.' }]);
      } else {
         setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: 'Failed to connect to AI. Is the server running?' }]);
      }
    } finally {
      setIsTyping(false);
      setIsBusy(false);
      isBusyRef.current = false;
      setAbortController(null);
    }
  };

  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      setIsBusy(false);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeProj) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/projects/${activeProj}/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: `✅ ${file.name} uploaded and indexed into memory. Ask me anything!` }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: 'Upload failed. Please try again.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: 'Upload error.' }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <h2 className="font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" /> AI Tutor Chat
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCallWarning(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Speak with AI</span>
          </button>
          
          <label className="flex items-center cursor-pointer gap-2 mr-1 ml-2" title="Uses less text context to respond faster" onClick={() => setLightweightContext(!lightweightContext)}>
            <div className="relative inline-block w-8 h-4 bg-slate-200 rounded-full transition-colors duration-200 ease-in-out" style={{ backgroundColor: lightweightContext ? '#10b981' : '#cbd5e1' }}>
               <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm ${lightweightContext ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">Fast</span>
          </label>
          <button
            onClick={() => {
                setAutoSpeak(prev => {
                    if (prev) window.speechSynthesis?.cancel(); // stop on disable
                    return !prev;
                });
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors shadow-sm ${autoSpeak ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'} disabled:opacity-50`}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Auto Speak</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={!activeProj || isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors disabled:opacity-50">
            {isUploading ? <Cpu className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {isUploading ? 'Uploading...' : 'Upload Doc'}
          </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.docx" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-sm' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-sm prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-4 first:prose-p:mt-0'
              }`}>
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : (
                  <>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text.replace(/```(?:mermaid|graph|flowchart)[\s\S]*?(?:```|$)/gi, '').trim()}
                    </ReactMarkdown>
                    {msg.mermaid && (
                      <div className="mt-4 not-prose bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-auto">
                        <div className="mermaid-diagram text-xs text-slate-700">{msg.mermaid}</div>
                      </div>
                    )}
                    {msg.image && (
                      <div className="mt-3 not-prose">
                        <img
                          src={`data:image/png;base64,${msg.image}`}
                          alt="AI-generated visualization"
                          className="rounded-xl max-w-xs shadow-md border border-slate-200"
                        />
                        <a
                          href={`data:image/png;base64,${msg.image}`}
                          download="visualization.png"
                          className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg hover:shadow-sm transition-all group"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 group-hover:opacity-100 group-hover:-translate-y-0.5 transition-all"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                          Download Image
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-2">
              <span className="text-slate-500 text-sm font-medium">AI is writing</span>
              <motion.div animate={{ x: [0, 8, 0, -8, 0], y: [0, -3, 0, 3, 0], rotate: [0, 15, 0, -15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                </svg>
              </motion.div>
            </div>
            {abortController && (
              <button onClick={cancelGeneration} className="ml-3 px-3 py-2 flex items-center gap-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs border border-red-200 hover:bg-red-100 transition-colors self-center shadow-sm">
                <Square className="w-3 h-3 fill-red-600" /> Stop Answering
              </button>
            )}
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 border-t shrink-0 transition-colors bg-white border-slate-100`}>
        <form onSubmit={handleSend} className="relative flex items-center">
          <input type="text" value={inputVal} onChange={e => setInputVal(e.target.value)}
            placeholder={activeProj ? 'Ask anything about your documents...' : 'Select a project first...'}
            disabled={!activeProj || isBusy}
            className={`w-full border rounded-2xl pl-5 pr-[6.5rem] py-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-colors bg-slate-50 border-slate-200 focus:ring-indigo-400`}
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => toggleListen()}
              disabled={isBusy}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-rose-100 text-rose-500 animate-pulse shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
              title="Voice Typing"
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button type="submit" disabled={!inputVal.trim() || !activeProj || isTyping}
              className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Call Mode Integration */}
      {isCallActive && (
        <div className="absolute inset-0 z-[60]">
           <CallView activeProj={activeProj} setIsBusy={setIsBusy} onClose={() => setIsCallActive(false)} />
        </div>
      )}

      {/* Warning Modal */}
      <AnimatePresence>
        {showCallWarning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_#0f172a] p-8 max-w-md w-full relative">
                <div className="w-16 h-16 bg-yellow-300 border-4 border-slate-900 text-slate-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_#0f172a]">
                   <Phone className="w-8 h-8 stroke-[2.5px]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Initialize Hands-Free Call?</h3>
                <p className="text-slate-800 font-bold mb-6 leading-relaxed">
                  Call Mode uses continuous voice recognition and text-to-speech. Continuous heavy AI processing can be slower on some connections.<br/><br/>If the AI gets stuck, you can cancel manually. Do you want to proceed?
                </p>
                <div className="flex gap-4 justify-end">
                   <button onClick={() => setShowCallWarning(false)} className="px-6 py-3 font-black text-slate-900 bg-white border-4 border-slate-900 hover:bg-slate-100 transition-colors uppercase shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a]">Cancel</button>
                   <button onClick={() => { setShowCallWarning(false); setIsCallActive(true); }} className="px-6 py-3 font-black text-slate-900 bg-lime-400 border-4 border-slate-900 hover:bg-lime-500 transition-colors uppercase shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a]">
                     Start Call Mode
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main FullDemo ───────────────────────────────────────────────────────────
export default function FullDemo() {
  const [activeTab, setActiveTab] = useState('chat');
  const [projects, setProjects] = useState([]);
  const [activeProj, setActiveProj] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isCreatingProj, setIsCreatingProj] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  
  const { selection, setSelection } = useTextSelection();
  const [contextualChatOpen, setContextualChatOpen] = useState(false);
  const [contextualPrompt, setContextualPrompt] = useState('');
  const [activeContextualText, setActiveContextualText] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  // Sync results to backend on save
  const handleResultSaved = async (result) => {
    const updatedResults = [...results, result];
    setResults(updatedResults);
    setActiveTab('results');
    
    // Save to backend
    if (activeProj) {
      // 1. LocalStorage (per project)
      localStorage.setItem(`ll_results_${activeProj}`, JSON.stringify(updatedResults));

      // 2. Backend
      try {
        await fetch(`${API}/projects/${activeProj}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result })
        });
      } catch (err) {
        console.error("Failed to sync results to backend", err);
      }
    }
  };

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API}/projects`);
      if (res.ok) {
        const data = await res.json();
        const projectMap = data.projects ? data.projects : data;
        const formatted = Object.keys(projectMap).map(key => {
          const pData = projectMap[key];
          return {
            id: key, name: key,
            docs: Array.isArray(pData) ? pData : (pData?.loaded_files || []),
            results: pData?.results || []
          };
        });
        setProjects(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (projId) => {
    if (!projId || isBusy) return;
    setActiveProj(projId);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
    
    // Set project-specific results
    const local = localStorage.getItem(`ll_results_${projId}`);
    if (local) {
      try { setResults(JSON.parse(local)); } catch { setResults([]); }
    } else {
      const proj = projects.find(p => p.id === projId);
      if (proj && proj.results) setResults(proj.results);
      else setResults([]);
    }

    try {
      await fetch(`${API}/projects/${projId}/load`, { method: 'POST' });
    } catch (err) {
      console.error('load error', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    try {
      const res = await fetch(`${API}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjName.trim() })
      });
      if (res.ok) {
        setNewProjName('');
        setIsCreatingProj(false);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };



  const currProject = projects.find(p => p.id === activeProj);

  const navItems = [
    { id: 'dashboard',  label: 'Overview Dashboard', icon: <Activity className="w-5 h-5" /> },
    { id: 'chat',       label: 'AI Tutor Chat',   icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'topics',     label: 'Key Topics',      icon: <BookOpen className="w-5 h-5" /> },
    { id: 'summary',    label: 'Document Summary', icon: <FileText className="w-5 h-5" /> },
    { id: 'quiz',       label: 'Adaptive Quiz',   icon: <Target className="w-5 h-5" /> },
    { id: 'flashcards', label: 'Flashcards',      icon: <Layers className="w-5 h-5" /> },
    { id: 'results',    label: 'My Results',      icon: <BarChart2 className="w-5 h-5" />, badge: results.length || null },
  ];

  return (
    <div className="flex h-[100dvh] w-screen bg-[#f7f8fb] overflow-hidden font-sans relative">
      
      {/* ── Mobile Sidebar Overlay ───────────────────────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-30 xl:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div className={`fixed xl:static inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0 transition-transform duration-300 ease-in-out w-72 bg-slate-100 border-r-4 border-slate-900 flex flex-col shadow-[8px_0_0_#0f172a] xl:shadow-none z-40 shrink-0 h-full relative`}>
        
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b-4 border-slate-900 shrink-0 z-10 bg-yellow-300">
          <div className="w-10 h-10 bg-indigo-500 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] shrink-0">
            <BrainCircuit className="w-6 h-6 text-slate-900 stroke-[2.5px]" />
          </div>
          <span className="ml-3 text-xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis uppercase">
            LetsLearn <span className="text-xs font-black bg-lime-400 border-2 border-slate-900 px-1 ml-0.5 shadow-[2px_2px_0px_#0f172a]">PRO</span>
          </span>
        </div>

        {/* Dynamic Sidebar Content */}
        <div className="flex-1 relative overflow-hidden bg-white">
          <AnimatePresence mode="wait">
            {!activeProj ? (
              /* Project Selection View */
              <motion.div 
                key="project-list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col p-4 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Your Workspaces</h3>
                  <button onClick={() => !isBusy && setIsCreatingProj(true)} disabled={isBusy} className="w-8 h-8 bg-coral-400 border-2 border-slate-900 text-slate-900 flex items-center justify-center hover:bg-coral-500 transition-colors shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none disabled:opacity-50" title="New Workspace">
                    <Plus className="w-5 h-5 stroke-[3px]" />
                  </button>
                </div>

                {/* Create Project Input */}
                <AnimatePresence>
                  {isCreatingProj && (
                    <motion.form 
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                      onSubmit={handleCreateProject}
                    >
                      <div className="flex items-center gap-2 p-1.5 border-4 border-slate-900 bg-indigo-300 shadow-[4px_4px_0px_#0f172a]">
                        <input
                          autoFocus
                          type="text"
                          value={newProjName}
                          onChange={e => setNewProjName(e.target.value)}
                          placeholder="Project name..."
                          className="flex-1 bg-white px-3 py-2 border-2 border-slate-900 text-sm font-black text-slate-900 focus:outline-none placeholder-slate-400 uppercase tracking-tight"
                        />
                        <button type="submit" disabled={!newProjName.trim()} className="w-10 h-10 flex shrink-0 items-center justify-center bg-lime-400 border-2 border-slate-900 text-slate-900 hover:bg-lime-500 disabled:opacity-50 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none transition-all">
                          <Check className="w-5 h-5 stroke-[3px]" />
                        </button>
                        <button type="button" onClick={() => setIsCreatingProj(false)} className="w-10 h-10 flex shrink-0 items-center justify-center bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none transition-all">
                          <X className="w-5 h-5 stroke-[3px]" />
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  {isLoading ? (
                    <div className="p-4 text-center text-sm font-bold text-slate-400">Loading...</div>
                  ) : projects.length === 0 ? (
                    <div className="p-4 text-center">
                      <FolderOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <div className="text-sm font-bold text-slate-400">No workspaces yet</div>
                    </div>
                  ) : (
                    projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProject(p.id)}
                        className="w-full flex items-center p-3 border-4 border-slate-900 bg-white hover:bg-slate-50 hover:-translate-y-1 hover:shadow-[4px_4px_0px_#0f172a] shadow-[2px_2px_0px_#0f172a] transition-all group text-left mb-3"
                      >
                        <div className="w-10 h-10 border-2 border-slate-900 bg-indigo-300 flex items-center justify-center text-slate-900 mr-3 shrink-0">
                          <Folder className="w-5 h-5 fill-indigo-100" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{p.name}</div>
                          <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">{p.docs?.length || 0} DOCS</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 stroke-[3px]" />
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              /* Functional Tool View */
              <motion.div 
                key="functional-nav"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col"
              >
                <div className="p-4 border-b-4 border-slate-900 bg-emerald-200">
                  <button 
                    onClick={() => setActiveProj(null)} 
                    className="flex items-center gap-2 text-xs font-black bg-white border-2 border-slate-900 px-3 py-1.5 shadow-[2px_2px_0px_#0f172a] text-slate-900 hover:bg-slate-50 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all mb-4 uppercase inline-flex"
                  >
                    <ArrowLeft className="w-3 h-3 stroke-[3px]" /> BACK
                  </button>
                  <div className="flex items-center gap-3 bg-white border-4 border-slate-900 p-3 shadow-[4px_4px_0px_#0f172a]">
                    <div className="w-10 h-10 border-2 border-slate-900 bg-indigo-300 flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5 text-slate-900 fill-indigo-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{currProject?.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-900 uppercase tracking-widest mt-1">
                        <div className="w-2 h-2 bg-lime-400 border border-slate-900 rounded-full animate-pulse" />
                        ACTIVE CONTEXT
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {navItems.map(item => (
                    <button
                      key={item.id}
                      disabled={isBusy}
                      onClick={() => { if (!isBusy) { setActiveTab(item.id); setIsSidebarOpen(false); } }}
                      className={`w-full flex items-center px-4 py-3.5 font-black text-sm transition-all border-4 uppercase tracking-tight mb-2 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] ${
                        activeTab === item.id
                          ? 'bg-indigo-300 border-slate-900 text-slate-900 shadow-[4px_4px_0px_#0f172a] -translate-y-1'
                          : 'bg-white border-slate-900 text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                      } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className={`mr-3 ${activeTab === item.id ? 'text-slate-900' : 'text-slate-800'}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className={`text-xs font-black px-2 py-0.5 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${activeTab === item.id ? 'bg-white text-slate-900' : 'bg-indigo-200 text-slate-900'}`}>
                          {item.badge}
                        </span>
                      )}
                      {activeTab === item.id && <Sparkles className="w-5 h-5 ml-2 text-slate-900 animate-pulse stroke-[2.5px]" />}
                    </button>
                  ))}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-4 border-slate-900 shrink-0 bg-yellow-300 z-10">
          <div className="flex items-center gap-3 p-2 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-indigo-500 border-2 border-slate-900 flex items-center justify-center text-slate-900 font-black text-lg shadow-[2px_2px_0px_#0f172a]">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">Demo Account</div>
              <div className="text-xs font-bold text-slate-800 uppercase">PRO PLAN</div>
            </div>
            <Settings className="w-5 h-5 text-slate-900 group-hover:rotate-90 transition-all duration-300 stroke-[2.5px]" />
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col overflow-hidden w-full min-w-0">
        
        {/* Mobile Header */}
        <div className="xl:hidden flex items-center justify-between p-4 bg-yellow-300 border-b-4 border-slate-900 shrink-0 z-20">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-indigo-500 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a]">
               <BrainCircuit className="w-5 h-5 text-slate-900 stroke-[2.5px]" />
             </div>
             <span className="text-xl font-black text-slate-900 tracking-tight uppercase">
               LetsLearn <span className="text-xs font-black bg-lime-400 border-2 border-slate-900 px-1 ml-0.5 shadow-[2px_2px_0px_#0f172a]">PRO</span>
             </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-100 transition-colors shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          >
            <Menu className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden bg-[#f7f8fb]">
          {!currProject ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 bg-[#e6ebf5]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 bg-coral-400 border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[8px_8px_0px_#0f172a] rotate-3">
              <FolderOpen className="w-12 h-12 text-slate-900 stroke-[2px]" />
            </motion.div>
            <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">
              Select or Create a Workspace
            </motion.h2>
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-800 font-bold max-w-sm border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_#0f172a]">
              Choose a project from the sidebar to access AI tutoring, quizzes, flashcards and more.
            </motion.p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <DashboardView activeProj={activeProj} projects={projects} results={results} onNavigate={t => setActiveTab(t)} />
              </motion.div>
            )}
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 p-6">
                <ChatView activeProj={activeProj} setIsBusy={setIsBusy} />
              </motion.div>
            )}
            {activeTab === 'topics' && (
              <motion.div key="topics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <TopicsView activeProj={activeProj} onSelectTopic={t => { setSelectedTopic(t); setActiveTab('quiz'); }} setIsBusy={setIsBusy} />
              </motion.div>
            )}
            {activeTab === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <SummaryView activeProj={activeProj} setIsBusy={setIsBusy} />
              </motion.div>
            )}
            {activeTab === 'quiz' && (
              <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <QuizView activeProj={activeProj} onResultSaved={handleResultSaved} setIsBusy={setIsBusy} />
              </motion.div>
            )}
            {activeTab === 'flashcards' && (
              <motion.div key="flashcards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <FlashcardsView activeProj={activeProj} setIsBusy={setIsBusy} />
              </motion.div>
            )}
            {activeTab === 'results' && (
              <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <AnalyticsView results={results} onClear={() => setResults([])} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>
      </div>

      {/* Floating Action Button for Text Selection */}
      <AnimatePresence>
        {selection.text && selection.rect && !contextualChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[9998] shadow-[6px_6px_0px_#0f172a] bg-white border-4 border-slate-900 overflow-hidden"
            style={{
              top: selection.rect.top - 60 > 0 ? selection.rect.top - 60 : selection.rect.top + selection.rect.height + 10,
              left: Math.max(20, selection.rect.left + selection.rect.width / 2 - 150),
              width: 300
            }}
          >
            <div className="p-2 bg-yellow-300 flex items-center gap-2 border-b-4 border-slate-900">
              <MessageSquare className="w-4 h-4 text-slate-900 shrink-0 stroke-[3px]" />
              <div className="text-xs font-black text-slate-900 truncate uppercase tracking-widest">Select to ask AI</div>
            </div>
            <form onSubmit={e => {
                e.preventDefault();
                setActiveContextualText(selection.text);
                setContextualChatOpen(true);
                setSelection({ text: '', rect: null });
            }} className="p-2 flex gap-2 bg-indigo-300">
              <input
                type="text"
                autoFocus
                placeholder="Add a remark & ask..."
                value={contextualPrompt}
                onChange={e => setContextualPrompt(e.target.value)}
                className="flex-1 bg-white border-2 border-slate-900 px-3 py-2 text-xs font-black text-slate-900 focus:outline-none placeholder-slate-500 shadow-[2px_2px_0px_#0f172a]"
              />
              <button
                type="submit"
                disabled={!contextualPrompt.trim()}
                className="bg-lime-400 border-2 border-slate-900 text-slate-900 p-2 hover:bg-lime-500 transition-all disabled:opacity-50 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none"
              >
                <Send className="w-4 h-4 text-slate-900 stroke-[3px] ml-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

       {/* Contextual Chat Window */}
      <AnimatePresence>
        {contextualChatOpen && (
           <ContextualChat
             activeProj={activeProj}
             selectedText={activeContextualText}
             initialQuery={contextualPrompt}
             isBusy={isBusy}
             setIsBusy={setIsBusy}
             onClose={() => {
               setContextualChatOpen(false);
               setContextualPrompt('');
             }}
           />
        )}
      </AnimatePresence>
    </div>
  );
}
