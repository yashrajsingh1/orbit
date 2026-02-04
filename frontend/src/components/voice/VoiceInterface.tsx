import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { useUIStore } from '@/stores/uiStore'

/**
 * VOICE INTERFACE
 * 
 * Voice is primary, not optional.
 * 
 * Philosophy:
 * - Short commands
 * - Conversational, calm tone
 * - Silence is allowed
 * - Voice is intentional, not chatty
 */
export function VoiceInterface() {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    toggleListening,
  } = useVoice()

  const { isSpeaking, stop: stopSpeaking } = useSpeechSynthesis()
  const voiceActive = useUIStore((s) => s.voiceActive)

  if (!isSupported) {
    return (
      <div className="text-xs text-orbit-muted">
        Voice not supported
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Transcript preview */}
      <AnimatePresence>
        {(transcript || interimTranscript) && (
          <motion.div
            className="absolute bottom-full mb-4 right-0 w-64"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="glass rounded-lg px-4 py-3">
              <p className="text-sm text-orbit-text">
                {transcript}
                <span className="text-orbit-muted">{interimTranscript}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute bottom-full mb-4 right-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main voice button */}
      <motion.button
        className={`
          relative w-14 h-14 rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${isListening 
            ? 'bg-orbit-focus text-white shadow-glow-lg' 
            : 'glass text-orbit-text hover:bg-orbit-surface/60'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleListening}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        {/* Pulse animation when listening */}
        {isListening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-orbit-focus"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-orbit-focus"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}

        {/* Icon */}
        <motion.div
          className="relative z-10"
          animate={isListening ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
        >
          {isListening ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </motion.div>
      </motion.button>

      {/* Speaking indicator */}
      {isSpeaking && (
        <motion.button
          className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 rounded-full glass"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={stopSpeaking}
          aria-label="Stop speaking"
        >
          <Volume2 className="w-4 h-4 text-orbit-calm" />
        </motion.button>
      )}

      {/* Listening indicator */}
      {voiceActive && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orbit-focus"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  )
}
