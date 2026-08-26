import { useEffect, useRef, useState } from 'react'
import { WS_URL } from './api'

const MIN_RETRY_MS = 1000
const MAX_RETRY_MS = 8000

// Connects to /ws/live and auto-reconnects with capped backoff on drop.
// `onMessage` is called with the parsed JSON payload of each broadcast.
export function useLiveSocket(onMessage) {
  const [connected, setConnected] = useState(false)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    let socket = null
    let retryTimer = null
    let retryDelay = MIN_RETRY_MS
    let cancelled = false

    function connect() {
      if (cancelled) return
      socket = new WebSocket(WS_URL)

      socket.onopen = () => {
        retryDelay = MIN_RETRY_MS
        setConnected(true)
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          onMessageRef.current?.(payload)
        } catch {
          // ignore malformed frames
        }
      }

      socket.onclose = () => {
        setConnected(false)
        if (cancelled) return
        retryTimer = setTimeout(connect, retryDelay)
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS)
      }

      socket.onerror = () => {
        socket.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      socket?.close()
    }
  }, [])

  return connected
}
