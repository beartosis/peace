import type { OrderEvent } from '../types'

const PIPELINE_STATES = [
  'INIT', 'PARSE_ROADMAP', 'CREATE_SPEC', 'REVIEW_SPEC', 'PLAN_WORK',
  'EXECUTE_TASKS', 'MERGE_PRS', 'VERIFY_COMPLETION', 'HANDOFF',
]

const STATE_LABELS: Record<string, string> = {
  INIT: 'Init',
  PARSE_ROADMAP: 'Parse',
  CREATE_SPEC: 'Spec',
  REVIEW_SPEC: 'Review',
  PLAN_WORK: 'Plan',
  EXECUTE_TASKS: 'Execute',
  MERGE_PRS: 'Merge',
  VERIFY_COMPLETION: 'Verify',
  HANDOFF: 'Handoff',
}

interface LivePipelineProps {
  currentState: string
  lastEvent: OrderEvent | null
}

function nodeClasses(state: string, currentState: string, dispatching: boolean): string {
  const base = 'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all'
  const idx = PIPELINE_STATES.indexOf(state)
  const currentIdx = PIPELINE_STATES.indexOf(currentState)

  if (idx < 0 || currentIdx < 0) {
    return `${base} border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 bg-gray-50 dark:bg-gray-800`
  }

  if (idx === currentIdx) {
    const pulse = dispatching ? ' animate-pulse' : ''
    return `${base} border-2 border-blue-500 dark:border-blue-400 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-600 ring-offset-1 dark:ring-offset-gray-900${pulse}`
  }

  if (idx < currentIdx) {
    return `${base} border border-green-300 dark:border-green-700 text-green-800 dark:text-green-400 bg-green-50 dark:bg-green-900/30`
  }

  return `${base} border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 bg-gray-50 dark:bg-gray-800`
}

function connectorClasses(idx: number, currentIdx: number): string {
  if (idx <= currentIdx) return 'w-6 h-0.5 shrink-0 bg-green-400'
  return 'w-6 h-0.5 shrink-0 border-t border-dashed border-gray-300 dark:border-gray-600'
}

export default function LivePipeline({ currentState, lastEvent }: LivePipelineProps) {
  const currentIdx = PIPELINE_STATES.indexOf(currentState)
  const dispatching = lastEvent?.type === 'dispatch_start'

  return (
    <div className="mb-6 overflow-x-auto" role="group" aria-label="Live state pipeline">
      <div className="flex items-center gap-0 min-w-fit">
        {PIPELINE_STATES.map((state, i) => (
          <div key={state} className="flex items-center">
            {i > 0 && <div className={connectorClasses(i, currentIdx)} />}
            <div className={nodeClasses(state, currentState, dispatching && i === currentIdx)}>
              <span>
                {i < currentIdx ? '\u2713' : i === currentIdx ? '\u25CF' : '\u25CB'}
              </span>
              <span>{STATE_LABELS[state] ?? state}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
