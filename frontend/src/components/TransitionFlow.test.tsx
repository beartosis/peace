import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TransitionFlow from './TransitionFlow'
import { makeTransition, makeArbiterEvent } from '../test/handlers'

describe('TransitionFlow', () => {
  it('renders empty state message when no transitions', () => {
    render(<TransitionFlow transitions={[]} arbiterEvents={[]} />)
    expect(screen.getByText('No transitions recorded.')).toBeInTheDocument()
  })

  it('renders transitions in order', () => {
    const transitions = [
      makeTransition({ id: 1, from_state: 'INIT', to_state: 'PARSE_ROADMAP' }),
      makeTransition({ id: 2, from_state: 'PARSE_ROADMAP', to_state: 'CREATE_SPEC' }),
    ]
    render(<TransitionFlow transitions={transitions} arbiterEvents={[]} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
  })

  it('highlights self-transitions with revision label', () => {
    const transitions = [
      makeTransition({
        id: 1,
        from_state: 'CREATE_SPEC',
        to_state: 'CREATE_SPEC',
        is_self_transition: true,
      }),
    ]
    render(<TransitionFlow transitions={transitions} arbiterEvents={[]} />)
    expect(screen.getByText('revision')).toBeInTheDocument()
  })

  it('displays dispatch skill and duration', () => {
    const transitions = [
      makeTransition({
        id: 1,
        dispatch_skill: '/create-spec',
        dispatch_duration_secs: 180,
      }),
    ]
    render(<TransitionFlow transitions={transitions} arbiterEvents={[]} />)
    expect(screen.getByText('/create-spec (3m 00s)')).toBeInTheDocument()
  })

  it('renders arbiter events under their parent transition', () => {
    const transitions = [
      makeTransition({ id: 10, from_state: 'MERGE_PRS', to_state: 'MERGE_PRS' }),
    ]
    const arbiterEvents = [
      makeArbiterEvent({ id: 1, transition_id: 10, attempt: 1, max_attempts: 3, verdict: null }),
      makeArbiterEvent({ id: 2, transition_id: 10, attempt: 2, max_attempts: 3, verdict: 'MERGE_BLOCKED' }),
    ]
    render(<TransitionFlow transitions={transitions} arbiterEvents={arbiterEvents} />)
    expect(screen.getByText(/Attempt 1\/3/)).toBeInTheDocument()
    expect(screen.getByText(/Attempt 2\/3/)).toBeInTheDocument()
    expect(screen.getByText(/MERGE_BLOCKED/)).toBeInTheDocument()
  })

  it('formats duration correctly', () => {
    const transitions = [
      makeTransition({ id: 1, duration_secs: 45 }),
    ]
    render(<TransitionFlow transitions={transitions} arbiterEvents={[]} />)
    expect(screen.getByText('45s')).toBeInTheDocument()
  })
})
