import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useDurationTrend } from '../api/hooks'
import { useDarkMode } from '../hooks/useDarkMode'
import { formatDuration } from '../utils'
import Skeleton from './Skeleton'
import type { DurationTrendItem } from '../types'

interface DotProps {
  cx?: number
  cy?: number
  payload?: DurationTrendItem
}

function StatusDot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null) return null
  const fill = payload?.status === 'completed' ? '#22c55e' : '#ef4444'
  return <circle cx={cx} cy={cy} r={4} fill={fill} />
}

interface TooltipPayloadItem {
  payload?: DurationTrendItem
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  if (!item) return null
  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow">
      <p className="font-medium text-gray-900 dark:text-gray-100">Step {item.step}: {item.title}</p>
      <p className="text-gray-600 dark:text-gray-300">Duration: {formatDuration(item.duration_secs)}</p>
      <p className="text-gray-600 dark:text-gray-300">Status: {item.status}</p>
    </div>
  )
}

export default function DurationTrendChart() {
  const { data, isLoading, error } = useDurationTrend()
  const dark = useDarkMode()

  if (isLoading) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <Skeleton className="h-4 w-40 mb-3" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }
  if (error || !data) return <p className="text-red-600 dark:text-red-400">Failed to load duration trend.</p>

  const chartData = data.map(d => ({
    ...d,
    duration_min: d.duration_secs != null ? d.duration_secs / 60 : null,
  }))

  const axisColor = dark ? '#9ca3af' : '#6b7280'
  const gridColor = dark ? '#374151' : '#e5e7eb'

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Step Duration Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="step" tick={{ fill: axisColor }} label={{ value: 'Step', position: 'insideBottom', offset: -5, fill: axisColor }} />
          <YAxis tick={{ fill: axisColor }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: axisColor }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="duration_min"
            stroke="#6366f1"
            dot={<StatusDot />}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
