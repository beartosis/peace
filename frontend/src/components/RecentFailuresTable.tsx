import { useRecentFailures } from '../api/hooks'
import { formatTimestamp } from '../utils'
import StatusBadge from './StatusBadge'
import Skeleton from './Skeleton'

export default function RecentFailuresTable() {
  const { data, isLoading, error } = useRecentFailures()

  if (isLoading) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    )
  }
  if (error || !data) return <p className="text-red-600 dark:text-red-400">Failed to load recent failures.</p>

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Failures</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No failures recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recent failures">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th scope="col" className="pb-2 pr-3 font-medium">Step</th>
                <th scope="col" className="pb-2 pr-3 font-medium">State</th>
                <th scope="col" className="pb-2 pr-3 font-medium">Verdict</th>
                <th scope="col" className="pb-2 pr-3 font-medium">Arbiter</th>
                <th scope="col" className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.step} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{item.step}</span>
                    {item.title && (
                      <span className="ml-1 text-gray-500 dark:text-gray-400">{item.title}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={item.state ?? ''} />
                  </td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{item.verdict ?? '--'}</td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                    {item.arbiter_attempts > 0
                      ? `${item.arbiter_attempts} attempt${item.arbiter_attempts !== 1 ? 's' : ''}`
                      : '--'}
                  </td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">{formatTimestamp(item.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
