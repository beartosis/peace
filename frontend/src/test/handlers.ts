import { http, HttpResponse } from 'msw'
import type {
  RunSummary,
  StepSummary,
  StepDetail,
  TransitionOut,
  ArbiterEventOut,
  HandoffOut,
  StatsOverview,
  EnhancedStatsOverview,
  DurationTrendItem,
  StateDurationStats,
  FailureBreakdown,
  RecentFailureItem,
} from '../types'

export function makeRun(overrides?: Partial<RunSummary>): RunSummary {
  return {
    id: 1,
    project: 'my-project',
    log_file: 'order-run-2026-02-17.log',
    started_at: '2026-02-17T01:00:00-08:00',
    ended_at: '2026-02-17T09:00:00-08:00',
    steps_attempted: 93,
    steps_completed: 90,
    steps_failed: 3,
    status: 'completed',
    ...overrides,
  }
}

export function makeStep(overrides?: Partial<StepSummary>): StepSummary {
  return {
    id: 1,
    run_id: 1,
    step_number: 91,
    title: 'Enemy Definition Schema',
    phase: 'Phase 11: Combat Simulation Engine',
    started_at: '2026-02-17T08:00:00-08:00',
    ended_at: '2026-02-17T08:12:00-08:00',
    final_state: 'HANDOFF',
    final_verdict: 'HANDOFF_COMPLETE',
    status: 'completed',
    tasks_total: 2,
    tasks_completed: 2,
    prs_opened: '[195]',
    prs_merged: '[195]',
    handoff_file: 'step-91_HANDOFF.yml',
    ...overrides,
  }
}

export function makeTransition(overrides?: Partial<TransitionOut>): TransitionOut {
  return {
    id: 1,
    step_id: 1,
    timestamp: '2026-02-17T08:00:00-08:00',
    from_state: 'INIT',
    to_state: 'PARSE_ROADMAP',
    verdict: 'STEP_FOUND',
    duration_secs: 45,
    log_level: 'INFO',
    message: 'Dispatch OK (45s): /parse-roadmap',
    note: null,
    dispatch_skill: '/parse-roadmap',
    dispatch_duration_secs: 45,
    dispatch_content: null,
    is_self_transition: false,
    ...overrides,
  }
}

export function makeArbiterEvent(overrides?: Partial<ArbiterEventOut>): ArbiterEventOut {
  return {
    id: 1,
    step_id: 1,
    transition_id: 1,
    attempt: 1,
    max_attempts: 3,
    verdict: null,
    pr_number: 193,
    ci_failure_file: null,
    ...overrides,
  }
}

export function makeStepDetail(overrides?: Partial<StepDetail>): StepDetail {
  return {
    ...makeStep(),
    transitions: [
      makeTransition(),
      makeTransition({
        id: 2,
        from_state: 'PARSE_ROADMAP',
        to_state: 'CREATE_SPEC',
        verdict: 'SPEC_CREATED',
        duration_secs: 180,
        dispatch_skill: '/create-spec',
        dispatch_duration_secs: 180,
        timestamp: '2026-02-17T08:00:45-08:00',
      }),
    ],
    arbiter_events: [],
    ...overrides,
  }
}

export function makeHandoff(overrides?: Partial<HandoffOut>): HandoffOut {
  return {
    id: 1,
    step_id: 1,
    step_number: 91,
    key_decisions: '[{"decision":"Use existing schema"}]',
    tradeoffs: '["Simpler model over flexibility"]',
    known_risks: '["Performance with large datasets"]',
    learnings: '["Schema validation catches errors early"]',
    followups: '["Add pagination support"]',
    next_step_number: 92,
    next_step_title: 'Combat Resolution',
    ...overrides,
  }
}

export function makeEnhancedStats(overrides?: Partial<EnhancedStatsOverview>): EnhancedStatsOverview {
  return {
    total_steps: 93,
    completed: 90,
    failed: 3,
    pass_rate: 0.968,
    avg_step_duration_secs: 842,
    total_prs_merged: 190,
    total_arbiter_interventions: 12,
    arbiter_success_rate: 0.75,
    total_self_transitions: 28,
    ...overrides,
  }
}

export function makeDurationTrendItem(overrides?: Partial<DurationTrendItem>): DurationTrendItem {
  return {
    step: 55,
    title: 'Character List Endpoint',
    duration_secs: 720,
    status: 'completed',
    ...overrides,
  }
}

export function makeStateDuration(overrides?: Partial<StateDurationStats>): StateDurationStats {
  return {
    avg: 180,
    p50: 160,
    p95: 340,
    ...overrides,
  }
}

export function makeFailureBreakdown(overrides?: Partial<FailureBreakdown>): FailureBreakdown {
  return {
    by_state: { MERGE_PRS: 2, EXECUTE_TASKS: 1 },
    by_verdict: { MERGE_BLOCKED: 2, TASKS_FAILED: 1 },
    self_transitions_by_state: { CREATE_SPEC: 15, REVIEW_SPEC: 8, PARSE_ROADMAP: 5 },
    arbiter_interventions: 12,
    arbiter_resolved: 9,
    arbiter_halted: 3,
    ...overrides,
  }
}

export function makeRecentFailureItem(overrides?: Partial<RecentFailureItem>): RecentFailureItem {
  return {
    step: 90,
    title: 'Character Stat Sheet',
    state: 'MERGE_PRS',
    verdict: 'MERGE_BLOCKED',
    arbiter_attempts: 3,
    timestamp: '2026-02-16T20:08:57-08:00',
    ...overrides,
  }
}

const defaultStats: StatsOverview = {
  total_steps: 93,
  completed: 90,
  failed: 3,
  total_prs: 190,
  total_transitions: 450,
  total_self_transitions: 28,
  total_arbiter_events: 12,
  total_handoffs: 90,
  total_runs: 1,
}

export const handlers = [
  http.get('/api/runs', () => {
    return HttpResponse.json([makeRun()])
  }),

  http.get('/api/runs/:id', () => {
    return HttpResponse.json(makeRun())
  }),

  http.get('/api/runs/:id/steps', () => {
    return HttpResponse.json([
      makeStep(),
      makeStep({
        id: 2,
        step_number: 90,
        title: 'Character Stat Sheet',
        status: 'halted',
        final_state: 'MERGE_PRS',
        final_verdict: 'MERGE_BLOCKED',
        started_at: '2026-02-17T07:40:00-08:00',
        ended_at: '2026-02-17T08:00:00-08:00',
      }),
    ])
  }),

  http.get('/api/steps/:id', () => {
    return HttpResponse.json(makeStepDetail())
  }),

  http.get('/api/steps/:id/handoff', () => {
    return HttpResponse.json(makeHandoff())
  }),

  http.get('/api/runs/:runId/steps/:stepNumber', () => {
    return HttpResponse.json(makeStepDetail())
  }),

  http.get('/api/runs/:runId/steps/:stepNumber/handoff', () => {
    return HttpResponse.json(makeHandoff())
  }),

  http.get('/api/stats', () => {
    return HttpResponse.json(defaultStats)
  }),

  http.get('/api/stats/overview', () => {
    return HttpResponse.json(makeEnhancedStats())
  }),

  http.get('/api/stats/duration-trend', () => {
    return HttpResponse.json([
      makeDurationTrendItem(),
      makeDurationTrendItem({ step: 56, title: 'Enemy AI Framework', duration_secs: 950, status: 'completed' }),
      makeDurationTrendItem({ step: 57, title: 'Battle Resolution', duration_secs: 1200, status: 'halted' }),
    ])
  }),

  http.get('/api/stats/state-durations', () => {
    return HttpResponse.json({
      CREATE_SPEC: makeStateDuration(),
      REVIEW_SPEC: makeStateDuration({ avg: 95, p50: 90, p95: 150 }),
      PLAN_WORK: makeStateDuration({ avg: 110, p50: 100, p95: 200 }),
      EXECUTE_TASKS: makeStateDuration({ avg: 450, p50: 380, p95: 800 }),
      MERGE_PRS: makeStateDuration({ avg: 180, p50: 120, p95: 400 }),
      VERIFY_COMPLETION: makeStateDuration({ avg: 30, p50: 25, p95: 60 }),
      HANDOFF: makeStateDuration({ avg: 45, p50: 40, p95: 80 }),
    })
  }),

  http.get('/api/stats/failure-breakdown', () => {
    return HttpResponse.json(makeFailureBreakdown())
  }),

  http.get('/api/stats/recent-failures', () => {
    return HttpResponse.json([
      makeRecentFailureItem(),
      makeRecentFailureItem({ step: 88, title: 'Inventory System', state: 'EXECUTE_TASKS', verdict: 'TASKS_FAILED', arbiter_attempts: 0, timestamp: '2026-02-16T18:30:00-08:00' }),
    ])
  }),
]
