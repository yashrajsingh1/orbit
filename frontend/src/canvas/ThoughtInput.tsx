/**
 * ORBIT Thought Input
 * 
 * Minimal, elegant text input.
 * Not a chat box — a thought field.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

interface ThoughtInputProps {
  isVisible: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export function ThoughtInput({ 
  isVisible, 
  onSubmit, 
  onClose,
  placeholder = "What's on your mind?"
}: ThoughtInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={onClose}
          />
          
          {/* Input container */}
          <motion.div
            className="fixed inset-x-0 top-[35%] z-50 flex justify-center px-6"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="w-full max-w-lg">
              {/* Subtle glow */}
              <div 
                className="absolute inset-0 -m-6 rounded-[2rem] pointer-events-none"
                style={{ 
                  background: 'radial-gradient(circle, rgba(10, 132, 255, 0.08) 0%, transparent 70%)',
                  filter: 'blur(40px)'
                }}
              />
              
              {/* Input field */}
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={1}
                  className="
                    w-full px-6 py-5
                    rounded-2xl
                    text-[#f5f5f7] text-xl font-light tracking-[-0.024em]
                    placeholder:text-[#48484a]
                    focus:outline-none
                    resize-none
                    transition-all duration-300
                  "
                  style={{
                    minHeight: '68px',
                    maxHeight: '200px',
                    background: 'rgba(28, 28, 30, 0.8)',
                    backdropFilter: 'saturate(180%) blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                  }}
                />
                
                {/* Submit hint */}
                <motion.div
                  className="absolute right-5 bottom-5 flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: value.trim() ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-[11px] text-[#6e6e73]">Return</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] text-[#a1a1a6] bg-[rgba(255,255,255,0.06)] rounded-md">↵</kbd>
                </motion.div>
              </div>
              
              {/* Subtle hint text */}
              <motion.p
                className="text-center text-[13px] text-[#48484a] mt-5 font-normal tracking-[-0.008em]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                Express your thought. ORBIT understands context.
              </motion.p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ThoughtInput;
