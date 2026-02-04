import { io, Socket } from 'socket.io-client'
import { WSEvent } from '@/types'

type EventHandler = (event: WSEvent) => void

class WebSocketService {
  private socket: Socket | null = null
  private handlers: Map<string, EventHandler[]> = new Map()
  private maxReconnectAttempts = 5

  connect(): void {
    const token = localStorage.getItem('orbit_token')
    if (!token) {
      console.warn('No auth token, skipping WebSocket connection')
      return
    }

    this.socket = io('/ws', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    // Listen for ORBIT events
    this.socket.on('orbit_event', (event: WSEvent) => {
      this.dispatchEvent(event)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Subscribe to specific event types
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  // Dispatch event to handlers
  private dispatchEvent(event: WSEvent): void {
    // Call type-specific handlers
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      handlers.forEach((handler) => handler(event))
    }

    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get('*')
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(event))
    }
  }

  // Send event to server
  emit(eventType: string, payload: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(eventType, payload)
    } else {
      console.warn('WebSocket not connected, cannot emit:', eventType)
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

// Singleton instance
export const wsService = new WebSocketService()

export default wsService
