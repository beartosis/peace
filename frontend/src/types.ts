export interface RunSummary {
  id: number
  project: string | null
  log_file: string | null
  started_at: string | null
  ended_at: string | null
  steps_attempted: number
  steps_completed: number
  steps_failed: number
  status: string | null
}

export interface StepSummary {
  id: number
  run_id: number | null
  step_number: number
  title: string | null
  phase: string | null
  started_at: string | null
  ended_at: string | null
  final_state: string | null
  final_verdict: string | null
  status: string | null
  tasks_total: number
  tasks_completed: number
  prs_opened: string | null
  prs_merged: string | null
  handoff_file: string | null
}

export interface TransitionOut {
  id: number
  step_id: number | null
  timestamp: string | null
  from_state: string | null
  to_state: string | null
  verdict: string | null
  duration_secs: number | null
  log_level: string | null
  message: string | null
  note: string | null
  dispatch_skill: string | null
  dispatch_duration_secs: number | null
  dispatch_content: string | null
  is_self_transition: boolean
}

export interface ArbiterEventOut {
  id: number
  step_id: number | null
  transition_id: number | null
  attempt: number | null
  max_attempts: number | null
  verdict: string | null
  pr_number: number | null
  ci_failure_file: string | null
}

export interface StepDetail extends StepSummary {
  transitions: TransitionOut[]
  arbiter_events: ArbiterEventOut[]
}

export interface StatsOverview {
  total_steps: number
  completed: number
  failed: number
  total_prs: number
  total_transitions: number
  total_self_transitions: number
  total_arbiter_events: number
  total_handoffs: number
  total_runs: number
}

export interface EnhancedStatsOverview {
  total_steps: number
  completed: number
  failed: number
  pass_rate: number
  avg_step_duration_secs: number | null
  avg_dispatch_duration_secs: number | null
  total_prs_merged: number
  total_arbiter_interventions: number
  arbiter_success_rate: number
  total_self_transitions: number
}

export interface DurationTrendItem {
  step: number
  title: string | null
  duration_secs: number | null
  status: string | null
}

export interface StateDurationStats {
  avg: number
  p50: number
  p95: number
}

export interface FailureBreakdown {
  by_state: Record<string, number>
  by_verdict: Record<string, number>
  self_transitions_by_state: Record<string, number>
  arbiter_interventions: number
  arbiter_resolved: number
  arbiter_halted: number
}

export interface HandoffOut {
  id: number
  step_id: number | null
  step_number: number | null
  key_decisions: string | null
  tradeoffs: string | null
  known_risks: string | null
  learnings: string | null
  followups: string | null
  next_step_number: number | null
  next_step_title: string | null
}

export interface RecentFailureItem {
  step: number
  title: string | null
  state: string | null
  verdict: string | null
  arbiter_attempts: number
  timestamp: string | null
}

// ── Live streaming types ──────────────────────────────────────

export interface OrderEvent {
  type: string
  ts: string
  seq: number
  step: number | null
  state: string
  // state_transition
  from?: string
  to?: string
  note?: string
  // dispatch_start / dispatch_end
  skill?: string
  model?: string
  exit_code?: string
  elapsed_secs?: string
  error?: string
  // pr_status
  pr_number?: string
  status?: string
  // step_start
  title?: string
  // arbiter_verdict
  verdict?: string
  attempt?: string
  // run_start
  log_file?: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface LiveSnapshot {
  current_state: string
  step_number: number
  last_transition: string | null
  last_result?: {
    verdict?: string
    skill?: string
    title?: string
  }
  spec_id?: string
  consecutive_failures: number
}
