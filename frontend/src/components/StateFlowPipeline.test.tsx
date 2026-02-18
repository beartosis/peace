import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StateFlowPipeline from './StateFlowPipeline'
import { makeTransition } from '../test/handlers'

describe('StateFlowPipeline', () => {
  const baseTransitions = [
    makeTransition({ id: 1, from_state: 'INIT', to_state: 'PARSE_ROADMAP' }),
    makeTransition({ id: 2, from_state: 'PARSE_ROADMAP', to_state: 'CREATE_SPEC' }),
  ]

  it('renders all 9 pipeline state nodes', () => {
    render(
      <StateFlowPipeline
        transitions={[]}
        arbiterEvents={[]}
        onNodeClick={() => {}}
        activeState={null}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(9)
  })

  it('marks reached states with checkmark', () => {
    render(
      <StateFlowPipeline
        transitions={baseTransitions}
        arbiterEvents={[]}
        onNodeClick={() => {}}
        activeState={null}
      />
    )
    // INIT, PARSE_ROADMAP, CREATE_SPEC should be reached (checkmark \u2713)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('\u2713') // INIT
    expect(buttons[1]).toHaveTextContent('\u2713') // PARSE_ROADMAP
    expect(buttons[2]).toHaveTextContent('\u2713') // CREATE_SPEC
    // REVIEW_SPEC should not be reached (empty circle)
    expect(buttons[3]).toHaveTextContent('\u25CB')
  })

  it('shows self-transition indicator', () => {
    const transitions = [
      ...baseTransitions,
      makeTransition({
        id: 3, from_state: 'CREATE_SPEC', to_state: 'CREATE_SPEC',
        is_self_transition: true,
      }),
    ]
    render(
      <StateFlowPipeline
        transitions={transitions}
        arbiterEvents={[]}
        onNodeClick={() => {}}
        activeState={null}
      />
    )
    expect(screen.getByTitle('1 revision(s)')).toBeInTheDocument()
  })

  it('calls onNodeClick when a node is clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <StateFlowPipeline
        transitions={baseTransitions}
        arbiterEvents={[]}
        onNodeClick={onClick}
        activeState={null}
      />
    )
    await user.click(screen.getAllByRole('button')[0])
    expect(onClick).toHaveBeenCalledWith('INIT')
  })

  it('marks active state with aria-pressed', () => {
    render(
      <StateFlowPipeline
        transitions={baseTransitions}
        arbiterEvents={[]}
        onNodeClick={() => {}}
        activeState="INIT"
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  })

  it('is keyboard accessible', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <StateFlowPipeline
        transitions={baseTransitions}
        arbiterEvents={[]}
        onNodeClick={onClick}
        activeState={null}
      />
    )
    screen.getAllByRole('button')[0].focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledWith('INIT')
  })
})
