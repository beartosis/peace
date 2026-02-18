import type { TransitionOut, ArbiterEventOut } from '../types'
import { formatDuration, formatTimestamp } from '../utils'
import DispatchViewer from './DispatchViewer'

interface StateNodeDetailProps {
  state: string
  transitions: TransitionOut[]
  arbiterEvents: ArbiterEventOut[]
}

export default function StateNodeDetail({ state, transitions, arbiterEvents }: StateNodeDetailProps) {
  const stateTransitions = transitions.filter(t => t.to_state === state)

  // Map arbiter events to transitions by transition_id
  const arbiterByTransition = new Map<number, ArbiterEventOut[]>()
  for (const ae of arbiterEvents) {
    if (ae.transition_id != null) {
      const list = arbiterByTransition.get(ae.transition_id) ?? []
      list.push(ae)
      arbiterByTransition.set(ae.transition_id, list)
    }
  }

  if (stateTransitions.length === 0) {
    return (
      <div className="mb-6 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{state}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">No transitions recorded for this state.</p>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{state}</h2>
      <ul className="space-y-3" aria-label={`Transitions for ${state}`}>
        {stateTransitions.map(t => {
          const events = arbiterByTransition.get(t.id) ?? []
          return (
            <li key={t.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-1">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {t.from_state ?? '?'} &rarr; {t.to_state ?? '?'}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{formatDuration(t.duration_secs)}</span>
                {t.is_self_transition && (
                  <span className="rounded bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 text-xs text-yellow-800 dark:text-yellow-400">
                    revision
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatTimestamp(t.timestamp)}
                {t.dispatch_skill && (
                  <span> &middot; {t.dispatch_skill}{t.dispatch_duration_secs != null && ` (${formatDuration(t.dispatch_duration_secs)})`}</span>
                )}
              </div>
              {t.verdict && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verdict: {t.verdict}</div>
              )}
              {events.length > 0 && (
                <ul className="mt-1 space-y-0.5 ml-2">
                  {events.map(e => (
                    <li key={e.id} className="text-xs text-gray-600 dark:text-gray-300">
                      {e.verdict === 'MERGE_BLOCKED' || e.verdict === 'TASKS_FAILED' ? '\u{1F6D1}' : '\u{1F527}'}{' '}
                      Attempt {e.attempt}/{e.max_attempts}
                      {e.verdict && <span className="ml-1 font-medium">&mdash; {e.verdict}</span>}
                      {e.pr_number != null && <span className="ml-1 text-gray-400">PR #{e.pr_number}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {t.dispatch_skill && t.dispatch_content && (
                <DispatchViewer
                  skill={t.dispatch_skill}
                  durationSecs={t.dispatch_duration_secs}
                  content={t.dispatch_content}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
