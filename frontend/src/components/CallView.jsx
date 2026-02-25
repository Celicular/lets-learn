import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, Square, Loader, ArrowLeft } from 'lucide-react';

const API = 'http://localhost:8000';

export default function CallView({ activeProj, setIsBusy, onClose }) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [currentCaption, setCurrentCaption] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  
  const [abortController, setAbortController] = useState(null);
  
  const recognitionRef = useRef(null);
  const recognitionEnabledRef = useRef(true);
  const silenceTimerRef = useRef(null);
  const inputRefState = useRef('');
  const speechQueueRef = useRef([]);
  const isSpeechPlayingRef = useRef(false);
  const responseBufferRef = useRef('');
  
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const reqFrameRef = useRef(null);
  const callActiveRef = useRef(false);

  // Keep state sync for timeouts
  useEffect(() => { inputRefState.current = transcript; }, [transcript]);

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
    setIsBusy(false);
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
    recognition.lang = 'en-US';

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
    recognitionEnabledRef.current = false;
    setAiResponse('');
    setTranscript('');
    setCurrentCaption('');
    setHighlightIdx(0);
    inputRefState.current = '';
    
    speechQueueRef.current = [];
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
            if (speechQueueRef.current.length > 0 && !isSpeechPlayingRef.current) {
                processSpeechQueue();
            } else if (speechQueueRef.current.length === 0 && !isSpeechPlayingRef.current) {
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
                 speechQueueRef.current.push(filtered);
                 if (speechQueueRef.current.length >= 2 && !isSpeechPlayingRef.current) {
                     processSpeechQueue();
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
                 speechQueueRef.current.push(filtered);
                 if (speechQueueRef.current.length >= 2 && !isSpeechPlayingRef.current) {
                     processSpeechQueue();
                 }
             }
             spokenTextLength += lastSpace > 0 ? lastSpace : 180;
        }

        if (!bufferStarted && speechQueueRef.current.length >= 1) {
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

    const cleanText = textToSpeak.replace(/(\\*|#|_|`|~|>|-)/g, '').trim();
    if (!cleanText) {
        processSpeechQueue();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = await getVoicesAsync();
    
    const preferredVoice = voices.find(v => v.name.includes("Online (Natural)") && v.lang.includes("en"))
                        || voices.find(v => v.name.includes("Google UK English Female"))
                        || voices.find(v => v.name.includes("Google US English"))
                        || voices.find(v => v.name.includes("Google") && v.name.includes("Female") && v.lang.includes("en")) 
                        || voices.find(v => v.name.includes("Natural") && v.lang.includes("en"))
                        || voices.find(v => v.name.includes("Zira"))
                        || voices.find(v => v.lang.startsWith("en"))
                        || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.volume = 1;
    utterance.rate = 1.0; 
    
    utterance.onstart = () => {
        setCurrentCaption(cleanText);
        setHighlightIdx(0);
        setAudioLevel(0.4);
    };

    utterance.onboundary = (e) => {
        // Fallback checks just in case the browser provides undefined indices
        if (e.name === 'word' || e.charIndex !== undefined) {
            setHighlightIdx(e.charIndex);
            
            // 💡 Simulate highly realistic voice mapping sync using the natural boundary rhythm!
            // When a word triggers, Spike the visualizer mapping 0.6 -> 0.95 depending on word length
            const wordIntensity = 0.5 + Math.random() * 0.5;
            setAudioLevel(wordIntensity);
            
            // Then let it decay quickly before the next word to mimic natural syllable drop-off
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
        if (speechQueueRef.current.length > 0) {
            processSpeechQueue();
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
      if (speechQueueRef.current.length === 0) {
          setIsSpeaking(false);
          setIsBusy(false);
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
     isSpeechPlayingRef.current = false;
     speechQueueRef.current = [];
     responseBufferRef.current = '';
     setCurrentCaption('');
     setAudioLevel(0);
     setIsSpeaking(false);
     setIsBusy(false);
     recognitionEnabledRef.current = true;
     setTranscript('');
     inputRefState.current = '';
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f172a] rounded-3xl overflow-hidden relative shadow-inner">
      
      {/* Top Header Actions */}
      <div className="absolute top-6 left-6 z-30">
         <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-md">
             <ArrowLeft className="w-5 h-5" />
         </button>
      </div>

      {/* Background Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[400px] h-[400px] bg-indigo-600/20 blur-[100px] rounded-full" 
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }} 
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute w-[300px] h-[300px] bg-violet-600/20 blur-[80px] rounded-full" 
      />

      <div className="z-10 flex flex-col items-center justify-center w-full max-w-2xl px-8">
        
        {/* Core Visualizer */}
        <div className="relative mb-8">
            <motion.div 
              animate={isListening && !isSpeaking ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-20 relative ${isActive ? (isSpeaking ? 'bg-indigo-600 shadow-indigo-500/50' : 'bg-emerald-500 shadow-emerald-500/50') : 'bg-slate-800'}`}
            >
              {isActive ? (
                  isSpeaking ? <Loader className="w-12 h-12 text-white animate-spin" /> : <Mic className="w-12 h-12 text-white" />
              ) : (
                  <PhoneOff className="w-12 h-12 text-slate-500" />
              )}
            </motion.div>
            
            {/* Pulsing rings when listening */}
            {isListening && !isSpeaking && (
                <>
                    <motion.div animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-emerald-500 rounded-full z-10" />
                    <motion.div animate={{ scale: [1, 2], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="absolute inset-0 bg-emerald-500 rounded-full z-10" />
                </>
            )}
            {/* Glowing ring/Visualizer when speaking */}
            {isSpeaking && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Audio visualizer spheres tied to actual TTS volume level out of 1.0 */}
                    {[...Array(5)].map((_, i) => {
                        const baseSize = 130;
                        // Stagger the intensity slightly for each ring to look complex
                        const sizeBoost = (audioLevel * 100) * (1 + (i * 0.2)); 
                        
                        return (
                            <motion.div
                               key={`vis-${i}`}
                               className="absolute rounded-full border border-indigo-500/50"
                               animate={{
                                   width: baseSize + sizeBoost,
                                   height: baseSize + sizeBoost,
                                   opacity: audioLevel > 0.1 ? 0.8 - (i * 0.1) : 0.2,
                                   borderWidth: Math.max(2, audioLevel * 8)
                               }}
                               transition={{ type: "spring", damping: 15, stiffness: 250 }}
                            />
                        );
                    })}
                    {/* Outer ripple */}
                    <motion.div 
                        animate={{ 
                            scale: 1 + (audioLevel * 0.8), 
                            opacity: audioLevel > 0.1 ? 0.4 : 0 
                        }} 
                        transition={{ type: "spring", damping: 12 }} 
                        className="absolute inset-m-4 border-4 border-indigo-400 rounded-full" 
                        style={{ left: -16, right: -16, top: -16, bottom: -16 }} 
                    />
                </div>
            )}
        </div>

        {/* Text Feeds */}
        <div className="text-center h-48 w-full flex flex-col items-center justify-center space-y-4">
            <AnimatePresence mode="wait">
                {isActive ? (
                    isSpeaking ? (
                       <motion.div key="speaking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-white space-y-3 max-w-2xl w-full flex flex-col items-center">
                           <div className="text-xs font-bold text-indigo-400 tracking-widest uppercase mb-2">AI is Speaking</div>
                           <div className="text-sm md:text-base opacity-80 font-medium leading-relaxed w-full px-4 text-center pb-4">
                              {currentCaption ? (
                                  (() => {
                                      // Find next space or end of string safely
                                      let nextSpace = currentCaption.indexOf(' ', highlightIdx);
                                      if (nextSpace === -1) nextSpace = currentCaption.length;
                                      
                                      // Optional bounds checking
                                      const safeHighlightIndex = Math.min(highlightIdx, currentCaption.length);
                                      
                                      const spoken = currentCaption.substring(0, safeHighlightIndex);
                                      const activeWord = currentCaption.substring(safeHighlightIndex, nextSpace);
                                      const upcoming = currentCaption.substring(nextSpace);
                                      
                                      return (
                                          <div className="transition-all duration-150">
                                              <span className="text-indigo-300 font-semibold">{spoken}</span>
                                              <span className="text-white font-black bg-indigo-500/40 px-1 py-0.5 rounded shadow-lg scale-110 inline-block mx-0.5 transition-transform">{activeWord}</span>
                                              <span className="text-slate-400 font-medium">{upcoming}</span>
                                          </div>
                                      );
                                  })()
                              ) : (
                                  <span className="text-indigo-300/80 animate-pulse">Thinking...</span>
                              )}
                           </div>
                       </motion.div>
                    ) : (
                       <motion.div key="listening" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-white space-y-2 max-w-lg w-full">
                           <div className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Listening...</div>
                           <div className="text-lg font-medium text-slate-300 min-h-[1.75rem]">{transcript || "Waiting for your voice..."}</div>
                       </motion.div>
                    )
                ) : (
                    <motion.div key="inactive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-400">
                        <div className="text-2xl font-bold text-white mb-2">Hands-Free Call Mode</div>
                        <p>Have an interactive, low-latency vocal conversation with your project's AI context.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
             {!isActive ? (
                 <button onClick={startCall} disabled={!activeProj} className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:hover:scale-100">
                     <Phone className="w-7 h-7" />
                 </button>
             ) : (
                 <>
                     <button onClick={endCall} className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-transform hover:scale-105 shadow-xl">
                         <PhoneOff className="w-7 h-7" />
                     </button>
                     
                     <AnimatePresence>
                         {isSpeaking && (
                             <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={handleInterrupt} className="absolute ml-32 w-12 h-12 bg-slate-700 text-white rounded-full flex items-center justify-center hover:bg-slate-600 transition-transform hover:scale-105 shadow-xl">
                                 <Square className="w-5 h-5 fill-white" />
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
