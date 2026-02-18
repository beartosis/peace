import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import LiveEventLog from './LiveEventLog'
import type { OrderEvent } from '../types'

beforeAll(() => {
  Element.prototype.scrollTo = () => {}
})

const makeEvent = (overrides: Partial<OrderEvent> = {}): OrderEvent => ({
  type: 'state_transition',
  ts: '2026-02-18T01:00:00-08:00',
  seq: 1,
  step: 110,
  state: 'INIT',
  from: 'INIT',
  to: 'PARSE_ROADMAP',
  ...overrides,
})

describe('LiveEventLog', () => {
  it('shows waiting message when no events', () => {
    render(<LiveEventLog events={[]} followMode={true} />)
    expect(screen.getByText('Waiting for events...')).toBeDefined()
  })

  it('renders events', () => {
    const events = [
      makeEvent({ seq: 1, from: 'INIT', to: 'PARSE_ROADMAP' }),
      makeEvent({ seq: 2, type: 'dispatch_start', skill: '/parse-roadmap' }),
    ]
    render(<LiveEventLog events={events} followMode={true} />)
    expect(screen.getByText(/INIT/)).toBeDefined()
    expect(screen.getByText(/parse-roadmap/)).toBeDefined()
  })

  it('shows event count in header', () => {
    const events = [
      makeEvent({ seq: 1 }),
      makeEvent({ seq: 2 }),
      makeEvent({ seq: 3 }),
    ]
    render(<LiveEventLog events={events} followMode={false} />)
    expect(screen.getByText('Event Log (3)')).toBeDefined()
  })

  it('shows dispatch errors in red', () => {
    const events = [
      makeEvent({
        seq: 1,
        type: 'dispatch_end',
        skill: '/parse-roadmap',
        error: 'timeout',
        elapsed_secs: '1800',
      }),
    ]
    const { container } = render(<LiveEventLog events={events} followMode={false} />)
    const errorCell = container.querySelector('.text-red-600')
    expect(errorCell).not.toBeNull()
  })
})
