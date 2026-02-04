import { motion, AnimatePresence } from 'framer-motion'
import { useTaskStore } from '@/stores/taskStore'
import { useIntentStore } from '@/stores/intentStore'
import { useUIStore } from '@/stores/uiStore'
import { FocusNode } from './FocusNode'
import { TaskOrbit } from './TaskOrbit'
import { AIThoughtSignal } from './AIThoughtSignal'
import { VoiceInterface } from '../voice/VoiceInterface'
import { IntentInput } from '../input/IntentInput'

/**
 * COGNITIVE CANVAS
 * 
 * The main interface - NOT a dashboard.
 * 
 * Philosophy:
 * ❌ NO: Chat bubbles, sidebars, tabs, dashboards
 * ✅ YES: Central focus, orbital tasks, subtle AI signals
 * 
 * Features:
 * - Central Focus Node (current intent)
 * - Task Orbits (tasks float based on priority)
 * - AI Thought Signals (fade in/out)
 * - Silence Mode (fades when inactive)
 */
export function CognitiveCanvas() {
  const tasks = useTaskStore((s) => s.getTasksByOrbitalDistance())
  const focusedTask = useTaskStore((s) => s.focusedTask)
  const currentIntent = useIntentStore((s) => s.currentIntent)
  const currentInterpretation = useIntentStore((s) => s.currentInterpretation)
  const { silenceMode, thoughtSignals } = useUIStore()

  return (
    <motion.div
      className={`
        relative w-full h-screen overflow-hidden
        bg-orbit-void
        transition-opacity duration-1000
        ${silenceMode ? 'opacity-30' : 'opacity-100'}
      `}
      initial={{ opacity: 0 }}
      animate={{ opacity: silenceMode ? 0.3 : 1 }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-orbit-surface/20 via-transparent to-transparent" />
      
      {/* Orbital rings (decorative) */}
      <OrbitalRings />

      {/* Main canvas area */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        
        {/* AI Thought Signals - top area */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <AnimatePresence>
            {thoughtSignals.map((signal) => (
              <AIThoughtSignal key={signal.id} message={signal.message} />
            ))}
          </AnimatePresence>
        </div>

        {/* Central Focus Node */}
        <FocusNode
          intent={currentIntent}
          interpretation={currentInterpretation}
          focusedTask={focusedTask}
        />

        {/* Task Orbits */}
        <TaskOrbit tasks={tasks} />

        {/* Intent Input - bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
          <IntentInput />
        </div>

        {/* Voice Interface - floating button */}
        <div className="absolute bottom-8 right-8">
          <VoiceInterface />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Decorative orbital rings
 */
function OrbitalRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Inner ring */}
      <motion.div
        className="absolute w-64 h-64 rounded-full border border-orbit-border/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Middle ring */}
      <motion.div
        className="absolute w-96 h-96 rounded-full border border-orbit-border/15"
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Outer ring */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full border border-orbit-border/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
