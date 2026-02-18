interface StatusBadgeProps {
  status: string | null
}

const statusStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  halted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
}

const defaultStyle = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = status ?? 'unknown'
  const style = (status && statusStyles[status]) ?? defaultStyle

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  )
}
