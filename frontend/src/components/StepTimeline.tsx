import { useRunSteps } from '../api/hooks'
import { formatDuration, computeStepDuration, formatTimestamp } from '../utils'
import StepCard from './StepCard'
import Skeleton from './Skeleton'

interface StepTimelineProps {
  runId: number
  runStatus?: string | null
  runStartedAt?: string | null
  runEndedAt?: string | null
}

export default function StepTimeline({ runId, runStatus, runStartedAt, runEndedAt }: StepTimelineProps) {
  const { data: steps, isLoading, error } = useRunSteps(runId)

  if (isLoading) {
    return (
      <section aria-label="Step timeline">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Steps</h2>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600 py-4">Failed to load steps.</p>
  }

  if (!steps || steps.length === 0) {
    if (runStatus === 'halted') {
      const duration = computeStepDuration(runStartedAt ?? null, runEndedAt ?? null)
      return (
        <section aria-label="Step timeline">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Steps</h2>
          <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Run halted before any steps were attempted
            </p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
              {runStartedAt && <p>Started: {formatTimestamp(runStartedAt)}</p>}
              {runEndedAt && <p>Ended: {formatTimestamp(runEndedAt)}</p>}
              {duration != null && <p>Duration: {formatDuration(duration)}</p>}
            </div>
          </div>
        </section>
      )
    }
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No steps found for this run.</p>
  }

  return (
    <section aria-label="Step timeline">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Steps</h2>
      <div className="space-y-2">
        {steps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </div>
    </section>
  )
}
