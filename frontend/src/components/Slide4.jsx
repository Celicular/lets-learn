import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, UploadCloud, MessageSquare, Send, Sparkles, FileText, X, Lock, Cpu, BrainCircuit, Layers, Target } from 'lucide-react';

export default function Slide4() {
  const [projects, setProjects] = useState([]);
  const [activeProj, setActiveProj] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Chat state
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: "Hello! I'm your AI tutor. Create or select a project, upload some documents, and let's get started!", isPencil: false }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:8000/projects');
      if (res.ok) {
        const data = await res.json();
        // Handle both {"projects": { ... }} and { "Biology": { ... } } structures
        const projectMap = data.projects ? data.projects : data;
        const formattedProjects = Object.keys(projectMap).map((key) => {
          const pData = projectMap[key];
          // Handle both format where values are array, or dict with "loaded_files"
          let docsRef = [];
          if (Array.isArray(pData)) docsRef = pData;
          else if (pData && Array.isArray(pData.loaded_files)) docsRef = pData.loaded_files;
          
          return {
            id: key,
            name: key,
            docs: docsRef
          };
        });
        setProjects(formattedProjects);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setIsLoading(false);
    }
  };

  const currProject = projects.find(p => p.id === activeProj);

  const handleCreateProject = async () => {
    const projName = prompt("Enter a new project name:");
    if (!projName || !projName.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projName.trim() })
      });
      
      if (res.ok) {
        await fetchProjects();
        handleSelectProject(projName.trim());
      } else {
        alert("Failed to create project");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectProject = async (projId) => {
    setActiveProj(projId);
    setMessages([{ id: Date.now(), role: 'ai', text: `Loading workspace: ${projId}...`, isPencil: false }]);
    setIsTyping(true);
    
    try {
      const res = await fetch(`http://localhost:8000/projects/${projId}/load`, {
        method: 'POST'
      });
      setIsTyping(false);
      
      if (res.ok) {
        const data = await res.json();
        if (data.total_files === 0) {
          setMessages([{ id: Date.now(), role: 'ai', text: `Project ${projId} loaded. It looks like there are no documents yet. Please upload a file to get started.`, isPencil: false }]);
        } else {
          setMessages([{ id: Date.now(), role: 'ai', text: `Project ${projId} successfully loaded into active AI memory with ${data.total_files} file(s). What would you like to know?`, isPencil: false }]);
        }
      } else {
        setMessages([{ id: Date.now(), role: 'ai', text: `Error loading workspace ${projId}.`, isPencil: false }]);
      }
    } catch (err) {
      console.error("Failed to load project", err);
      setIsTyping(false);
      setMessages([{ id: Date.now(), role: 'ai', text: `Connection error loading ${projId}.`, isPencil: false }]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeProj) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`http://localhost:8000/projects/${activeProj}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: `Success! ${file.name} was vectorized and added to memory. What would you like to know?`, isPencil: false }]);
        await fetchProjects(); // Refresh docs list
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || !activeProj) return;
    
    const userMessage = inputVal.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMessage, isPencil: false }]);
    setInputVal('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      const msgId = Date.now() + 1;
      let aiText = "";

      // Start the AI message bubble
      setMessages(prev => [...prev, { id: msgId, role: 'ai', text: "", isPencil: true }]);
      
      let gotFirstChunk = false;

      while (true) {
        const { value, done } = await reader.read();
        
        // Hide typing indicator once we get the first chunk
        if (!gotFirstChunk && value) {
          gotFirstChunk = true;
          setIsTyping(false);
        }

        if (done) {
          if (!gotFirstChunk) setIsTyping(false);
          break;
        }
        
        aiText += decoder.decode(value, { stream: true });
        
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: aiText } : m));
      }

    } catch (err) {
      console.error("Chat error", err);
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: "Failed to connect to the AI brain.", isPencil: false }]);
    }
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-center items-center py-4" onClick={e => e.stopPropagation()}>
      <div className="text-center mb-6">
        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2 uppercase inline-block bg-cyan-400 px-6 py-2 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] rotate-[-1deg]">
          Interactive Demo
        </h2>
        <p className="text-lg text-slate-800 font-bold mt-4">Experience the LetsLearn workspace.</p>
      </div>

      <div className="w-full h-[75vh] min-h-[600px] bg-white border-4 border-slate-900 shadow-[12px_12px_0px_#0f172a] flex overflow-hidden relative">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-100 border-r-4 border-slate-900 flex flex-col z-10 shrink-0">
          <div className="p-5 border-b-4 border-slate-900 flex justify-between items-center bg-white">
            <span className="font-black text-slate-900 flex items-center uppercase tracking-tight">
              <BrainCircuit className="w-6 h-6 mr-2 text-indigo-600 stroke-[2.5px]" /> Spaces
            </span>
            <button onClick={handleCreateProject} className="p-2 border-2 border-slate-900 bg-coral-300 hover:bg-coral-400 text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
              <Plus className="w-4 h-4 stroke-[3px]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="text-sm font-bold text-slate-600 text-center py-4 uppercase">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="text-sm font-bold text-slate-600 text-center py-4 bg-yellow-200 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">No projects found.</div>
            ) : (
              projects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProject(p.id)}
                  className={`flex items-center p-3 cursor-pointer border-2 transition-all ${activeProj === p.id ? 'bg-indigo-300 border-slate-900 shadow-[4px_4px_0px_#0f172a] -translate-y-1' : 'bg-white border-slate-900 hover:bg-slate-50'}`}
                >
                  <Folder className={`w-5 h-5 mr-3 ${activeProj === p.id ? 'text-slate-900 fill-indigo-200' : 'text-slate-700'}`} />
                  <span className={`text-sm font-black truncate ${activeProj === p.id ? 'text-slate-900' : 'text-slate-700'}`}>{p.name}</span>
                </div>
              ))
            )}
          </div>
          
          {/* Active project mini stats */}
          <div className="p-4 bg-white border-t-4 border-slate-900 flex flex-col gap-2 relative">
             <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Current Memory</div>
             <div className="flex items-center text-sm font-bold text-slate-900">
                <FileText className="w-4 h-4 mr-2" /> 
                {currProject?.docs?.length || 0} Docs Indexed
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative bg-slate-50">
          
          {/* Header */}
          <div className="h-16 border-b-4 border-slate-900 bg-yellow-300 flex items-center justify-between px-6 shrink-0 z-10">
             <div className="flex items-center">
               <span className="font-black uppercase tracking-tight text-slate-900 text-lg border-b-2 border-slate-900 pb-0.5">{currProject ? currProject.name : 'Select a Project'}</span>
               {currProject && (
                 <span className="ml-4 px-3 py-1 bg-lime-400 border-2 border-slate-900 text-slate-900 text-xs font-black flex items-center shadow-[2px_2px_0px_#0f172a]">
                   <div className="w-2 h-2 bg-slate-900 mr-2 animate-pulse"></div> ACTIVE
                 </span>
               )}
             </div>
             
             {/* Nav Tools */}
             <div className="flex items-center gap-3">
                <button 
                  onClick={handleUploadClick}
                  disabled={!currProject}
                  className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] px-4 py-1.5 text-xs font-black uppercase text-slate-900 flex items-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:hover:shadow-[2px_2px_0px_#0f172a] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  title="Upload New Documents"
                >
                  <UploadCloud className="w-4 h-4 mr-1.5 stroke-[3px]" /> Upload
                </button>
                <button 
                  onClick={() => setShowDocsModal(true)}
                  disabled={!currProject}
                  className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] px-4 py-1.5 text-xs font-black uppercase text-slate-900 flex items-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:hover:shadow-[2px_2px_0px_#0f172a] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  <FileText className="w-4 h-4 mr-1.5 stroke-[3px]" /> Docs ({currProject?.docs?.length || 0})
                </button>
                <button className="bg-indigo-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] px-4 py-1.5 text-xs font-black uppercase text-slate-900 flex items-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all" onClick={() => setShowPaywall(true)}>
                  <Layers className="w-4 h-4 mr-1.5 stroke-[3px]" /> Flashcards
                </button>
                <button className="bg-coral-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] px-4 py-1.5 text-xs font-black uppercase text-slate-900 flex items-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all" onClick={() => setShowPaywall(true)}>
                  <Target className="w-4 h-4 mr-1.5 stroke-[3px]" /> Quiz
                </button>
             </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.txt,.docx,.pptx" 
          />

          {/* Workflow Area */}
          <div className="flex-1 overflow-y-auto p-6 relative bg-slate-100">
             {!currProject ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                 Create or select a project from the sidebar to get started.
               </div>
             ) : currProject?.docs?.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center">
                 <motion.div 
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="w-full max-w-md bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-10 flex flex-col items-center text-center cursor-pointer hover:translate-x-1 hover:-translate-y-1 hover:shadow-[0px_0px_0px_#0f172a] transition-all"
                   onClick={handleUploadClick}
                 >
                   {isUploading ? (
                     <Cpu className="w-16 h-16 text-indigo-500 animate-spin stroke-[2px]" style={{ animationDuration: '3s' }} />
                   ) : (
                     <div className="w-20 h-20 bg-indigo-300 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center mb-6">
                       <UploadCloud className="w-10 h-10 text-slate-900 stroke-[2.5px]" />
                     </div>
                   )}
                   <h3 className="text-xl font-black uppercase text-slate-900 mb-2">
                     {isUploading ? 'Extracting Text & Vectors...' : 'Upload Knowledge'}
                   </h3>
                   <p className="text-slate-600 text-sm font-bold">
                     {isUploading ? 'Chunking your data into the database.' : 'Click to select PDF or TXT files to start'}
                   </p>
                 </motion.div>
               </div>
             ) : (
                 <div className="space-y-6 flex flex-col relative min-h-full pb-4">
                 {/* Chat Messages */}
                 <AnimatePresence>
                   {messages.map(msg => (
                     <motion.div 
                       key={msg.id}
                       initial={{ opacity: 0, scale: 0.95, y: 10 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                     >
                       <div className={`max-w-[80%] p-5 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] ${
                         msg.role === 'user' 
                          ? 'bg-indigo-300 text-slate-900 font-bold' 
                          : 'bg-white text-slate-900 font-bold flex gap-4'
                       }`}>
                         {msg.role === 'ai' && (
                           <div className="w-10 h-10 border-2 border-slate-900 bg-yellow-300 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center shrink-0">
                             <Sparkles className="w-5 h-5 text-slate-900 stroke-[2px]" />
                           </div>
                         )}
                         <div className="flex-1 min-w-0 flex items-center">
                           <div className="text-[16px] text-slate-900 font-bold leading-relaxed whitespace-pre-wrap">
                             {msg.text}
                           </div>
                         </div>
                       </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
                 
                 {isTyping && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                     <div className="max-w-[80%] p-4 border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] bg-white flex items-center space-x-4">
                       <div className="w-10 h-10 border-2 border-slate-900 bg-yellow-300 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center shrink-0">
                         <Sparkles className="w-5 h-5 text-slate-900 stroke-[2.5px] animate-pulse" />
                       </div>
                       
                       {/* Animated Pencil Writing */}
                       <div className="flex items-center space-x-3 text-slate-900 font-black text-sm uppercase">
                         <span>AI is writing</span>
                         <motion.div 
                           animate={{ 
                             x: [0, 8, 0, -8, 0], 
                             y: [0, -4, 0, 4, 0],
                             rotate: [0, 15, 0, -15, 0] 
                           }}
                           transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                         </motion.div>
                       </div>
                     </div>
                   </motion.div>
                 )}
                 <div ref={messagesEndRef} />
               </div>
             )}
          </div>

          {/* Chat Input Bar */}
          {(currProject?.docs?.length > 0 || isUploading) && (
            <div className="p-4 bg-white border-t-4 border-slate-900 shrink-0 z-10 w-full relative">
              <form onSubmit={handleSendMessage} className="relative flex items-center max-w-4xl mx-auto drop-shadow-[4px_4px_0px_#0f172a]">
                <button type="button" onClick={handleUploadClick} className="absolute left-3 text-slate-900 bg-emerald-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-emerald-400 transition-colors p-2 z-10 hover:translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none" title="Upload more docs">
                  <Plus className="w-5 h-5 stroke-[3px]" />
                </button>
                <input 
                  type="text" 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="ASK A QUESTION ABOUT YOUR DOCUMENTS..." 
                  className="w-full bg-white pl-16 pr-16 py-4 border-4 border-slate-900 focus:outline-none focus:bg-indigo-50 text-slate-900 font-black placeholder-slate-400 uppercase tracking-tight"
                />
                <button 
                  type="submit" 
                  disabled={!inputVal.trim() || isTyping}
                  className="absolute right-3 bg-indigo-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-slate-900 p-2.5 hover:bg-indigo-500 transition-colors disabled:opacity-50 z-10 hover:translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none"
                >
                  <Send className="w-5 h-5 stroke-[2.5px]" />
                </button>
              </form>
               
               {/* Progress bar overlay during upload inside chat */}
               {isUploading && (
                 <div className="absolute inset-0 bg-white border-t-4 border-slate-900 flex items-center justify-center z-20">
                   <Cpu className="w-6 h-6 text-slate-900 animate-spin mr-3 stroke-[2.5px]" />
                   <span className="font-black text-slate-900 text-lg uppercase tracking-tight">Validating & Vectorizing upload...</span>
                 </div>
               )}
            </div>
          )}

          {/* Coming Soon Overlays */}
          <AnimatePresence>
            {showPaywall && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-[70] p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_#0f172a] w-full max-w-lg p-10 flex flex-col items-center text-center relative"
                >
                  <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-900 border-2 border-slate-900 bg-coral-300 hover:bg-coral-400 p-1 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                    <X className="w-5 h-5 stroke-[3px]" />
                  </button>
                  <div className="w-20 h-20 bg-indigo-300 border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-slate-900 stroke-[2.5px]" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Coming Soon</h3>
                  <p className="text-slate-800 mb-8 font-bold">
                    You've experienced a taste of AI-powered learning. Full access limits to Flashcard Generator, Adaptive Quizzes, and Unlimited Document Storage are coming later!
                  </p>
                  
                  <div className="flex gap-4 w-full">
                    <button onClick={() => setShowPaywall(false)} className="flex-1 px-6 py-4 bg-indigo-400 border-4 border-slate-900 text-slate-900 font-black text-lg uppercase tracking-tight shadow-[6px_6px_0px_#0f172a] hover:bg-indigo-500 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a] transition-all">
                      Okay!
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Docs Modal Overlay */}
          <AnimatePresence>
            {showDocsModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-[60] p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_#0f172a] w-full max-w-md p-8 flex flex-col relative"
                >
                  <button onClick={() => setShowDocsModal(false)} className="absolute top-4 right-4 text-slate-900 border-2 border-slate-900 bg-coral-300 hover:bg-coral-400 p-1 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                    <X className="w-5 h-5 stroke-[3px]" />
                  </button>
                  <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center uppercase tracking-tight">
                    <FileText className="w-7 h-7 mr-3 text-indigo-500 stroke-[2.5px]" /> Uploaded Documents
                  </h3>
                  
                  {currProject?.docs?.length === 0 ? (
                    <div className="text-center py-6 text-slate-900 font-bold bg-yellow-200 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] uppercase">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                       {currProject?.docs?.map((doc, idx) => (
                        <li key={idx} className="flex items-center justify-between p-4 bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                          <div className="flex items-center min-w-0">
                             <FileText className="w-5 h-5 mr-3 text-slate-900 stroke-[2.5px] shrink-0" />
                             <span className="font-bold text-slate-900 truncate">{doc}</span>
                          </div>
                          <span className="text-xs font-black text-slate-900 bg-lime-400 px-2 py-1 border-2 border-slate-900 shrink-0 ml-3 uppercase">Ready</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  <button 
                    onClick={() => { setShowDocsModal(false); setShowPaywall(true); }}
                    className="mt-6 w-full py-3 bg-indigo-300 border-4 border-slate-900 text-slate-900 font-black uppercase tracking-tight shadow-[6px_6px_0px_#0f172a] hover:bg-indigo-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a] transition-all"
                  >
                    Manage Database in Full Version
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
