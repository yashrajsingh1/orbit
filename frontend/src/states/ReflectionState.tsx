/**
 * ORBIT Reflection State
 * 
 * Evening reflection - shows ONE insight only.
 * No charts. No metrics. Just awareness.
 */

import { motion, AnimatePresence } from 'framer-motion';

interface ReflectionStateProps {
  isVisible: boolean;
  insight?: string;
  onDismiss?: () => void;
}

export function ReflectionState({ 
  isVisible, 
  insight,
  onDismiss 
}: ReflectionStateProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={onDismiss}
        >
          {/* Gradient overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at center, 
                  rgba(20, 20, 22, 0.97) 0%, 
                  rgba(10, 10, 12, 0.99) 50%,
                  rgba(0, 0, 0, 1) 100%
                )
              `,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.8 }}
          />

          {/* Ambient particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: 'rgba(10, 132, 255, 0.15)',
                }}
                animate={{
                  y: [0, -25, 0],
                  opacity: [0, 0.4, 0],
                }}
                transition={{
                  duration: 5 + Math.random() * 5,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              />
            ))}
          </div>

          {/* Content */}
          <motion.div
            className="relative z-10 max-w-lg px-10 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Moon icon */}
            <motion.div
              className="mb-10"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <svg 
                width="44" 
                height="44" 
                viewBox="0 0 24 24" 
                fill="none"
                className="mx-auto"
                style={{ color: 'rgba(100, 210, 255, 0.4)' }}
              >
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  fill="currentColor"
                />
              </svg>
            </motion.div>

            {/* Time label */}
            <motion.p
              className="text-[11px] uppercase mb-8"
              style={{ 
                color: '#6e6e73',
                letterSpacing: '0.06em'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Evening Reflection
            </motion.p>

            {/* Insight */}
            {insight && (
              <motion.p
                className="text-[22px] font-light leading-[1.35]"
                style={{ 
                  color: '#f5f5f7',
                  letterSpacing: '-0.022em'
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                "{insight}"
              </motion.p>
            )}

            {/* Dismiss hint */}
            <motion.p
              className="mt-14 text-[13px]"
              style={{ color: '#48484a' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2 }}
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ReflectionState;
