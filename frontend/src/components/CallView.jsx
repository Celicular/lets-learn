import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, Square, Loader, ArrowLeft, ChevronDown, Globe } from 'lucide-react';

const API = 'http://localhost:8000';

export default function CallView({ activeProj, setIsBusy, onClose }) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [currentCaption, setCurrentCaption] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [selectedLang, setSelectedLang] = useState('en-US'); // 'en-US' or 'hi-IN'
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const [abortController, setAbortController] = useState(null);
  
  const recognitionRef = useRef(null);
  const recognitionEnabledRef = useRef(true);
  const silenceTimerRef = useRef(null);
  const inputRefState = useRef('');
  const speechQueueRef = useRef([]);
  const isSpeechPlayingRef = useRef(false);
  const responseBufferRef = useRef('');
  const translationCacheRef = useRef(new Map());
  const translateBufferRef = useRef([]);
  const isProcessingRef = useRef(false);
  
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const reqFrameRef = useRef(null);
  const callActiveRef = useRef(false);

  // Keep state sync for timeouts
  useEffect(() => { inputRefState.current = transcript; }, [transcript]);

  useEffect(() => {
    const interval = setInterval(() => {
       if (selectedLang === 'hi-IN' && translateBufferRef.current.length > 0 && isProcessingRef.current) {
          flushTranslateBuffer();
       }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedLang]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const endCall = () => {
    callActiveRef.current = false;
    setIsActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript('');
    setAiResponse('');
    setCurrentCaption('');
    setHighlightIdx(0);
    setAudioLevel(0);
    cancelAnimationFrame(reqFrameRef.current);
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(e=>console.log(e));
        audioContextRef.current = null;
    }

    // Clear speech refs
    speechQueueRef.current = [];
    translateBufferRef.current = [];
    isSpeechPlayingRef.current = false;
    responseBufferRef.current = '';

    setIsBusy(false);
  };

  const translateToHindi = async (text, signal) => {
    if (!text.trim()) return "";
    if (translationCacheRef.current.has(text)) return translationCacheRef.current.get(text);
    
    try {
      const res = await fetch(`${API}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: signal
      });
      const data = await res.json();
      const hi = data.hi;
      translationCacheRef.current.set(text, hi);
      return hi;
    } catch (e) {
      if (e.name !== 'AbortError') console.error("Translation error:", e);
      return text; // Fallback to original
    }
  };

  const flushTranslateBuffer = async () => {
     if (translateBufferRef.current.length === 0 || !callActiveRef.current || !isProcessingRef.current) return;

     const batch = translateBufferRef.current.join(" ");
     translateBufferRef.current = [];

     let translated = batch;
     if (selectedLang === "hi-IN") {
        setIsBusy(true);
        translated = await translateToHindi(batch, abortController?.signal);
        setIsBusy(false);
     }

     if (!isProcessingRef.current) return; // Re-check after await

     // split back into sentences (supporting Hindi purna viram । as well)
     const parts = translated.split(/(?<=[.?!।])/);

     parts.forEach(p => {
        if (p.trim()) speechQueueRef.current.push(p.trim());
     });

     if (!isSpeechPlayingRef.current) {
        processSpeechQueue();
     }
  };

  const startCall = async () => {
    callActiveRef.current = true;
    setIsActive(true);
    setTranscript('');
    setAiResponse('Connecting to AI Tutor... Say something!');
    
    // Stronger browser audio block unlock trick
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const unlock = new SpeechSynthesisUtterance(" ");
        unlock.volume = 0.01;
        window.speechSynthesis.speak(unlock);
        await new Promise(r => setTimeout(r, 50));
        window.speechSynthesis.resume();
    }
    initVoiceNavigation();
  };

  // We no longer simulate or rely on Web Audio API since speechSynthesis streams are natively uncapturable by AudioContext 
  // directly without a destination proxy. Instead we will drive it beautifully via lexical boundary timing below.

  const createRecognition = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang;

    recognition.onstart = () => {
      if (callActiveRef.current) {
         setIsListening(true);
      }
    };

    recognition.onresult = (event) => {
      if (!recognitionEnabledRef.current) return;

      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
         // Ignore AI echo (prevents self-interrupt)
         if (isSpeaking && finalTranscript.length < 4) return;
         
         setTranscript(prev => {
             const newVal = (prev + ' ' + finalTranscript).trim();
             inputRefState.current = newVal;
             return newVal;
         });
         
         clearTimeout(silenceTimerRef.current);
         silenceTimerRef.current = setTimeout(() => {
              if (inputRefState.current.trim()) {
                  submitToAI(inputRefState.current);
              }
         }, 750);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.error("Speech recognition error", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Automatically recreate and keep listening if the browser engine natively timed out
      // Chrome forcefully kills continuous recognition after ~15 seconds of silence
      if (callActiveRef.current) {
          setTimeout(() => {
              try {
                  if (recognitionRef.current) recognitionRef.current.start();
              } catch (e) {}
          }, 100);
      } else {
          setIsListening(false);
      }
    };

    return recognition;
  };

  const initVoiceNavigation = () => {
      const rec = createRecognition();
      if (rec) {
          recognitionRef.current = rec;
          rec.start();
      } else {
          setAiResponse("Your browser does not support Voice Recognition.");
      }
  };

  const submitToAI = async (query) => {
    if (!query.trim() || !activeProj) return;
    
    // Lock the interface
    setIsSpeaking(true);
    setIsBusy(true);
    isProcessingRef.current = true;
    recognitionEnabledRef.current = false;
    setAiResponse('');
    setTranscript('');
    setCurrentCaption('');
    setHighlightIdx(0);
    inputRefState.current = '';
    
    speechQueueRef.current = [];
    translateBufferRef.current = [];
    isSpeechPlayingRef.current = false;
    responseBufferRef.current = '';
    
    let bufferStarted = false;

    const controller = new AbortController();
    setAbortController(controller);

    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: query,
            lang: selectedLang === "hi-IN" ? "hi" : "en",
            k: 2,
            max_chars: 1000
        }),
        signal: controller.signal
      });

      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let aiText = '';
      let spokenTextLength = 0;

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) { 
            // Flush remaining text from buffer safely
            if (responseBufferRef.current.length > spokenTextLength) {
                const finalChunk = responseBufferRef.current.slice(spokenTextLength).trim();
                const filteredFinal = finalChunk.replace(/(\\*|#|_|`|~|>|-)/g, '');
                if (filteredFinal.length > 0) {
                     speechQueueRef.current.push(filteredFinal);
                }
            } 
            
            // On completion, ensure we play whatever is left in the queue
            if (selectedLang === "hi-IN") {
                await flushTranslateBuffer();
            }

            if (speechQueueRef.current.length > 0 && !isSpeechPlayingRef.current) {
                processSpeechQueue();
            } else if (speechQueueRef.current.length === 0 && translateBufferRef.current.length === 0 && !isSpeechPlayingRef.current) {
                handleSpeechComplete();
            }

            break;  
        }
        
        // Append raw chunk to true total buffer history
        const decodedText = decoder.decode(value, { stream: true });
        responseBufferRef.current += decodedText;
        
        let unprocessed = responseBufferRef.current.slice(spokenTextLength);
        
        // 1️⃣ Prefer punctuation
        const sentenceMatch = unprocessed.match(/([.?!])(\s|$)/);

        if (sentenceMatch) {
             const endIndex = sentenceMatch.index + 1;
             let sentence = unprocessed.slice(0, endIndex).trim();
             
             // 🔥 Skip generic RAG intro automatically
             const skipPrefixes = [
               "based on the provided document context",
               "according to the document",
               "from the context",
               "the provided text suggests",
               "based on the provided context"
             ];
             sentence = sentence.replace(new RegExp(`^(${skipPrefixes.join("|")})[:,]?\\s*`, "i"), "");
             const filtered = sentence.replace(/(\\*|#|_|`|~|>|-)/g, '').trim();
             
             if (filtered.length > 0) {
                 if (selectedLang === "hi-IN") {
                     translateBufferRef.current.push(filtered);
                     if (translateBufferRef.current.length >= 3) {
                         flushTranslateBuffer();
                     }
                 } else {
                     speechQueueRef.current.push(filtered);
                     if (speechQueueRef.current.length >= 2 && !isSpeechPlayingRef.current) {
                        processSpeechQueue();
                     }
                 }
             }
             spokenTextLength += endIndex;
             
        } else if (unprocessed.length > 180) {
             // 2️⃣ Soft chunk fallback (no punctuation yet)
             const lastSpace = unprocessed.lastIndexOf(' ', 180);
             let chunk = unprocessed.slice(0, lastSpace > 0 ? lastSpace : 180).trim();
             
             const skipPrefixes = [
               "based on the provided document context",
               "according to the document",
               "from the context",
               "the provided text suggests",
               "based on the provided context"
             ];
             chunk = chunk.replace(new RegExp(`^(${skipPrefixes.join("|")})[:,]?\\s*`, "i"), "");
             const filtered = chunk.replace(/(\\*|#|_|`|~|>|-)/g, '').trim();
             
             if (filtered.length > 0) {
                 if (selectedLang === "hi-IN") {
                     translateBufferRef.current.push(filtered);
                     if (translateBufferRef.current.length >= 3) {
                         flushTranslateBuffer();
                     }
                 } else {
                     speechQueueRef.current.push(filtered);
                     if (speechQueueRef.current.length >= 2 && !isSpeechPlayingRef.current) {
                         processSpeechQueue();
                     }
                 }
             }
             spokenTextLength += lastSpace > 0 ? lastSpace : 180;
        }

        if (!bufferStarted && (speechQueueRef.current.length >= 1 || translateBufferRef.current.length >= 1)) {
             bufferStarted = true;
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
         setAiResponse('Generation Cancelled.');
      } else {
         setAiResponse('Connection failed.');
      }
      setIsSpeaking(false);
      setIsBusy(false);
      if (isActive) recognitionRef.current?.start();
    } finally {
      setAbortController(null);
    }
  };

  const getVoicesAsync = () =>
    new Promise(resolve => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) return resolve(voices);
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      // Optional safety timeout
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
    });

  const processSpeechQueue = async () => {
    if (!window.speechSynthesis) return;
    if (speechQueueRef.current.length === 0) {
        isSpeechPlayingRef.current = false;
        return;
    }
    
    isSpeechPlayingRef.current = true;
    const textToSpeak = speechQueueRef.current.shift();
    if (!textToSpeak) {
        isSpeechPlayingRef.current = false;
        return;
    }

    let cleanText = textToSpeak.replace(/(\\*|#|_|`|~|>|-)/g, '').trim();

    if (!cleanText) {
        processSpeechQueue();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = await getVoicesAsync();
    
    const preferredVoice = voices.find(v => v.lang === "hi-IN")
                        || voices.find(v => v.lang.startsWith("hi"))
                        || voices.find(v => v.name.includes("Online (Natural)") && v.lang.includes(selectedLang.split('-')[0]))
                        || voices.find(v => v.lang.includes(selectedLang.split('-')[0]) && v.name.includes("Google"))
                        || voices.find(v => v.lang.includes(selectedLang.split('-')[0]))
                        || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.lang = selectedLang;
    
    utterance.volume = 1;
    utterance.rate = selectedLang === "hi-IN" ? 0.85 : 1.0; 
    utterance.pitch = 1.0;
    utterance.onstart = () => {
        setCurrentCaption(cleanText);
        setHighlightIdx(0);
        setAudioLevel(0.4);
    };

    utterance.onboundary = (e) => {
        if (e.name === 'word') {
            // Track word index for cleaner highlighting across different languages
            const wordsBefore = cleanText.substring(0, e.charIndex).trim().split(/\s+/).filter(Boolean).length;
            setHighlightIdx(wordsBefore);
            
            const wordIntensity = 0.5 + Math.random() * 0.5;
            setAudioLevel(wordIntensity);
            
            clearTimeout(reqFrameRef.current);
            reqFrameRef.current = setTimeout(() => {
                 setAudioLevel(0.2); 
            }, 100);
        }
    };
    
    // Safety fallback for browsers that fail onend
    let fallbackClearTimeout;

    utterance.onend = () => {
        clearTimeout(fallbackClearTimeout);
        isSpeechPlayingRef.current = false;
        if (speechQueueRef.current.length > 0 || (selectedLang === 'hi-IN' && translateBufferRef.current.length > 0)) {
            // Either more speech in queue, or more pending in translation buffer
            if (speechQueueRef.current.length > 0) {
                processSpeechQueue();
            } else {
                // Wait for the translation buffer interval or manual flush to fill speechQueue
            }
        } else {
            handleSpeechComplete();
        }
    };
    
    utterance.onerror = (e) => {
        clearTimeout(fallbackClearTimeout);
        isSpeechPlayingRef.current = false;
        if (speechQueueRef.current.length > 0) {
            processSpeechQueue();
        } else {
            handleSpeechComplete();
        }
    };
    
    // Let the native engine handle chaining queued utterances naturally
    window.speechSynthesis.speak(utterance);
    
    // Failsafe in case browser TTS completely drops the ball and freezes without emitting any events
    const estimatedTimeMs = (cleanText.length / 10) * 1000 + 3000; 
    fallbackClearTimeout = setTimeout(() => {
        if (isSpeechPlayingRef.current) {
             isSpeechPlayingRef.current = false;
             window.speechSynthesis.cancel();
             if (speechQueueRef.current.length > 0) {
                 processSpeechQueue();
             } else {
                 handleSpeechComplete();
             }
        }
    }, estimatedTimeMs);
  };

  const handleSpeechComplete = () => {
      if (speechQueueRef.current.length === 0 && translateBufferRef.current.length === 0) {
          setIsSpeaking(false);
          setIsBusy(false);
          isProcessingRef.current = false;
          setCurrentCaption('');
          recognitionEnabledRef.current = true;
          setTranscript('');
          inputRefState.current = '';
      }
  };

  const handleInterrupt = () => {
     if (abortController) {
         abortController.abort();
         setAbortController(null);
     }
     if (window.speechSynthesis) {
         window.speechSynthesis.cancel();
     }
     
     // Clear all speech refs
     isSpeechPlayingRef.current = false;
     speechQueueRef.current = [];
     translateBufferRef.current = [];
     responseBufferRef.current = '';
     
     setCurrentCaption('');
     setAudioLevel(0);
     setIsSpeaking(false);
     setIsBusy(false);
     isProcessingRef.current = false;
     recognitionEnabledRef.current = true;
     setTranscript('');
     inputRefState.current = '';
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-yellow-300 border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] overflow-hidden relative z-50">
      
      {/* Top Header Actions */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
         <button onClick={onClose} className="w-12 h-12 bg-white border-4 border-slate-900 text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-all shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]">
             <ArrowLeft className="w-6 h-6 stroke-[3px]" />
         </button>

         <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="px-4 h-12 bg-white border-4 border-slate-900 text-slate-900 font-black uppercase flex items-center gap-2 hover:bg-slate-100 transition-all shadow-[4px_4px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a]"
            >
              <Globe className="w-5 h-5" />
              <span>{selectedLang === 'en-US' ? 'English' : 'हिंदी'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-40 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] overflow-hidden"
                >
                  <button 
                    onClick={() => { setSelectedLang('en-US'); setShowLangMenu(false); }}
                    className={`w-full text-left px-4 py-3 font-bold hover:bg-lime-200 transition-colors border-b-4 border-slate-900 ${selectedLang === 'en-US' ? 'bg-lime-300' : ''}`}
                  >
                    ENGLISH
                  </button>
                  <button 
                    onClick={() => { setSelectedLang('hi-IN'); setShowLangMenu(false); }}
                    className={`w-full text-left px-4 py-3 font-bold hover:bg-lime-200 transition-colors ${selectedLang === 'hi-IN' ? 'bg-lime-300' : ''}`}
                  >
                    हिंदी (HINDI)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>

      {/* Background Shapes */}
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-lime-300 border-[12px] border-slate-900 border-dashed rounded-full opacity-20 pointer-events-none" 
      />
      <motion.div 
        animate={{ rotate: -360 }} 
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        className="absolute -bottom-40 -left-20 w-[600px] h-[600px] bg-coral-300 border-[16px] border-slate-900 opacity-20 pointer-events-none shadow-[20px_20px_0px_#0f172a]" 
        style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}
      />

      <div className="z-10 flex flex-col items-center justify-center w-full max-w-2xl px-8">
        
        {/* Core Visualizer */}
        <div className="relative mb-8">
            <motion.div 
              animate={isListening && !isSpeaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-40 h-40 border-8 border-slate-900 flex items-center justify-center shadow-[12px_12px_0px_#0f172a] transition-all duration-500 z-20 relative ${isActive ? (isSpeaking ? 'bg-indigo-400 text-slate-900' : 'bg-lime-400 text-slate-900') : 'bg-white text-slate-900'}`}
            >
              {isActive ? (
                  isSpeaking ? <Loader className="w-16 h-16 animate-spin stroke-[3px]" /> : <Mic className="w-16 h-16 stroke-[3px]" />
              ) : (
                  <PhoneOff className="w-16 h-16 stroke-[3px]" />
              )}
            </motion.div>
            
            {/* Pulsing rings when listening */}
            {isListening && !isSpeaking && (
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <motion.div animate={{ scale: [1, 1.3], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute w-40 h-40 border-8 border-slate-900 bg-transparent" />
                    <motion.div animate={{ scale: [1, 1.6], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="absolute w-40 h-40 border-8 border-slate-900 bg-transparent" />
                </div>
            )}
            {/* Glowing ring/Visualizer when speaking */}
            {isSpeaking && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    {[...Array(5)].map((_, i) => {
                        const baseSize = 160;
                        const sizeBoost = (audioLevel * 100) * (1 + (i * 0.2)); 
                        
                        return (
                            <motion.div
                               key={`vis-${i}`}
                               className="absolute border-4 border-slate-900"
                               style={{ backgroundColor: i % 2 === 0 ? 'rgba(99, 102, 241, 0.2)' : 'transparent' }}
                               animate={{
                                   width: baseSize + sizeBoost,
                                   height: baseSize + sizeBoost,
                                   opacity: audioLevel > 0.1 ? 1 - (i * 0.15) : 0,
                                   rotate: audioLevel > 0.3 ? (i%2===0?1:-1)*10 : 0
                               }}
                               transition={{ type: "spring", damping: 15, stiffness: 250 }}
                            />
                        );
                    })}
                </div>
            )}
        </div>

        {/* Text Feeds */}
        <div className="text-center h-48 w-full flex flex-col items-center justify-center space-y-4 z-20">
            <AnimatePresence mode="wait">
                {isActive ? (
                    isSpeaking ? (
                       <motion.div key="speaking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-slate-900 space-y-4 max-w-3xl w-full flex flex-col items-center">
                           <div className="text-sm font-black bg-indigo-400 border-4 border-slate-900 px-4 py-2 tracking-widest uppercase shadow-[4px_4px_0px_#0f172a]">AI is Speaking</div>
                           <div className="text-xl md:text-2xl font-black uppercase tracking-tight leading-relaxed w-full px-4 text-center pb-4">
                              {currentCaption ? (
                                  (() => {
                                      const words = currentCaption.split(/\s+/);
                                      const spoken = words.slice(0, highlightIdx).join(" ");
                                      const activeWord = words[highlightIdx] || "";
                                      const upcoming = words.slice(highlightIdx + 1).join(" ");
                                      
                                      return (
                                          <div className="transition-all duration-150">
                                              <span className="text-slate-900/60 font-black">{spoken} </span>
                                              {activeWord && <span className="text-white bg-slate-900 border-4 border-slate-900 px-2 py-1 shadow-[4px_4px_0px_#0f172a] scale-110 inline-block mx-1 transition-transform">{activeWord}</span>}
                                              <span className="text-slate-900"> {upcoming}</span>
                                          </div>
                                      );
                                  })()
                              ) : (
                                  <span className="text-slate-900/50 animate-pulse bg-white border-4 border-slate-900 px-6 py-3 shadow-[8px_8px_0px_#0f172a]">Thinking...</span>
                              )}
                           </div>
                       </motion.div>
                    ) : (
                       <motion.div key="listening" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-slate-900 space-y-4 max-w-3xl w-full flex flex-col items-center">
                           <div className="text-sm font-black bg-lime-400 border-4 border-slate-900 px-4 py-2 tracking-widest uppercase shadow-[4px_4px_0px_#0f172a]">Listening...</div>
                           <div className="text-2xl font-black uppercase tracking-tight min-h-[1.75rem] max-w-2xl bg-white border-4 border-slate-900 p-6 shadow-[8px_8px_0px_#0f172a]">{transcript || "Waiting for your voice..."}</div>
                       </motion.div>
                    )
                ) : (
                    <motion.div key="inactive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-900 flex flex-col items-center">
                        <div className="text-4xl font-black uppercase tracking-tight mb-6 bg-white border-4 border-slate-900 px-6 py-4 shadow-[8px_8px_0px_#0f172a] -rotate-2">Hands-Free Call Mode</div>
                        <p className="font-bold text-lg bg-indigo-300 border-4 border-slate-900 px-6 py-3 shadow-[4px_4px_0px_#0f172a]">Have an interactive, low-latency vocal conversation with your project's AI context.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-12 flex items-center justify-center gap-6 z-20">
             {!isActive ? (
                 <button onClick={startCall} disabled={!activeProj} className="w-24 h-24 bg-lime-400 text-slate-900 border-4 border-slate-900 flex items-center justify-center hover:bg-lime-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] shadow-[8px_8px_0px_#0f172a] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0px_#0f172a]">
                     <Phone className="w-10 h-10 stroke-[3px]" />
                 </button>
             ) : (
                 <>
                     <button onClick={endCall} className="w-24 h-24 bg-red-400 text-slate-900 border-4 border-slate-900 flex items-center justify-center hover:bg-red-500 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] shadow-[8px_8px_0px_#0f172a]">
                         <PhoneOff className="w-10 h-10 stroke-[3px]" />
                     </button>
                     
                     <AnimatePresence>
                         {isSpeaking && (
                             <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={handleInterrupt} className="absolute ml-40 mt-12 w-16 h-16 bg-white text-slate-900 border-4 border-slate-900 flex items-center justify-center hover:bg-slate-100 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] shadow-[4px_4px_0px_#0f172a]">
                                 <Square className="w-6 h-6 fill-slate-900 stroke-[3px]" />
                             </motion.button>
                         )}
                     </AnimatePresence>
                 </>
             )}
        </div>
      </div>
    </div>
  );
}
