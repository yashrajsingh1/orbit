import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import { useIntentStore } from '@/stores/intentStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * INTENT INPUT
 * 
 * Text input for intents when voice isn't preferred.
 * 
 * Philosophy:
 * - Clean, minimal design
 * - No clutter
 * - Gentle feedback
 */
export function IntentInput() {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { createIntent, isProcessing } = useIntentStore()
  const recordActivity = useUIStore((s) => s.recordActivity)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isProcessing) return
    
    await createIntent({ raw_input: input.trim(), source: 'text' })
    setInput('')
    recordActivity()
  }, [input, isProcessing, createIntent, recordActivity])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    recordActivity()
  }, [recordActivity])

  // Keyboard shortcut: Cmd/Ctrl + K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="What's on your mind?"
          disabled={isProcessing}
          className={`
            input-orbit
            pr-12
            ${isProcessing ? 'opacity-50' : ''}
          `}
        />

        {/* Submit button */}
        <AnimatePresence mode="wait">
          <motion.button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              w-8 h-8 rounded-lg
              flex items-center justify-center
              transition-all duration-200
              ${input.trim() && !isProcessing
                ? 'bg-orbit-focus text-white'
                : 'bg-orbit-border/30 text-orbit-muted'}
            `}
            whileHover={input.trim() && !isProcessing ? { scale: 1.05 } : {}}
            whileTap={input.trim() && !isProcessing ? { scale: 0.95 } : {}}
          >
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-4 h-4" />
              </motion.div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </AnimatePresence>

        {/* Keyboard hint */}
        <div className="absolute left-4 -top-6 text-xs text-orbit-muted opacity-0 hover:opacity-100 transition-opacity">
          <kbd className="px-1.5 py-0.5 rounded bg-orbit-surface text-orbit-muted text-[10px]">
            ⌘K
          </kbd>
          {' '}to focus
        </div>
      </div>
    </motion.form>
  )
}
