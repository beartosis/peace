import type {
  RunSummary,
  StepSummary,
  StepDetail,
  HandoffOut,
  StatsOverview,
  EnhancedStatsOverview,
  DurationTrendItem,
  StateDurationStats,
  FailureBreakdown,
  RecentFailureItem,
  LiveSnapshot,
} from '../types'

const BASE_URL = '/api'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export function fetchRuns(): Promise<RunSummary[]> {
  return fetchJson<RunSummary[]>('/runs')
}

export function fetchRun(id: number): Promise<RunSummary> {
  return fetchJson<RunSummary>(`/runs/${id}`)
}

export function fetchRunSteps(runId: number): Promise<StepSummary[]> {
  return fetchJson<StepSummary[]>(`/runs/${runId}/steps`)
}

export function fetchStepDetail(runId: number, stepNumber: number): Promise<StepDetail> {
  return fetchJson<StepDetail>(`/runs/${runId}/steps/${stepNumber}`)
}

export function fetchStepHandoff(runId: number, stepNumber: number): Promise<HandoffOut> {
  return fetchJson<HandoffOut>(`/runs/${runId}/steps/${stepNumber}/handoff`)
}

export function fetchStats(): Promise<StatsOverview> {
  return fetchJson<StatsOverview>('/stats')
}

export function fetchStatsOverview(): Promise<EnhancedStatsOverview> {
  return fetchJson<EnhancedStatsOverview>('/stats/overview')
}

export function fetchDurationTrend(): Promise<DurationTrendItem[]> {
  return fetchJson<DurationTrendItem[]>('/stats/duration-trend')
}

export function fetchStateDurations(): Promise<Record<string, StateDurationStats>> {
  return fetchJson<Record<string, StateDurationStats>>('/stats/state-durations')
}

export function fetchFailureBreakdown(): Promise<FailureBreakdown> {
  return fetchJson<FailureBreakdown>('/stats/failure-breakdown')
}

export function fetchRecentFailures(): Promise<RecentFailureItem[]> {
  return fetchJson<RecentFailureItem[]>('/stats/recent-failures')
}

export function fetchLiveSnapshot(): Promise<LiveSnapshot> {
  return fetchJson<LiveSnapshot>('/live/snapshot')
}
