import { useCallback, useRef, useState, useEffect } from 'react'
import { useIntentStore } from '@/stores/intentStore'
import { useUIStore } from '@/stores/uiStore'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseVoiceOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
}

interface UseVoiceReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
}

/**
 * Voice Input Hook using Web Speech API
 * 
 * Philosophy:
 * - Voice is primary, not optional
 * - Short commands
 * - Conversational, calm tone
 * - Silence is allowed
 */
export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  
  const createIntent = useIntentStore((s) => s.createIntent)
  const setVoiceActive = useUIStore((s) => s.setVoiceActive)
  const setVoiceTranscript = useUIStore((s) => s.setVoiceTranscript)
  const recordActivity = useUIStore((s) => s.recordActivity)

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    
    recognition.onstart = () => {
      setIsListening(true)
      setVoiceActive(true)
      setError(null)
      recordActivity()
    }
    
    recognition.onend = () => {
      setIsListening(false)
      setVoiceActive(false)
      
      // Process final transcript
      if (transcript.trim()) {
        handleFinalTranscript(transcript)
      }
    }
    
    recognition.onerror = (event) => {
      setIsListening(false)
      setVoiceActive(false)
      
      switch (event.error) {
        case 'no-speech':
          // Silence is valid - don't show error
          break
        case 'audio-capture':
          setError('No microphone found')
          break
        case 'not-allowed':
          setError('Microphone permission denied')
          break
        default:
          setError(`Voice error: ${event.error}`)
      }
    }
    
    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      
      if (final) {
        setTranscript((prev) => prev + final)
        setVoiceTranscript(final)
      }
      setInterimTranscript(interim)
      
      recordActivity()
    }
    
    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [isSupported, language, continuous, interimResults])

  // Handle final transcript - create intent
  const handleFinalTranscript = useCallback(async (text: string) => {
    if (text.trim()) {
      await createIntent({ raw_input: text.trim(), source: 'voice' })
      setTranscript('')
      setInterimTranscript('')
    }
  }, [createIntent])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return
    
    setTranscript('')
    setInterimTranscript('')
    setError(null)
    
    try {
      recognitionRef.current.start()
    } catch (err) {
      // Already started - ignore
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return
    recognitionRef.current.stop()
  }, [isListening])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
  }
}
