import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { useStateDurations } from '../api/hooks'
import { useDarkMode } from '../hooks/useDarkMode'
import { formatDuration } from '../utils'
import Skeleton from './Skeleton'

interface TooltipPayloadItem {
  name?: string
  value?: number
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow">
      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatDuration(entry.value ?? null)}
        </p>
      ))}
    </div>
  )
}

export default function StateDurationChart() {
  const { data, isLoading, error } = useStateDurations()
  const dark = useDarkMode()

  if (isLoading) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }
  if (error || !data) return <p className="text-red-600 dark:text-red-400">Failed to load state durations.</p>

  const chartData = Object.entries(data).map(([state, stats]) => ({
    state,
    avg: stats.avg,
    p50: stats.p50,
    p95: stats.p95,
  }))

  const axisColor = dark ? '#9ca3af' : '#6b7280'
  const gridColor = dark ? '#374151' : '#e5e7eb'

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Time by Phase</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis type="number" tick={{ fill: axisColor }} label={{ value: 'Seconds', position: 'insideBottom', offset: -5, fill: axisColor }} />
          <YAxis type="category" dataKey="state" width={130} tick={{ fontSize: 12, fill: axisColor }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: axisColor }} />
          <Bar dataKey="avg" name="Avg" fill="#6366f1" />
          <Bar dataKey="p50" name="P50" fill="#14b8a6" />
          <Bar dataKey="p95" name="P95" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
