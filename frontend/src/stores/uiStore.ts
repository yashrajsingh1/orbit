import { create } from 'zustand'
import { ThoughtSignal } from '@/types'

interface UIState {
  // Silence mode - screen fades when no action needed
  silenceMode: boolean
  lastActivity: number
  silenceTimeout: number // ms before entering silence mode
  
  // AI Thought signals
  thoughtSignals: ThoughtSignal[]
  
  // Voice UI
  voiceActive: boolean
  voiceTranscript: string
  
  // Canvas state
  canvasScale: number
  canvasCenter: { x: number; y: number }
  
  // Actions
  setSilenceMode: (mode: boolean) => void
  recordActivity: () => void
  addThoughtSignal: (message: string, duration?: number) => void
  removeThoughtSignal: (id: string) => void
  setVoiceActive: (active: boolean) => void
  setVoiceTranscript: (transcript: string) => void
  setCanvasScale: (scale: number) => void
  setCanvasCenter: (center: { x: number; y: number }) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  silenceMode: false,
  lastActivity: Date.now(),
  silenceTimeout: 60000, // 1 minute
  
  thoughtSignals: [],
  
  voiceActive: false,
  voiceTranscript: '',
  
  canvasScale: 1,
  canvasCenter: { x: 0, y: 0 },

  setSilenceMode: (mode) => set({ silenceMode: mode }),

  recordActivity: () => {
    set({ lastActivity: Date.now(), silenceMode: false })
  },

  addThoughtSignal: (message, duration = 3000) => {
    const id = `thought_${Date.now()}`
    const signal: ThoughtSignal = { id, message, duration }
    
    set((state) => ({
      thoughtSignals: [...state.thoughtSignals, signal],
    }))
    
    // Auto-remove after duration
    setTimeout(() => {
      get().removeThoughtSignal(id)
    }, duration)
  },

  removeThoughtSignal: (id) => {
    set((state) => ({
      thoughtSignals: state.thoughtSignals.filter((s) => s.id !== id),
    }))
  },

  setVoiceActive: (active) => {
    set({ voiceActive: active })
    if (active) {
      get().recordActivity()
    }
  },

  setVoiceTranscript: (transcript) => {
    set({ voiceTranscript: transcript })
  },

  setCanvasScale: (scale) => {
    set({ canvasScale: Math.max(0.5, Math.min(2, scale)) })
  },

  setCanvasCenter: (center) => {
    set({ canvasCenter: center })
  },
}))

// Silence mode checker - runs periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useUIStore.getState()
    const timeSinceActivity = Date.now() - state.lastActivity
    
    if (timeSinceActivity > state.silenceTimeout && !state.silenceMode) {
      state.setSilenceMode(true)
    }
  }, 10000) // Check every 10 seconds
}
