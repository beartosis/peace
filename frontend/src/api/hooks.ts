import { useQuery } from '@tanstack/react-query'
import {
  fetchRuns,
  fetchRun,
  fetchRunSteps,
  fetchStepDetail,
  fetchStepHandoff,
  fetchStatsOverview,
  fetchDurationTrend,
  fetchStateDurations,
  fetchFailureBreakdown,
  fetchRecentFailures,
  fetchLiveSnapshot,
} from './client'

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn: fetchRuns,
  })
}

export function useRun(id: number) {
  return useQuery({
    queryKey: ['runs', id],
    queryFn: () => fetchRun(id),
    enabled: id > 0,
  })
}

export function useRunSteps(runId: number) {
  return useQuery({
    queryKey: ['runs', runId, 'steps'],
    queryFn: () => fetchRunSteps(runId),
    enabled: runId > 0,
  })
}

export function useStepDetail(runId: number, stepNumber: number) {
  return useQuery({
    queryKey: ['runs', runId, 'steps', stepNumber],
    queryFn: () => fetchStepDetail(runId, stepNumber),
    enabled: runId > 0 && stepNumber > 0,
  })
}

export function useStepHandoff(runId: number, stepNumber: number) {
  return useQuery({
    queryKey: ['runs', runId, 'steps', stepNumber, 'handoff'],
    queryFn: () => fetchStepHandoff(runId, stepNumber),
    enabled: runId > 0 && stepNumber > 0,
    retry: false,
  })
}

export function useStatsOverview() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: fetchStatsOverview,
  })
}

export function useDurationTrend() {
  return useQuery({
    queryKey: ['stats', 'duration-trend'],
    queryFn: fetchDurationTrend,
  })
}

export function useStateDurations() {
  return useQuery({
    queryKey: ['stats', 'state-durations'],
    queryFn: fetchStateDurations,
  })
}

export function useFailureBreakdown() {
  return useQuery({
    queryKey: ['stats', 'failure-breakdown'],
    queryFn: fetchFailureBreakdown,
  })
}

export function useRecentFailures() {
  return useQuery({
    queryKey: ['stats', 'recent-failures'],
    queryFn: fetchRecentFailures,
  })
}

export function useLiveSnapshot() {
  return useQuery({
    queryKey: ['live', 'snapshot'],
    queryFn: fetchLiveSnapshot,
    refetchInterval: 10_000,
    retry: false,
  })
}
