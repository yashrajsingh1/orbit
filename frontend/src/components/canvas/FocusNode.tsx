import { motion } from 'framer-motion'
import { Intent, IntentInterpretation, Task } from '@/types'

interface FocusNodeProps {
  intent: Intent | null
  interpretation: IntentInterpretation | null
  focusedTask: Task | null
}

/**
 * FOCUS NODE
 * 
 * The central element of the Cognitive Canvas.
 * Represents the user's current focus.
 * 
 * States:
 * - Empty: Calm, inviting pulse
 * - Intent: Shows interpreted intent
 * - Focused Task: Shows active task
 */
export function FocusNode({ intent, interpretation, focusedTask }: FocusNodeProps) {
  // Determine what to display
  const hasContent = !!intent || !!focusedTask
  const displayText = focusedTask?.title || interpretation?.interpreted_intent || intent?.raw_input || ''
  const emotionalTone = interpretation?.emotional_tone || 'neutral'
  
  // Color based on emotional tone
  const toneColors: Record<string, string> = {
    calm: 'from-orbit-calm/30 to-orbit-calm/10',
    stressed: 'from-amber-500/30 to-amber-500/10',
    excited: 'from-orbit-energy/30 to-orbit-energy/10',
    overwhelmed: 'from-red-500/30 to-red-500/10',
    neutral: 'from-orbit-focus/30 to-orbit-focus/10',
  }
  
  const glowColor = toneColors[emotionalTone] || toneColors.neutral

  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Outer glow */}
      <motion.div
        className={`
          absolute w-48 h-48 rounded-full
          bg-gradient-radial ${glowColor}
          blur-2xl
        `}
        animate={{
          scale: hasContent ? [1, 1.1, 1] : [1, 1.05, 1],
          opacity: hasContent ? [0.5, 0.7, 0.5] : [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: hasContent ? 2 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Core node */}
      <motion.div
        className={`
          relative w-40 h-40 rounded-full
          glass-strong
          flex items-center justify-center
          cursor-pointer
          ${hasContent ? 'focus-glow-active' : 'focus-glow'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          boxShadow: hasContent
            ? [
                '0 0 30px rgba(99, 102, 241, 0.5)',
                '0 0 50px rgba(99, 102, 241, 0.7)',
                '0 0 30px rgba(99, 102, 241, 0.5)',
              ]
            : [
                '0 0 20px rgba(99, 102, 241, 0.3)',
                '0 0 30px rgba(99, 102, 241, 0.4)',
                '0 0 20px rgba(99, 102, 241, 0.3)',
              ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {hasContent ? (
          <FocusContent
            text={displayText}
            isTask={!!focusedTask}
            urgency={interpretation?.urgency}
          />
        ) : (
          <EmptyState />
        )}
      </motion.div>

      {/* Urgency indicator */}
      {interpretation?.urgency === 'high' || interpretation?.urgency === 'critical' ? (
        <motion.div
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      ) : null}
    </motion.div>
  )
}

function FocusContent({ 
  text, 
  isTask,
  urgency 
}: { 
  text: string
  isTask: boolean
  urgency?: string 
}) {
  return (
    <div className="text-center px-4">
      {isTask && (
        <span className="text-xs text-orbit-muted uppercase tracking-wide">
          Focused on
        </span>
      )}
      <p className="text-sm font-medium text-orbit-text mt-1 line-clamp-3">
        {text}
      </p>
      {urgency && urgency !== 'medium' && (
        <span className={`
          text-xs mt-2 inline-block
          ${urgency === 'high' || urgency === 'critical' 
            ? 'text-amber-400' 
            : 'text-orbit-muted'}
        `}>
          {urgency} priority
        </span>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center px-4">
      <motion.div
        className="w-8 h-8 mx-auto mb-2 rounded-full bg-orbit-focus/20"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <p className="text-sm text-orbit-muted">
        Speak or type
      </p>
    </div>
  )
}
