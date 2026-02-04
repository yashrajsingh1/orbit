import { useEffect } from 'react'
import { wsService } from '@/services/websocket'
import { useIntentStore } from '@/stores/intentStore'
import { useUIStore } from '@/stores/uiStore'
import { WSEvent, Intent, Task } from '@/types'

/**
 * Hook to manage WebSocket connection and event handling
 * 
 * Philosophy:
 * - Real-time updates without polling
 * - Progressive disclosure of information
 * - No loading spinners - updates flow naturally
 */
export function useWebSocket() {
  const setCurrentIntent = useIntentStore((s) => s.setCurrentIntent)
  const addThoughtSignal = useUIStore((s) => s.addThoughtSignal)

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect()

    // Handle intent events
    const unsubIntent = wsService.on('intent_created', (event: WSEvent) => {
      const intent = event.payload as Intent
      setCurrentIntent(intent)
    })

    const unsubInterpret = wsService.on('intent_interpreted', (event: WSEvent) => {
      // Intent has been interpreted by AI
      const { interpretation } = event.payload as {
        intent_id: string
        interpretation: {
          interpreted_intent: string
          urgency: string
          emotional_tone?: string
        }
      }
      
      // Show thought signal
      if (interpretation.emotional_tone === 'overwhelmed') {
        addThoughtSignal('Detecting overwhelm... considering scope reduction')
      } else if (interpretation.urgency === 'high') {
        addThoughtSignal('High priority detected')
      }
    })

    // Handle task events
    const unsubTask = wsService.on('task_updated', (event: WSEvent) => {
      const task = event.payload as Task
      // Task store will be updated via React Query invalidation
      // or we can update directly here
      console.log('Task updated:', task.id)
    })

    // Handle AI thought signals
    const unsubThought = wsService.on('thought_signal', (event: WSEvent) => {
      const { message } = event.payload as { message: string }
      addThoughtSignal(message)
    })

    // Handle cognitive insights
    const unsubInsight = wsService.on('insight_generated', (event: WSEvent) => {
      const { message, type } = event.payload as { 
        message: string
        type: 'suggestion' | 'warning' | 'observation'
      }
      
      if (type === 'suggestion') {
        addThoughtSignal(message, 5000)
      }
    })

    // Cleanup on unmount
    return () => {
      unsubIntent()
      unsubInterpret()
      unsubTask()
      unsubThought()
      unsubInsight()
      wsService.disconnect()
    }
  }, [setCurrentIntent, addThoughtSignal])
}
