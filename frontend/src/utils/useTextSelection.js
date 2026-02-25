import { useState, useEffect } from 'react';

export function useTextSelection() {
  const [selection, setSelection] = useState({
    text: '',
    rect: null,
  });

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const activeSelection = window.getSelection();
        const text = activeSelection.toString().trim();
        
        // Ensure we only show popup if it's a decent amount of text
        if (text && text.length > 5) {
          const range = activeSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelection({
            text,
            rect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            }
          });
        } else {
          setSelection({ text: '', rect: null });
        }
      }, 10);
    };

    const handleMouseDown = () => {
       // Only clear if clicking outside our own popup? We'll handle this in the UI
       // For now, let's keep it simple: mousedown clears selection if not in popup
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return { selection, setSelection };
}
