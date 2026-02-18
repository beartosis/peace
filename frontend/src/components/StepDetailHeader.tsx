import type { StepDetail } from '../types'
import { formatDuration, computeStepDuration, formatTimestamp, parsePrNumbers } from '../utils'
import StatusBadge from './StatusBadge'

interface StepDetailHeaderProps {
  step: StepDetail
}

export default function StepDetailHeader({ step }: StepDetailHeaderProps) {
  const duration = computeStepDuration(step.started_at, step.ended_at)
  const prNumbers = parsePrNumbers(step.prs_merged)

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Step {step.step_number}{step.title ? `: ${step.title}` : ''}
        </h1>
        <StatusBadge status={step.status} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
        <span>Duration: {formatDuration(duration)}</span>
        {prNumbers.length > 0 && (
          <span>PR: {prNumbers.map(n => `#${n}`).join(', ')}</span>
        )}
        <span>Started: {formatTimestamp(step.started_at)}</span>
        <span>Ended: {formatTimestamp(step.ended_at)}</span>
      </div>
      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Tasks: {step.tasks_completed}/{step.tasks_total}
        {step.arbiter_events.length > 0 && (
          <span> &middot; Arbiter: {step.arbiter_events.length} attempt{step.arbiter_events.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  )
}
