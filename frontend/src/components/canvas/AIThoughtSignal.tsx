import { motion } from 'framer-motion'

interface AIThoughtSignalProps {
  message: string
}

/**
 * AI THOUGHT SIGNAL
 * 
 * Small text that fades in and out to show ORBIT is "thinking"
 * 
 * Examples:
 * - "Reprioritizing..."
 * - "Reducing scope..."
 * - "Pattern detected"
 * 
 * Philosophy:
 * - Subtle, not intrusive
 * - Fades naturally
 * - Shows intelligence without overwhelming
 */
export function AIThoughtSignal({ message }: AIThoughtSignalProps) {
  return (
    <motion.div
      className="thought-signal mb-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-subtle">
        {/* Thinking indicator */}
        <motion.div
          className="flex gap-1"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-1 h-1 rounded-full bg-orbit-calm" />
          <div className="w-1 h-1 rounded-full bg-orbit-calm" />
          <div className="w-1 h-1 rounded-full bg-orbit-calm" />
        </motion.div>
        
        <span className="text-sm text-orbit-muted italic">
          {message}
        </span>
      </div>
    </motion.div>
  )
}
