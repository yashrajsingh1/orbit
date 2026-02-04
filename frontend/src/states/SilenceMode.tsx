/**
 * ORBIT Silence Mode
 * 
 * When nothing is needed, UI dims, motion slows.
 * Says: "I'm here when needed."
 */

import { motion, AnimatePresence } from 'framer-motion';

interface SilenceModeProps {
  isActive: boolean;
  children: React.ReactNode;
}

export function SilenceMode({ isActive, children }: SilenceModeProps) {
  return (
    <div className="relative">
      {/* Content with dimming */}
      <motion.div
        animate={{
          opacity: isActive ? 0.25 : 1,
          filter: isActive ? 'blur(0.5px)' : 'blur(0px)',
        }}
        transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>

      {/* Silence overlay message */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.p
              className="text-[15px] font-light"
              style={{ color: '#48484a', letterSpacing: '-0.01em' }}
              animate={{ opacity: [0.08, 0.15, 0.08] }}
              transition={{ duration: 5, repeat: Infinity, ease: [0.25, 0.1, 0.25, 1] }}
            >
              Here when you need me
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SilenceMode;
