import { useRef, useEffect } from 'react'
import type { OrderEvent } from '../types'

interface LiveEventLogProps {
  events: OrderEvent[]
  followMode: boolean
}

const EVENT_CONFIG: Record<string, { icon: string; color: string }> = {
  state_transition: { icon: '\u2192', color: 'text-blue-600 dark:text-blue-400' },
  dispatch_start: { icon: '\u2699', color: 'text-purple-600 dark:text-purple-400' },
  dispatch_end: { icon: '\u2713', color: 'text-green-600 dark:text-green-400' },
  step_start: { icon: '\u25B6', color: 'text-blue-600 dark:text-blue-400' },
  step_complete: { icon: '\u2605', color: 'text-green-600 dark:text-green-400' },
  pr_status: { icon: '\u2442', color: 'text-teal-600 dark:text-teal-400' },
  arbiter_verdict: { icon: '\u2696', color: 'text-yellow-600 dark:text-yellow-400' },
  error: { icon: '\u2717', color: 'text-red-600 dark:text-red-400' },
  run_start: { icon: '\u25B6', color: 'text-green-600 dark:text-green-400' },
  run_stop: { icon: '\u25A0', color: 'text-red-600 dark:text-red-400' },
}

function describeEvent(e: OrderEvent): string {
  switch (e.type) {
    case 'state_transition':
      return `${e.from} \u2192 ${e.to}${e.note ? ` (${e.note})` : ''}`
    case 'dispatch_start':
      return `Dispatch: ${e.skill}${e.model ? ` [${e.model}]` : ''}`
    case 'dispatch_end':
      if (e.error) return `Dispatch ${e.error}: ${e.skill} (${e.elapsed_secs}s)`
      return `Dispatch OK: ${e.skill} (${e.elapsed_secs}s)`
    case 'step_start':
      return `Step ${e.step}: ${e.title}`
    case 'step_complete':
      return `Step ${e.step} complete (${e.verdict})`
    case 'pr_status':
      return `PR #${e.pr_number} \u2192 ${e.status}`
    case 'arbiter_verdict':
      return `Arbiter: ${e.verdict} (attempt ${e.attempt})${e.error ? ` [${e.error}]` : ''}`
    case 'error':
      return e.note ?? 'Error'
    case 'run_start':
      return 'ORDER run started'
    case 'run_stop':
      return 'ORDER run stopped'
    default:
      return e.type
  }
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ts
  }
}

export default function LiveEventLog({ events, followMode }: LiveEventLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (followMode && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [events.length, followMode])

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Waiting for events...
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Event Log ({events.length})
        </h3>
      </div>
      <div ref={containerRef} className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {[...events].reverse().map((e) => {
              const cfg = EVENT_CONFIG[e.type] ?? { icon: '\u2022', color: 'text-gray-500' }
              const isFail = e.type === 'dispatch_end' && e.error
              return (
                <tr
                  key={`${e.seq}-${e.ts}`}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-3 py-1.5 font-mono text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {formatTime(e.ts)}
                  </td>
                  <td className={`px-2 py-1.5 text-center ${cfg.color}`}>
                    {cfg.icon}
                  </td>
                  <td className={`px-3 py-1.5 ${isFail ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {describeEvent(e)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
