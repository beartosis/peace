import type { TransitionOut, ArbiterEventOut } from '../types'

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

interface StateInfo {
  reached: boolean
  failed: boolean
  selfTransitions: number
  arbiterCount: number
}

function deriveStateInfo(
  transitions: TransitionOut[],
  arbiterEvents: ArbiterEventOut[],
): Map<string, StateInfo> {
  const info = new Map<string, StateInfo>()
  for (const state of PIPELINE_STATES) {
    info.set(state, { reached: false, failed: false, selfTransitions: 0, arbiterCount: 0 })
  }

  // Find the highest-reached state index to mark all prior states as reached
  let highestReachedIdx = -1
  for (const t of transitions) {
    if (t.to_state) {
      const idx = PIPELINE_STATES.indexOf(t.to_state)
      if (idx > highestReachedIdx) highestReachedIdx = idx
    }
  }

  // Mark all states up to the highest as reached
  for (let i = 0; i <= highestReachedIdx; i++) {
    const si = info.get(PIPELINE_STATES[i])
    if (si) si.reached = true
  }

  // Count self-transitions per state
  for (const t of transitions) {
    if (t.is_self_transition && t.to_state) {
      const si = info.get(t.to_state)
      if (si) si.selfTransitions++
    }
  }

  // Detect failures: check if any transition into a state had error-level or failure verdicts
  for (const t of transitions) {
    if (t.to_state) {
      const si = info.get(t.to_state)
      if (si && (t.log_level === 'ERROR' || t.verdict === 'MERGE_BLOCKED' || t.verdict === 'TASKS_FAILED')) {
        si.failed = true
      }
    }
  }

  // Count arbiter events per state by matching transition_id
  const transitionStateMap = new Map<number, string>()
  for (const t of transitions) {
    if (t.to_state) transitionStateMap.set(t.id, t.to_state)
  }
  for (const ae of arbiterEvents) {
    const state = ae.transition_id != null ? transitionStateMap.get(ae.transition_id) : null
    if (state) {
      const si = info.get(state)
      if (si) si.arbiterCount++
    }
  }

  return info
}

function nodeClasses(si: StateInfo, isActive: boolean): string {
  const base = 'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer'
  const ring = isActive ? ' ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900' : ''

  if (!si.reached) return `${base} border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 bg-gray-50 dark:bg-gray-800${ring}`
  if (si.failed) return `${base} border border-red-300 dark:border-red-700 text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/30${ring}`
  if (si.selfTransitions > 0) return `${base} border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30${ring}`
  return `${base} border border-green-300 dark:border-green-700 text-green-800 dark:text-green-400 bg-green-50 dark:bg-green-900/30${ring}`
}

function statusIcon(si: StateInfo): string {
  if (!si.reached) return '\u25CB'  // empty circle
  if (si.failed) return '\u2717'    // X mark
  return '\u2713'                    // checkmark
}

interface StateFlowPipelineProps {
  transitions: TransitionOut[]
  arbiterEvents: ArbiterEventOut[]
  onNodeClick: (state: string) => void
  activeState: string | null
}

export default function StateFlowPipeline({
  transitions,
  arbiterEvents,
  onNodeClick,
  activeState,
}: StateFlowPipelineProps) {
  const stateInfo = deriveStateInfo(transitions, arbiterEvents)

  return (
    <div className="mb-6 overflow-x-auto" role="group" aria-label="State flow pipeline">
      <div className="flex items-center gap-0 min-w-fit">
        {PIPELINE_STATES.map((state, i) => {
          const si = stateInfo.get(state)!
          const isActive = activeState === state
          return (
            <div key={state} className="flex items-center">
              {i > 0 && (
                <div
                  className={`w-6 h-0.5 shrink-0 ${
                    si.reached ? 'bg-green-400' : 'border-t border-dashed border-gray-300'
                  }`}
                />
              )}
              <button
                type="button"
                className={nodeClasses(si, isActive)}
                onClick={() => onNodeClick(state)}
                aria-pressed={isActive}
                aria-label={`${state} state${si.reached ? ', reached' : ', not reached'}`}
              >
                <span>{statusIcon(si)}</span>
                <span>{STATE_LABELS[state] ?? state}</span>
                <div className="flex gap-1.5">
                  {si.selfTransitions > 0 && (
                    <span title={`${si.selfTransitions} revision(s)`}>
                      &#x27F3; {si.selfTransitions}
                    </span>
                  )}
                  {si.arbiterCount > 0 && (
                    <span title={`${si.arbiterCount} arbiter event(s)`}>
                      &#x1F527; {si.arbiterCount}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
