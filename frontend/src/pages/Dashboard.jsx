import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Slide1 from '../components/Slide1';
import Slide2 from '../components/Slide2';
import Slide3 from '../components/Slide3';
import Slide4 from '../components/Slide4';

const slides = [Slide1, Slide2, Slide3, Slide4];

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
      <div className="absolute inset-0 bg-gradient-to-br from-[#eef2ff] to-[#e0f2fe] z-[-1]"></div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-100 z-50">
        <motion.div 
          className="h-full bg-indigo-600 rounded-r-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Mini Slide Index */}
      <div className="absolute top-8 right-10 z-50 flex space-x-3 bg-white/50 p-3 rounded-full backdrop-blur-md shadow-sm border border-white">
        {slides.map((_, idx) => (
          <div 
            key={idx} 
            onClick={() => { setDirection(idx > currentSlide ? 1 : -1); setCurrentSlide(idx); }}
            className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all duration-300 ${idx === currentSlide ? 'bg-indigo-600 scale-125 shadow-md' : 'bg-indigo-200 hover:bg-indigo-300'}`}
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
      <div className="absolute bottom-10 left-10 z-50">
        <button 
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`neu-panel p-4 flex items-center justify-center rounded-2xl ${currentSlide === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-50'}`}
        >
          <ChevronLeft className="w-8 h-8 text-indigo-600" />
        </button>
      </div>

      <div className="absolute bottom-10 right-10 z-50">
        <button 
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className={`neu-panel p-4 flex items-center justify-center rounded-2xl ${currentSlide === slides.length - 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-50'}`}
        >
          <ChevronRight className="w-8 h-8 text-indigo-600" />
        </button>
      </div>
    </div>
  );
}
