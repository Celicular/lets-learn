import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Layers, Target, BookOpen, BarChart2, 
  ChevronRight, FileText, BrainCircuit, Sparkles, Plus,
  UploadCloud, Send, Cpu, X, Folder, FolderOpen, Settings, ArrowLeft, Check, Menu
} from 'lucide-react';

import TopicsView from '../components/TopicsView';
import QuizView from '../components/QuizView';
import FlashcardsView from '../components/FlashcardsView';
import AnalyticsView from '../components/AnalyticsView';

const API = 'http://localhost:8000';

// ─── Mini Chat ──────────────────────────────────────────────────────────────
function ChatView({ activeProj }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: "Hello! Select a project and upload documents to get started." }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || !activeProj) return;
    const userMsg = inputVal.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMsg }]);
    setInputVal('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg })
      });

      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const msgId = Date.now() + 1;
      let aiText = '';
      let gotFirst = false;

      setMessages(prev => [...prev, { id: msgId, role: 'ai', text: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (!gotFirst && value) { gotFirst = true; setIsTyping(false); }
        if (done) { if (!gotFirst) setIsTyping(false); break; }
        aiText += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: aiText } : m));
      }
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: 'Failed to connect to AI. Is the server running?' }]);
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
    <div className="w-full h-full flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <h2 className="font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" /> AI Tutor Chat
        </h2>
        <button onClick={() => fileInputRef.current?.click()} disabled={!activeProj || isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors disabled:opacity-50">
          {isUploading ? <Cpu className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {isUploading ? 'Uploading...' : 'Upload Doc'}
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.docx" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'
              }`}>
                {msg.text}
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
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100 shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input type="text" value={inputVal} onChange={e => setInputVal(e.target.value)}
            placeholder={activeProj ? 'Ask anything about your documents...' : 'Select a project first...'}
            disabled={!activeProj}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-14 py-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-50"
          />
          <button type="submit" disabled={!inputVal.trim() || !activeProj || isTyping}
            className="absolute right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
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
  const [results, setResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ll_results') || '[]'); } catch { return []; }
  });

  useEffect(() => { fetchProjects(); }, []);

  // Persist results to localStorage
  useEffect(() => {
    localStorage.setItem('ll_results', JSON.stringify(results));
  }, [results]);

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
            docs: Array.isArray(pData) ? pData : (pData?.loaded_files || [])
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
    if (!projId) return;
    setActiveProj(projId);
    setActiveTab('chat');
    setIsSidebarOpen(false);
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

  const handleResultSaved = (result) => {
    setResults(prev => [...prev, result]);
    setActiveTab('results');
  };

  const currProject = projects.find(p => p.id === activeProj);

  const navItems = [
    { id: 'chat',       label: 'AI Tutor',        icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'topics',     label: 'Key Topics',       icon: <BookOpen className="w-5 h-5" /> },
    { id: 'quiz',       label: 'Adaptive Quiz',    icon: <Target className="w-5 h-5" /> },
    { id: 'flashcards', label: 'Flashcards',       icon: <Layers className="w-5 h-5" /> },
    { id: 'results',    label: 'My Results',       icon: <BarChart2 className="w-5 h-5" />, badge: results.length || null },
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
      <div className={`fixed xl:static inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0 transition-transform duration-300 ease-in-out w-72 bg-white border-r border-slate-200 flex flex-col shadow-2xl xl:shadow-sm z-40 shrink-0 h-full relative`}>
        
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100 shrink-0 z-10 bg-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <span className="ml-3 text-xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            Lets<span className="text-indigo-600">Learn</span> <span className="text-xs font-bold text-indigo-400 ml-0.5">Pro</span>
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
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Your Workspaces</h3>
                  <button onClick={() => setIsCreatingProj(true)} className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition-colors tooltip" title="New Workspace">
                    <Plus className="w-4 h-4" />
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
                      <div className="flex items-center gap-2 p-1 border border-indigo-200 bg-indigo-50 rounded-xl">
                        <input
                          autoFocus
                          type="text"
                          value={newProjName}
                          onChange={e => setNewProjName(e.target.value)}
                          placeholder="Project name..."
                          className="flex-1 bg-transparent px-3 py-2 text-sm font-bold text-indigo-900 focus:outline-none placeholder-indigo-300"
                        />
                        <button type="submit" disabled={!newProjName.trim()} className="w-8 h-8 flex shrink-0 items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setIsCreatingProj(false)} className="w-8 h-8 flex shrink-0 items-center justify-center text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
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
                        className="w-full flex items-center p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 transition-colors group text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500 mr-3 group-hover:scale-105 transition-transform shrink-0">
                          <Folder className="w-5 h-5 fill-indigo-100" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">{p.name}</div>
                          <div className="text-xs font-medium text-slate-500">{p.docs?.length || 0} documents</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0" />
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
                <div className="p-4 border-b border-slate-100">
                  <button 
                    onClick={() => setActiveProj(null)} 
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspaces
                  </button>
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-2xl">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                      <Folder className="w-4 h-4 text-indigo-500 fill-indigo-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-indigo-900 truncate">{currProject?.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Active Context
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  {navItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                        activeTab === item.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-0.5'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className={`mr-3 ${activeTab === item.id ? 'text-indigo-300' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                          {item.badge}
                        </span>
                      )}
                      {activeTab === item.id && <Sparkles className="w-4 h-4 ml-2 text-indigo-300 animate-pulse" />}
                    </button>
                  ))}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 shrink-0 bg-white z-10">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">Demo Account</div>
              <div className="text-xs font-medium text-slate-400">Pro Plan</div>
            </div>
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all duration-300" />
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col overflow-hidden w-full min-w-0">
        
        {/* Mobile Header */}
        <div className="xl:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm shrink-0 z-20">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
               <BrainCircuit className="w-5 h-5 text-white" />
             </div>
             <span className="text-xl font-black text-slate-900 tracking-tight">
               Lets<span className="text-indigo-600">Learn</span>
             </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2.5 bg-slate-50 text-indigo-600 rounded-xl border border-slate-200 hover:bg-slate-100 hover:border-indigo-200 transition-colors shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden bg-[#f7f8fb]">
          {!currProject ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 bg-slate-50/50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FolderOpen className="w-12 h-12 text-indigo-400" />
            </motion.div>
            <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-2xl font-extrabold text-slate-800 mb-2">
              Select or Create a Workspace
            </motion.h2>
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 font-medium max-w-sm">
              Choose a project from the sidebar to access AI tutoring, quizzes, flashcards and more.
            </motion.p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 p-6">
                <ChatView activeProj={activeProj} />
              </motion.div>
            )}
            {activeTab === 'topics' && (
              <motion.div key="topics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <TopicsView activeProj={activeProj} onSelectTopic={t => { setSelectedTopic(t); setActiveTab('quiz'); }} />
              </motion.div>
            )}
            {activeTab === 'quiz' && (
              <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <QuizView activeProj={activeProj} onResultSaved={handleResultSaved} />
              </motion.div>
            )}
            {activeTab === 'flashcards' && (
              <motion.div key="flashcards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <FlashcardsView activeProj={activeProj} />
              </motion.div>
            )}
            {activeTab === 'results' && (
              <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <AnalyticsView results={results} onClear={() => { setResults([]); localStorage.removeItem('ll_results'); }} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>
      </div>
    </div>
  );
}
