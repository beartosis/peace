import { useParams } from 'react-router-dom'
import { useRun, useRunSteps } from '../api/hooks'
import { formatDuration, computeStepDuration, formatTimestamp } from '../utils'
import Breadcrumb from '../components/Breadcrumb'
import StatusBadge from '../components/StatusBadge'
import SummaryCard from '../components/SummaryCard'
import StepTimeline from '../components/StepTimeline'

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const id = Number(runId)
  const { data: run, isLoading, error } = useRun(isNaN(id) ? 0 : id)
  const { data: steps } = useRunSteps(isNaN(id) ? 0 : id)

  if (isNaN(id)) {
    return <p className="text-red-600">Invalid run ID.</p>
  }

  if (isLoading) {
    return <p className="text-gray-500">Loading run...</p>
  }

  if (error || !run) {
    return <p className="text-red-600">Failed to load run.</p>
  }

  const runDuration = computeStepDuration(run.started_at, run.ended_at)
  const successRate = run.steps_attempted > 0
    ? ((run.steps_completed / run.steps_attempted) * 100).toFixed(1)
    : '0.0'

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/' },
        { label: `${run.project ?? 'Run'} #${run.id}` },
      ]} />
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {run.project ?? 'Run'} #{run.id}
          </h1>
          <StatusBadge status={run.status} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          <span>Started: {formatTimestamp(run.started_at)}</span>
          <span>Ended: {formatTimestamp(run.ended_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Steps"
          value={`${run.steps_completed}/${run.steps_attempted}`}
        />
        <SummaryCard
          label="Duration"
          value={formatDuration(runDuration)}
        />
        <SummaryCard
          label="Success Rate"
          value={`${successRate}%`}
        />
        <SummaryCard
          label="Failed"
          value={String(run.steps_failed)}
        />
      </div>

      <StepTimeline
        runId={id}
        runStatus={run.status}
        runStartedAt={run.started_at}
        runEndedAt={run.ended_at}
      />
    </div>
  )
}
