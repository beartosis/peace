import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEventStream } from '../api/useEventStream'
import { useLiveSnapshot, useRuns } from '../api/hooks'
import ConnectionBadge from '../components/ConnectionBadge'
import LivePipeline from '../components/LivePipeline'
import LiveDispatchStatus from '../components/LiveDispatchStatus'
import LiveEventLog from '../components/LiveEventLog'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

export default function LivePage() {
  const { status, lastEvent, events } = useEventStream(true)
  const { data: snapshot } = useLiveSnapshot()
  const { data: runs } = useRuns()
  const [followMode, setFollowMode] = useState(true)

  const currentState = lastEvent?.state ?? snapshot?.current_state ?? ''
  const stepNumber = lastEvent?.step ?? snapshot?.step_number ?? '-'
  const latestRun = runs?.[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Live Monitor
        </h2>
        <div className="flex items-center gap-3">
          <ConnectionBadge status={status} />
          <button
            type="button"
            className={`text-xs px-2 py-1 rounded ${
              followMode
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
            onClick={() => setFollowMode(!followMode)}
          >
            {followMode ? 'Following' : 'Paused'}
          </button>
        </div>
      </div>

      {(snapshot || lastEvent) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {latestRun && typeof stepNumber === 'number' ? (
            <Link to={`/runs/${latestRun.id}/steps/${stepNumber}`}>
              <StatCard label="Step" value={`#${stepNumber}`} />
            </Link>
          ) : (
            <StatCard label="Step" value={`#${stepNumber}`} />
          )}
          <StatCard label="State" value={currentState || '-'} />
          <StatCard
            label="Verdict"
            value={snapshot?.last_result?.verdict ?? '-'}
          />
          <StatCard
            label="Failures"
            value={snapshot?.consecutive_failures ?? 0}
          />
        </div>
      )}

      <LivePipeline currentState={currentState} lastEvent={lastEvent} />

      <LiveDispatchStatus events={events} />

      <LiveEventLog events={events} followMode={followMode} />
    </div>
  )
}
