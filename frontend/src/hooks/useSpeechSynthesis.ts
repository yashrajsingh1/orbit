import { useCallback, useRef, useState } from 'react'

interface UseSpeechSynthesisOptions {
  voice?: string
  rate?: number
  pitch?: number
  volume?: number
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void
  stop: () => void
  isSpeaking: boolean
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
}

/**
 * Text-to-Speech Hook using Web Speech API
 * 
 * Philosophy:
 * - Calm, neutral voice
 * - Slower pace than typical assistants
 * - Voice is intentional, not chatty
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const {
    rate = 0.9,    // Slightly slower than default
    pitch = 1.0,
    volume = 0.8,  // Not too loud
  } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Load available voices
  if (isSupported && voices.length === 0) {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length > 0) {
        setVoices(availableVoices)
      }
    }
    
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Configure for calm, measured delivery
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume
    
    // Try to find a calm, neutral voice
    // Prefer voices that sound natural
    const preferredVoices = voices.filter(v => 
      v.name.includes('Samantha') ||  // macOS
      v.name.includes('Google UK') ||
      v.name.includes('Microsoft Zira') ||
      v.lang.startsWith('en')
    )
    
    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0]
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [isSupported, rate, pitch, volume, voices])

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [isSupported])

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
  }
}
