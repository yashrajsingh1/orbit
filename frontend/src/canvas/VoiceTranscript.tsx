/**
 * ORBIT Voice Transcript
 * 
 * Shows transcribed text briefly, then fades away.
 * No transcript spam — clean and respectful.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface VoiceTranscriptProps {
  text: string;
  isListening: boolean;
  onFadeComplete?: () => void;
}

export function VoiceTranscript({ 
  text, 
  isListening,
  onFadeComplete 
}: VoiceTranscriptProps) {
  const [displayText, setDisplayText] = useState('');
  const [shouldShow, setShouldShow] = useState(false);

  // Update display text while listening
  useEffect(() => {
    if (isListening && text) {
      setDisplayText(text);
      setShouldShow(true);
    }
  }, [text, isListening]);

  // Fade out after listening stops
  useEffect(() => {
    if (!isListening && displayText) {
      const timer = setTimeout(() => {
        setShouldShow(false);
        setTimeout(() => {
          setDisplayText('');
          onFadeComplete?.();
        }, 600);
      }, 1800); // Show for 1.8s after listening stops
      
      return () => clearTimeout(timer);
    }
  }, [isListening, displayText, onFadeComplete]);

  return (
    <AnimatePresence>
      {shouldShow && displayText && (
        <motion.div
          className="fixed inset-x-0 top-1/4 z-40 flex justify-center px-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            className="max-w-lg text-center"
            layout
          >
            {/* Subtle background */}
            <div className="relative px-10 py-5">
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{
                  backgroundColor: 'rgba(28, 28, 30, 0.7)',
                  backdropFilter: 'saturate(180%) blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              
              {/* Text */}
              <motion.p
                className="relative text-[17px] text-[#f5f5f7] font-light tracking-[-0.02em] leading-[1.4]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={displayText}
              >
                "{displayText}"
              </motion.p>
            </div>
            
            {/* Listening indicator */}
            {isListening && (
              <motion.div
                className="flex items-center justify-center gap-1 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] rounded-full"
                    style={{ backgroundColor: 'rgba(10, 132, 255, 0.8)' }}
                    animate={{
                      height: [6, 18, 6],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.08,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VoiceTranscript;
