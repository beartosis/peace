import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { OrderEvent, ConnectionStatus } from '../types'

const SSE_URL = '/api/live/events'
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]

const EVENT_TYPES = [
  'state_transition',
  'dispatch_start',
  'dispatch_end',
  'step_start',
  'step_complete',
  'pr_status',
  'arbiter_verdict',
  'error',
  'run_start',
  'run_stop',
]

export function useEventStream(enabled: boolean = true) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<OrderEvent | null>(null)
  const [events, setEvents] = useState<OrderEvent[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const lastSeqRef = useRef(0)

  const connect = useCallback(() => {
    if (!enabled) return

    const url = `${SSE_URL}?last_event_id=${lastSeqRef.current}`

    setStatus('connecting')
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => {
      setStatus('connected')
      retryCountRef.current = 0
    }

    es.onerror = () => {
      es.close()
      setStatus('disconnected')
      const delay =
        RECONNECT_DELAYS[
          Math.min(retryCountRef.current, RECONNECT_DELAYS.length - 1)
        ]
      retryCountRef.current++
      setTimeout(connect, delay)
    }

    function handleEvent(e: MessageEvent) {
      let event: OrderEvent
      try {
        event = JSON.parse(e.data)
      } catch {
        return
      }

      // Gap detection — if we missed events, force refetch everything
      if (event.seq - lastSeqRef.current > 1 && lastSeqRef.current > 0) {
        queryClient.invalidateQueries()
      }

      lastSeqRef.current = event.seq
      setLastEvent(event)
      setEvents((prev) => [...prev.slice(-199), event])

      // Selectively invalidate React Query cache
      switch (event.type) {
        case 'state_transition':
        case 'step_start':
        case 'step_complete':
          queryClient.invalidateQueries({ queryKey: ['live', 'snapshot'] })
          queryClient.invalidateQueries({ queryKey: ['steps'] })
          queryClient.invalidateQueries({ queryKey: ['stats'] })
          queryClient.invalidateQueries({ queryKey: ['runs'] })
          break
        case 'pr_status':
          queryClient.invalidateQueries({ queryKey: ['steps'] })
          break
      }
    }

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, handleEvent)
    }
  }, [enabled, queryClient])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [connect])

  return { status, lastEvent, events }
}
