import { useStatsOverview } from '../api/hooks'
import { formatDuration } from '../utils'
import SummaryCard from './SummaryCard'
import Skeleton from './Skeleton'

export default function SummaryCards() {
  const { data, isLoading, error } = useStatsOverview()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-red-600">Failed to load stats.</p>
  }

  const passPercent = (data.pass_rate * 100).toFixed(1)
  const arbiterPercent = (data.arbiter_success_rate * 100).toFixed(1)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <SummaryCard
        label="Steps Completed"
        value={`${data.completed}/${data.total_steps}`}
        subtitle={`${passPercent}%`}
      />
      <SummaryCard
        label="PRs Merged"
        value={String(data.total_prs_merged)}
      />
      <SummaryCard
        label="Avg Step Duration"
        value={formatDuration(data.avg_step_duration_secs)}
      />
      <SummaryCard
        label="Avg Dispatch Time"
        value={formatDuration(data.avg_dispatch_duration_secs)}
      />
      <SummaryCard
        label="Arbiter Success Rate"
        value={`${arbiterPercent}%`}
        subtitle={`${data.total_arbiter_interventions} interventions`}
      />
    </div>
  )
}
