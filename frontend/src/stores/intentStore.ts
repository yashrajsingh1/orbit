import { create } from 'zustand'
import { Intent, IntentCreate, IntentInterpretation } from '@/types'
import { apiClient } from '@/services/api'

interface IntentState {
  // Current active intent
  currentIntent: Intent | null
  currentInterpretation: IntentInterpretation | null
  
  // Intent history
  intents: Intent[]
  
  // State
  isProcessing: boolean
  isListening: boolean
  error: string | null
  
  // Actions
  createIntent: (data: IntentCreate) => Promise<Intent | null>
  interpretIntent: (intentId: string) => Promise<IntentInterpretation | null>
  setCurrentIntent: (intent: Intent | null) => void
  setIsListening: (listening: boolean) => void
  fetchIntents: (limit?: number) => Promise<void>
  clearError: () => void
}

export const useIntentStore = create<IntentState>((set, get) => ({
  currentIntent: null,
  currentInterpretation: null,
  intents: [],
  isProcessing: false,
  isListening: false,
  error: null,

  createIntent: async (data) => {
    set({ isProcessing: true, error: null })
    try {
      const response = await apiClient.post<Intent>('/intent/', data)
      const intent = response.data
      
      set((state) => ({
        currentIntent: intent,
        intents: [intent, ...state.intents],
        isProcessing: false,
      }))
      
      // Auto-interpret
      get().interpretIntent(intent.id)
      
      return intent
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create intent'
      set({ error: message, isProcessing: false })
      return null
    }
  },

  interpretIntent: async (intentId) => {
    try {
      const response = await apiClient.post<IntentInterpretation>(
        `/intent/${intentId}/interpret`
      )
      const interpretation = response.data
      
      set({ currentInterpretation: interpretation })
      return interpretation
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to interpret intent'
      set({ error: message })
      return null
    }
  },

  setCurrentIntent: (intent) => {
    set({ currentIntent: intent })
  },

  setIsListening: (listening) => {
    set({ isListening: listening })
  },

  fetchIntents: async (limit = 20) => {
    try {
      const response = await apiClient.get<Intent[]>(`/intent/?limit=${limit}`)
      set({ intents: response.data })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch intents'
      set({ error: message })
    }
  },

  clearError: () => set({ error: null }),
}))
