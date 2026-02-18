import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StateNodeDetail from './StateNodeDetail'
import { makeTransition, makeArbiterEvent } from '../test/handlers'

describe('StateNodeDetail', () => {
  it('renders transitions for the selected state', () => {
    const transitions = [
      makeTransition({ id: 1, from_state: 'INIT', to_state: 'PARSE_ROADMAP', verdict: 'STEP_FOUND' }),
      makeTransition({ id: 2, from_state: 'PARSE_ROADMAP', to_state: 'CREATE_SPEC', verdict: 'SPEC_CREATED' }),
    ]
    render(
      <StateNodeDetail state="PARSE_ROADMAP" transitions={transitions} arbiterEvents={[]} />
    )
    // Should show the transition into PARSE_ROADMAP
    expect(screen.getByText(/INIT/)).toBeInTheDocument()
    expect(screen.getByText(/STEP_FOUND/)).toBeInTheDocument()
    // Should NOT show the transition into CREATE_SPEC
    expect(screen.queryByText(/SPEC_CREATED/)).not.toBeInTheDocument()
  })

  it('shows dispatch skill and duration', () => {
    const transitions = [
      makeTransition({
        id: 1, from_state: 'INIT', to_state: 'PARSE_ROADMAP',
        dispatch_skill: '/parse-roadmap', dispatch_duration_secs: 45,
      }),
    ]
    render(
      <StateNodeDetail state="PARSE_ROADMAP" transitions={transitions} arbiterEvents={[]} />
    )
    expect(screen.getByText(/\/parse-roadmap/)).toBeInTheDocument()
    expect(screen.getAllByText(/45s/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders arbiter events when present', () => {
    const transitions = [
      makeTransition({ id: 1, from_state: 'EXECUTE_TASKS', to_state: 'MERGE_PRS' }),
    ]
    const arbiterEvents = [
      makeArbiterEvent({ id: 1, transition_id: 1, attempt: 1, max_attempts: 3, pr_number: 193 }),
      makeArbiterEvent({ id: 2, transition_id: 1, attempt: 2, max_attempts: 3, pr_number: 193 }),
    ]
    render(
      <StateNodeDetail state="MERGE_PRS" transitions={transitions} arbiterEvents={arbiterEvents} />
    )
    expect(screen.getByText(/Attempt 1\/3/)).toBeInTheDocument()
    expect(screen.getByText(/Attempt 2\/3/)).toBeInTheDocument()
  })

  it('shows message when no transitions for state', () => {
    render(
      <StateNodeDetail state="HANDOFF" transitions={[]} arbiterEvents={[]} />
    )
    expect(screen.getByText('No transitions recorded for this state.')).toBeInTheDocument()
  })

  it('shows revision badge for self-transitions', () => {
    const transitions = [
      makeTransition({
        id: 1, from_state: 'CREATE_SPEC', to_state: 'CREATE_SPEC',
        is_self_transition: true,
      }),
    ]
    render(
      <StateNodeDetail state="CREATE_SPEC" transitions={transitions} arbiterEvents={[]} />
    )
    expect(screen.getByText('revision')).toBeInTheDocument()
  })
})
