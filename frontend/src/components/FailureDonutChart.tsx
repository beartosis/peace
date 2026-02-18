import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { useFailureBreakdown } from '../api/hooks'
import { useDarkMode } from '../hooks/useDarkMode'
import Skeleton from './Skeleton'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#14b8a6', '#8b5cf6']

interface TooltipPayloadItem {
  name?: string
  value?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow">
      <p className="text-gray-900 dark:text-gray-100">{item.name}: {item.value}</p>
    </div>
  )
}

export default function FailureDonutChart() {
  const { data, isLoading, error } = useFailureBreakdown()
  const dark = useDarkMode()

  if (isLoading) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <Skeleton className="h-4 w-36 mb-3" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }
  if (error || !data) return <p className="text-red-600 dark:text-red-400">Failed to load failure breakdown.</p>

  const chartData = Object.entries(data.by_state).map(([name, value]) => ({
    name,
    value,
  }))

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Failures by State</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No failures recorded.</p>
      </div>
    )
  }

  const legendColor = dark ? '#9ca3af' : '#6b7280'

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Failures by State</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {chartData.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: legendColor }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
