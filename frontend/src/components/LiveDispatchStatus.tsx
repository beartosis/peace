import { useState, useEffect } from 'react'
import type { OrderEvent } from '../types'

interface LiveDispatchStatusProps {
  events: OrderEvent[]
}

export default function LiveDispatchStatus({ events }: LiveDispatchStatusProps) {
  const [elapsed, setElapsed] = useState(0)

  // Find the most recent dispatch_start that hasn't been closed by a dispatch_end
  const activeDispatch = findActiveDispatch(events)

  useEffect(() => {
    if (!activeDispatch) {
      setElapsed(0)
      return
    }
    const startTime = new Date(activeDispatch.ts).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeDispatch])

  if (!activeDispatch) return null

  return (
    <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <div className="flex items-center gap-3">
        <span className="inline-block h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
        <div className="flex-1">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Dispatching: {activeDispatch.skill}
          </span>
          {activeDispatch.model && (
            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
              ({activeDispatch.model})
            </span>
          )}
        </div>
        <span className="text-sm font-mono text-blue-700 dark:text-blue-300">
          {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  )
}

function findActiveDispatch(events: OrderEvent[]): OrderEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'dispatch_end') return null
    if (e.type === 'dispatch_start') return e
  }
  return null
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
