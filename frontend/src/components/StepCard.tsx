import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { StepSummary } from '../types'
import { useStepDetail } from '../api/hooks'
import { formatDuration, computeStepDuration } from '../utils'
import StatusBadge from './StatusBadge'
import TransitionFlow from './TransitionFlow'

interface StepCardProps {
  step: StepSummary
}

export default function StepCard({ step }: StepCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: detail, isLoading, error } = useStepDetail(expanded ? (step.run_id ?? 0) : 0, expanded ? step.step_number : 0)
  const duration = computeStepDuration(step.started_at, step.ended_at)

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/runs/${step.run_id}/steps/${step.step_number}`}
            className="font-medium text-gray-900 dark:text-gray-100 truncate hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
          >
            Step {step.step_number}{step.title ? `: ${step.title}` : ''}
          </Link>
          <StatusBadge status={step.status} />
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">{formatDuration(duration)}</span>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-expanded={expanded}
            aria-label={`Toggle details for step ${step.step_number}`}
            onClick={() => setExpanded(!expanded)}
          >
            <span className={`block text-gray-400 dark:text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
              &#9660;
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="border-t border-gray-100 dark:border-gray-800 px-4 py-3"
          role="region"
          aria-label={`Details for step ${step.step_number}`}
        >
          {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading transitions...</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">Failed to load step details.</p>}
          {detail && (
            <>
              <TransitionFlow
                transitions={detail.transitions}
                arbiterEvents={detail.arbiter_events}
              />
              <Link
                to={`/runs/${step.run_id}/steps/${step.step_number}`}
                className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
              >
                View details &rarr;
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
