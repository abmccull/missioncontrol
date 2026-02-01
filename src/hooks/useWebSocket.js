import { useEffect, useState, useCallback, useRef } from 'react'

const WS_URL = 'ws://localhost:3001'
const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const wsRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef(null)
  const connectRef = useRef(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttempts.current = 0
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setConnectionStatus('reconnecting')
        
        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts.current)
          reconnectAttempts.current++
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
          reconnectTimeout.current = setTimeout(() => connectRef.current?.(), delay)
        } else {
          setConnectionStatus('failed')
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setConnectionStatus('failed')
    }
  }, [])

  // Keep ref updated with latest connect function
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0
    if (wsRef.current) {
      wsRef.current.close()
    }
    connect()
  }, [connect])

  return { 
    isConnected, 
    lastMessage, 
    connectionStatus,
    reconnect 
  }
}

// Hook for subscribing to specific event types
export function useWebSocketEvent(eventType, callback) {
  const { lastMessage, isConnected } = useWebSocket()
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  useEffect(() => {
    if (lastMessage && lastMessage.type === eventType) {
      callbackRef.current(lastMessage.payload)
    }
  }, [lastMessage, eventType])
  
  return isConnected
}

export default useWebSocket
