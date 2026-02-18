export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '--'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (minutes < 60) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`
}

export function computeStepDuration(
  startedAt: string | null,
  endedAt: string | null,
): number | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (isNaN(start) || isNaN(end)) return null
  return (end - start) / 1000
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return '--'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function parseJsonArray(json: string | null): unknown[] {
  if (!json) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function parsePrNumbers(json: string | null): number[] {
  if (!json) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed.filter((n): n is number => typeof n === 'number')
    return []
  } catch {
    return []
  }
}
