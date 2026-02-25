import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Slide1 from '../components/Slide1';
import Slide2 from '../components/Slide2';
import Slide2_2 from '../components/Slide2_2';
import Slide3 from '../components/Slide3';
import Slide3_2 from '../components/Slide3_2';
import Slide4 from '../components/Slide4';

const slides = [Slide1, Slide2, Slide2_2, Slide3, Slide3_2, Slide4];

export default function Dashboard() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95,
      filter: 'blur(10px)',
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95,
      filter: 'blur(10px)',
    })
  };

  const CurrentComponent = slides[currentSlide];

  return (
    <div className="h-screen w-screen overflow-hidden text-slate-800 relative select-none font-sans bg-[#e6ebf5]">
      
      {/* Background decoration to match neat neumorphism gradient */}
      <div className="absolute inset-0 bg-yellow-300 z-[-1] pointer-events-none"></div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-3 bg-white border-b-4 border-slate-900 z-50">
        <motion.div 
          className="h-full bg-cyan-400 border-r-4 border-slate-900"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Mini Slide Index */}
      <div className="absolute top-6 right-6 md:top-8 md:right-10 z-50 flex space-x-3 bg-white border-4 border-slate-900 p-3 shadow-[6px_6px_0px_#0f172a]">
        {slides.map((_, idx) => (
          <div 
            key={idx} 
            onClick={() => { setDirection(idx > currentSlide ? 1 : -1); setCurrentSlide(idx); }}
            className={`w-4 h-4 border-2 border-slate-900 cursor-pointer transition-all duration-300 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${idx === currentSlide ? 'bg-lime-400 scale-125 shadow-[0px_0px_0px_#0f172a] translate-x-[1px] translate-y-[1px]' : 'bg-slate-200 hover:bg-lime-300'}`}
          />
        ))}
      </div>

      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: "spring", stiffness: 280, damping: 32 }, opacity: { duration: 0.3 } }}
          className="absolute inset-0 flex items-center justify-center p-8 md:p-16"
        >
          <CurrentComponent />
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-50">
        <button 
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-3 md:p-4 flex items-center justify-center transition-all ${currentSlide === 0 ? 'opacity-40 cursor-not-allowed shadow-none translate-x-[2px] translate-y-[2px]' : 'cursor-pointer hover:bg-amber-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'}`}
        >
          <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-slate-900 stroke-[3px]" />
        </button>
      </div>

      <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-50">
        <button 
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className={`bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-3 md:p-4 flex items-center justify-center transition-all ${currentSlide === slides.length - 1 ? 'opacity-40 cursor-not-allowed shadow-none translate-x-[2px] translate-y-[2px]' : 'cursor-pointer hover:bg-indigo-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'}`}
        >
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-slate-900 stroke-[3px]" />
        </button>
      </div>
    </div>
  );
}
