import type { ConnectionStatus } from '../types'

interface ConnectionBadgeProps {
  status: ConnectionStatus
}

const config: Record<ConnectionStatus, { dot: string; label: string; text: string }> = {
  connected: {
    dot: 'bg-green-500 animate-pulse',
    label: 'Live',
    text: 'text-green-700 dark:text-green-400',
  },
  connecting: {
    dot: 'bg-yellow-500',
    label: 'Connecting...',
    text: 'text-yellow-700 dark:text-yellow-400',
  },
  disconnected: {
    dot: 'bg-red-500',
    label: 'Disconnected',
    text: 'text-red-700 dark:text-red-400',
  },
}

export default function ConnectionBadge({ status }: ConnectionBadgeProps) {
  const { dot, label, text } = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
