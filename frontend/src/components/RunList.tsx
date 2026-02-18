import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRuns } from '../api/hooks'
import { formatTimestamp } from '../utils'
import StatusBadge from './StatusBadge'
import Skeleton from './Skeleton'

type StatusFilter = 'all' | 'completed' | 'halted'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'halted', label: 'Halted' },
]

export default function RunList() {
  const { runId } = useParams<{ runId: string }>()
  const selectedId = runId ? Number(runId) : null
  const { data: runs, isLoading, error } = useRuns()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [hideEmpty, setHideEmpty] = useState(true)
  const [search, setSearch] = useState('')

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="p-4 text-sm text-red-600">Failed to load runs.</p>
  }

  if (!runs || runs.length === 0) {
    return <p className="p-4 text-sm text-gray-500">No runs found.</p>
  }

  const q = search.toLowerCase()
  const filtered = runs.filter((run) => {
    if (statusFilter !== 'all' && run.status !== statusFilter) return false
    if (hideEmpty && run.steps_attempted === 0) return false
    if (q && !(run.project ?? '').toLowerCase().includes(q) && !String(run.id).includes(q)) return false
    return true
  })

  return (
    <div>
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 space-y-2">
        <div className="flex gap-1">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                statusFilter === value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Hide empty runs
        </label>
      </div>
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search runs..."
          className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} of {runs.length} runs
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.map((run) => {
          const isSelected = run.id === selectedId
          return (
            <li key={run.id}>
              <Link
                to={`/runs/${run.id}`}
                className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isSelected ? 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {run.project ?? 'Unknown project'} #{run.id}
                  </span>
                  <StatusBadge status={run.status} />
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatTimestamp(run.started_at)}
                </div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {run.steps_attempted} steps ({run.steps_completed} completed
                  {run.steps_failed > 0 && `, ${run.steps_failed} failed`})
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
