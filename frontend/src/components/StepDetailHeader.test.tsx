import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StepDetailHeader from './StepDetailHeader'
import { makeStepDetail, makeArbiterEvent } from '../test/handlers'

describe('StepDetailHeader', () => {
  it('renders step number and title', () => {
    render(<StepDetailHeader step={makeStepDetail()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Step 91: Enemy Definition Schema')
  })

  it('renders status badge', () => {
    render(<StepDetailHeader step={makeStepDetail()} />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders duration', () => {
    render(<StepDetailHeader step={makeStepDetail()} />)
    expect(screen.getByText(/Duration: 12m 00s/)).toBeInTheDocument()
  })

  it('renders PR numbers', () => {
    render(<StepDetailHeader step={makeStepDetail()} />)
    expect(screen.getByText(/PR: #195/)).toBeInTheDocument()
  })

  it('renders task counts', () => {
    render(<StepDetailHeader step={makeStepDetail()} />)
    expect(screen.getByText(/Tasks: 2\/2/)).toBeInTheDocument()
  })

  it('renders arbiter count when events exist', () => {
    const step = makeStepDetail({
      arbiter_events: [makeArbiterEvent(), makeArbiterEvent({ id: 2, attempt: 2 })],
    })
    render(<StepDetailHeader step={step} />)
    expect(screen.getByText(/Arbiter: 2 attempts/)).toBeInTheDocument()
  })

  it('hides arbiter count when no events', () => {
    render(<StepDetailHeader step={makeStepDetail({ arbiter_events: [] })} />)
    expect(screen.queryByText(/Arbiter:/)).not.toBeInTheDocument()
  })
})
