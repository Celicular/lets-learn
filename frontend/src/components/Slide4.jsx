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
      <div className="text-center mb-4">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Interactive Demo</h2>
        <p className="text-lg text-slate-600 font-medium">Experience the LetsLearn workspace.</p>
      </div>

      <div className="w-full h-[75vh] min-h-[600px] glass-panel flex overflow-hidden shadow-2xl relative border border-white/60">
        
        {/* Sidebar */}
        <div className="w-64 bg-white/40 border-r border-white/50 flex flex-col backdrop-blur-md z-10 shrink-0">
          <div className="p-5 border-b border-white/30 flex justify-between items-center">
            <span className="font-extrabold text-slate-700 flex items-center">
              <BrainCircuit className="w-5 h-5 mr-2 text-indigo-600" /> Spaces
            </span>
            <button onClick={handleCreateProject} className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="text-sm text-slate-500 text-center py-4">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No projects found. Create one above!</div>
            ) : (
              projects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProject(p.id)}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${activeProj === p.id ? 'bg-white shadow-sm border border-indigo-100' : 'hover:bg-white/50 text-slate-600'}`}
                >
                  <Folder className={`w-4 h-4 mr-3 ${activeProj === p.id ? 'text-indigo-500 fill-indigo-100' : 'text-slate-400'}`} />
                  <span className={`text-sm font-bold truncate ${activeProj === p.id ? 'text-indigo-900' : 'text-slate-600'}`}>{p.name}</span>
                </div>
              ))
            )}
          </div>
          
          {/* Active project mini stats */}
          <div className="p-4 bg-indigo-50/50 border-t border-white/30 m-3 rounded-2xl flex flex-col gap-2">
             <div className="text-xs font-black text-indigo-400 uppercase tracking-wider">Current Memory</div>
             <div className="flex items-center text-sm font-bold text-slate-700">
                <FileText className="w-4 h-4 mr-2 text-indigo-500" /> 
                {currProject?.docs?.length || 0} Docs Indexed
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative bg-slate-50/30">
          
          {/* Header */}
          <div className="h-16 border-b border-white/50 bg-white/30 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center">
               <span className="font-extrabold text-slate-800 text-lg">{currProject ? currProject.name : 'Select a Project'}</span>
               {currProject && (
                 <span className="ml-4 px-3 py-1 bg-lime-100 text-lime-700 text-xs font-black rounded-full flex items-center">
                   <div className="w-2 h-2 bg-lime-500 rounded-full mr-2 animate-pulse"></div> Active
                 </span>
               )}
             </div>
             
             {/* Nav Tools */}
             <div className="flex items-center gap-3">
                <button 
                  onClick={handleUploadClick}
                  disabled={!currProject}
                  className="neu-panel px-4 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 flex items-center hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  title="Upload New Documents"
                >
                  <UploadCloud className="w-4 h-4 mr-1.5 text-indigo-500" /> Upload Docs
                </button>
                <button 
                  onClick={() => setShowDocsModal(true)}
                  disabled={!currProject}
                  className="neu-panel px-4 py-1.5 text-xs font-bold text-slate-700 flex items-center hover:bg-white transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> View Docs ({currProject?.docs?.length || 0})
                </button>
                <button className="neu-panel px-4 py-1.5 text-xs font-bold text-indigo-600 flex items-center hover:bg-white transition-colors" onClick={() => setShowPaywall(true)}>
                  <Layers className="w-4 h-4 mr-1.5" /> Flashcards
                </button>
                <button className="neu-panel px-4 py-1.5 text-xs font-bold text-coral-600 flex items-center hover:bg-white transition-colors" onClick={() => setShowPaywall(true)}>
                  <Target className="w-4 h-4 mr-1.5" /> Generate Quiz
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
          <div className="flex-1 overflow-y-auto p-6 relative">
             {!currProject ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 font-medium">
                 Create or select a project from the sidebar to get started.
               </div>
             ) : currProject?.docs?.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center">
                 <motion.div 
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="w-full max-w-md bg-white/60 backdrop-blur border-2 border-dashed border-indigo-200 rounded-[30px] p-10 flex flex-col items-center text-center cursor-pointer hover:bg-white/80 transition-colors shadow-sm"
                   onClick={handleUploadClick}
                 >
                   {isUploading ? (
                     <Cpu className="w-16 h-16 text-indigo-500 animate-spin" style={{ animationDuration: '3s' }} />
                   ) : (
                     <UploadCloud className="w-16 h-16 text-indigo-400 mb-4" />
                   )}
                   <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                     {isUploading ? 'Extracting Text & Vectors...' : 'Upload Knowledge'}
                   </h3>
                   <p className="text-slate-500 text-sm font-medium">
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
                       <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                         msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-sm' 
                          : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100 flex gap-4'
                       }`}>
                         {msg.role === 'ai' && (
                           <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                             <Sparkles className="w-4 h-4 text-indigo-600" />
                           </div>
                         )}
                         <div className="flex-1 min-w-0">
                           <div className="text-[16px] text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                             {msg.text}
                           </div>
                         </div>
                       </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
                 
                 {isTyping && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                     <div className="max-w-[80%] p-4 rounded-2xl bg-white rounded-tl-sm border border-slate-100 flex items-center space-x-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                         <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                       </div>
                       
                       {/* Animated Pencil Writing */}
                       <div className="flex items-center space-x-2 text-indigo-400 font-medium text-sm">
                         <span>AI is writing</span>
                         <motion.div 
                           animate={{ 
                             x: [0, 8, 0, -8, 0], 
                             y: [0, -4, 0, 4, 0],
                             rotate: [0, 15, 0, -15, 0] 
                           }}
                           transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
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
            <div className="p-4 bg-white/40 border-t border-white/50 backdrop-blur-md shrink-0">
              <form onSubmit={handleSendMessage} className="relative flex items-center max-w-4xl mx-auto">
                <button type="button" onClick={handleUploadClick} className="absolute left-3 text-slate-400 hover:text-indigo-600 transition-colors p-2" title="Upload more docs">
                  <Plus className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask a question about your documents..." 
                  className="w-full bg-white pl-12 pr-14 py-4 rounded-2xl border-none shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 font-medium"
                />
                <button 
                  type="submit" 
                  disabled={!inputVal.trim() || isTyping}
                  className="absolute right-3 bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
               
               {/* Progress bar overlay during upload inside chat */}
               {isUploading && (
                 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner z-10 m-4">
                   <Cpu className="w-5 h-5 text-indigo-500 animate-spin mr-3" />
                   <span className="font-bold text-indigo-700 text-sm">Validating & Vectorizing upload...</span>
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
                  className="neu-panel bg-white w-full max-w-lg p-10 flex flex-col items-center text-center relative"
                >
                  <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                    <X className="w-6 h-6" />
                  </button>
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-4">Coming Soon</h3>
                  <p className="text-slate-600 mb-8 font-medium">
                    You've experienced a taste of AI-powered learning. Full access limits to Flashcard Generator, Adaptive Quizzes, and Unlimited Document Storage are coming later!
                  </p>
                  
                  <div className="flex gap-4 w-full">
                    <button onClick={() => setShowPaywall(false)} className="flex-1 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all hover:-translate-y-1">
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
                  className="neu-panel bg-white w-full max-w-md p-8 flex flex-col relative"
                >
                  <button onClick={() => setShowDocsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                    <X className="w-6 h-6" />
                  </button>
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center">
                    <FileText className="w-6 h-6 mr-3 text-indigo-600" /> Uploaded Documents
                  </h3>
                  
                  {currProject?.docs?.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {currProject?.docs?.map((doc, idx) => (
                        <li key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-colors">
                          <div className="flex items-center min-w-0">
                             <FileText className="w-5 h-5 mr-3 text-indigo-400 shrink-0" />
                             <span className="font-bold text-slate-700 truncate">{doc}</span>
                          </div>
                          <span className="text-xs font-bold text-green-500 shrink-0 ml-3">Ready</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  <button 
                    onClick={() => { setShowDocsModal(false); setShowPaywall(true); }}
                    className="mt-6 w-full py-3 rounded-xl bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 transition-colors"
                  >
                    Manage Storage in Full Version
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
