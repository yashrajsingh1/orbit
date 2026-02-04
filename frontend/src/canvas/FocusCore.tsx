/**
 * ORBIT Focus Core
 * 
 * The centerpiece of the cognitive canvas.
 * A soft glowing orb that represents current intent/focus.
 * 
 * States:
 * - idle: slow breathing animation
 * - listening: ripple waves (voice input)
 * - thinking: subtle rotation
 * - acting: pulse outward
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';

export type CoreState = 'idle' | 'listening' | 'thinking' | 'acting' | 'silent';

interface FocusCoreProps {
  state: CoreState;
  urgency?: number; // 0-1, affects size and glow
  onTap?: () => void;
  onLongPress?: () => void;
  onLongPressEnd?: () => void;
}

export function FocusCore({ 
  state, 
  urgency = 0.3,
  onTap,
  onLongPress,
  onLongPressEnd 
}: FocusCoreProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic size based on urgency (80-160px)
  const baseSize = 80 + (urgency * 80);
  
  // Dynamic glow intensity
  const glowIntensity = 0.3 + (urgency * 0.4);

  const handlePointerDown = useCallback(() => {
    setIsPressed(true);
    
    // Long press detection (500ms)
    const timer = setTimeout(() => {
      onLongPress?.();
    }, 500);
    
    setLongPressTimer(timer);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // If released before long press, it's a tap
      if (state !== 'listening') {
        onTap?.();
      } else {
        onLongPressEnd?.();
      }
    }
  }, [longPressTimer, onTap, onLongPressEnd, state]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (isPressed && state === 'listening') {
      onLongPressEnd?.();
    }
    setIsPressed(false);
  }, [longPressTimer, isPressed, state, onLongPressEnd]);

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow layers */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: baseSize * 2.5,
          height: baseSize * 2.5,
          background: `radial-gradient(circle, rgba(10, 132, 255, ${glowIntensity * 0.12}) 0%, transparent 70%)`,
        }}
        animate={state === 'idle' ? {
          scale: [1, 1.08, 1],
          opacity: [0.5, 0.7, 0.5],
        } : state === 'listening' ? {
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.9, 0.6],
        } : state === 'thinking' ? {
          rotate: [0, 360],
          scale: [1, 1.03, 1],
        } : state === 'acting' ? {
          scale: [1, 1.4, 1],
          opacity: [0.7, 0.3, 0.7],
        } : {
          scale: 0.8,
          opacity: 0.15,
        }}
        transition={state === 'idle' ? {
          duration: 5,
          repeat: Infinity,
          ease: [0.25, 0.1, 0.25, 1],
        } : state === 'listening' ? {
          duration: 1.8,
          repeat: Infinity,
          ease: [0.25, 0.1, 0.25, 1],
        } : state === 'thinking' ? {
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        } : state === 'acting' ? {
          duration: 1,
          repeat: Infinity,
          ease: [0, 0, 0.58, 1],
        } : {
          duration: 2.5,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      />

      {/* Middle glow layer */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: baseSize * 1.8,
          height: baseSize * 1.8,
          background: `radial-gradient(circle, rgba(100, 210, 255, ${glowIntensity * 0.18}) 0%, transparent 60%)`,
        }}
        animate={state === 'idle' ? {
          scale: [1, 1.04, 1],
        } : state === 'listening' ? {
          scale: [1, 1.15, 1],
        } : {}}
        transition={{
          duration: state === 'listening' ? 1.2 : 4,
          repeat: Infinity,
          ease: [0.25, 0.1, 0.25, 1],
          delay: 0.3,
        }}
      />

      {/* Ripple rings for listening state */}
      <AnimatePresence>
        {state === 'listening' && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`ripple-${i}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: baseSize,
                  height: baseSize,
                  border: '1px solid rgba(100, 210, 255, 0.3)',
                }}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.7,
                  ease: [0, 0, 0.58, 1],
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Core orb */}
      <motion.div
        className="relative rounded-full cursor-pointer select-none"
        style={{
          width: baseSize,
          height: baseSize,
          background: `
            radial-gradient(circle at 30% 30%, 
              rgba(100, 210, 255, 0.6) 0%, 
              rgba(10, 132, 255, 0.5) 40%, 
              rgba(10, 100, 200, 0.3) 70%,
              rgba(10, 80, 160, 0.15) 100%
            )
          `,
          boxShadow: `
            0 0 ${35 * glowIntensity}px rgba(10, 132, 255, ${glowIntensity * 0.8}),
            0 0 ${70 * glowIntensity}px rgba(100, 210, 255, ${glowIntensity * 0.4}),
            inset 0 0 ${25 * glowIntensity}px rgba(255, 255, 255, 0.08)
          `,
        }}
        animate={state === 'idle' ? {
          scale: [1, 1.015, 1],
        } : state === 'listening' ? {
          scale: [1, 1.04, 1],
        } : state === 'thinking' ? {
          rotate: [0, 5, -5, 0],
        } : state === 'acting' ? {
          scale: [1, 1.1, 1],
        } : {
          scale: 0.9,
          opacity: 0.5,
        }}
        transition={state === 'idle' ? {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        } : state === 'listening' ? {
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        } : state === 'thinking' ? {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        } : state === 'acting' ? {
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeOut',
        } : {
          duration: 2,
        }}
        whileTap={{ scale: 0.95 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* Inner shine */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15) 0%, transparent 50%)',
          }}
        />

        {/* Mic icon for listening state */}
        <AnimatePresence>
          {state === 'listening' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <svg 
                width={baseSize * 0.3} 
                height={baseSize * 0.3} 
                viewBox="0 0 24 24" 
                fill="none"
                className="text-white/80"
              >
                <path 
                  d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" 
                  fill="currentColor"
                />
                <path 
                  d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking indicator */}
        <AnimatePresence>
          {state === 'thinking' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex gap-1"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/60"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default FocusCore;
