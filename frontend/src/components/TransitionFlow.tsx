import type { TransitionOut, ArbiterEventOut } from '../types'
import { formatDuration } from '../utils'

interface TransitionFlowProps {
  transitions: TransitionOut[]
  arbiterEvents: ArbiterEventOut[]
}

function borderColor(transition: TransitionOut): string {
  if (transition.is_self_transition) return 'border-yellow-500'
  if (transition.log_level === 'ERROR') return 'border-red-500'
  if (transition.verdict === 'MERGE_BLOCKED' || transition.verdict === 'TASKS_FAILED') {
    return 'border-red-500'
  }
  return 'border-green-500'
}

function ArbiterEventItem({ event }: { event: ArbiterEventOut }) {
  const isHalt = event.verdict === 'MERGE_BLOCKED' || event.verdict === 'TASKS_FAILED'
  return (
    <li className={`ml-4 text-sm ${isHalt ? 'text-red-700' : 'text-gray-600'}`}>
      <span className="mr-1">{isHalt ? '\u{1F6D1}' : '\u{1F527}'}</span>
      Attempt {event.attempt}/{event.max_attempts}
      {event.verdict && <span className="ml-1 font-medium">&mdash; {event.verdict}</span>}
      {event.pr_number != null && <span className="ml-1 text-gray-500">PR #{event.pr_number}</span>}
    </li>
  )
}

export default function TransitionFlow({ transitions, arbiterEvents }: TransitionFlowProps) {
  if (transitions.length === 0) {
    return <p className="text-sm text-gray-500">No transitions recorded.</p>
  }

  const arbiterByTransition = new Map<number, ArbiterEventOut[]>()
  for (const event of arbiterEvents) {
    if (event.transition_id != null) {
      const list = arbiterByTransition.get(event.transition_id) ?? []
      list.push(event)
      arbiterByTransition.set(event.transition_id, list)
    }
  }

  return (
    <ol className="space-y-1" aria-label="State transitions">
      {transitions.map((t) => {
        const events = arbiterByTransition.get(t.id) ?? []
        return (
          <li key={t.id} className={`border-l-2 pl-3 py-1 ${borderColor(t)}`}>
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-medium text-gray-900">
                {t.from_state ?? '?'} &rarr; {t.to_state ?? '?'}
              </span>
              <span className="text-gray-500">
                {formatDuration(t.duration_secs)}
              </span>
              {t.is_self_transition && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">
                  revision
                </span>
              )}
            </div>
            {t.dispatch_skill && (
              <div className="text-xs text-gray-500">
                {t.dispatch_skill}
                {t.dispatch_duration_secs != null && ` (${formatDuration(t.dispatch_duration_secs)})`}
              </div>
            )}
            {t.verdict && (
              <div className="text-xs text-gray-500">
                Verdict: {t.verdict}
              </div>
            )}
            {events.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {events.map((e) => (
                  <ArbiterEventItem key={e.id} event={e} />
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}
