import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Book, Coffee, Zap } from 'lucide-react';

const PRESETS = [
  { id: 'study', label: 'Study', minutes: 25, icon: <Book className="w-5 h-5" />, color: 'bg-indigo-400' },
  { id: 'short', label: 'Short Break', minutes: 5, icon: <Coffee className="w-5 h-5" />, color: 'bg-lime-400' },
  { id: 'long', label: 'Long Break', minutes: 15, icon: <Zap className="w-5 h-5" />, color: 'bg-yellow-300' },
];

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [activePreset, setActivePreset] = useState(PRESETS[0]);
  const [timeLeft, setTimeLeft] = useState(PRESETS[0].minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isHardcore, setIsHardcore] = useState(false);
  const [violations, setViolations] = useState(0);
  const timerRef = useRef(null);

  // Core Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      clearInterval(timerRef.current);
      if (isHardcore) exitHardcore();
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft, isHardcore]);

  // Hardcore Focus Enforcement
  useEffect(() => {
    if (!isHardcore || !isActive) return;

    const handleViolation = () => {
      setViolations(prev => {
        const next = prev + 1;
        if (next >= 3) {
          triggerReset();
          return 0;
        }
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation();
      }
    };

    const handleBlur = () => {
      handleViolation();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isHardcore, isActive]);

  const triggerReset = () => {
    setIsActive(false);
    setIsHardcore(false);
    setViolations(0);
    setTimeLeft(activePreset.minutes * 60);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const exitHardcore = () => {
    setIsHardcore(false);
    setViolations(0);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleTimer = () => {
    if (!isActive && isHardcore) {
      document.documentElement.requestFullscreen().catch(() => {
        console.warn("Fullscreen request failed");
      });
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setViolations(0);
    setTimeLeft(activePreset.minutes * 60);
    if (isHardcore && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handlePresetChange = (preset) => {
    setActivePreset(preset);
    setTimeLeft(preset.minutes * 60);
    setIsActive(false);
    setViolations(0);
    if (isHardcore && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleHardcore = () => {
    setIsHardcore(!isHardcore);
    setViolations(0);
  };

  return (
    <TimerContext.Provider value={{
      timeLeft,
      isActive,
      activePreset,
      isHardcore,
      violations,
      PRESETS,
      toggleTimer,
      resetTimer,
      handlePresetChange,
      toggleHardcore
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);
