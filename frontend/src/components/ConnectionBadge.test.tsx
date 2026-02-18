import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConnectionBadge from './ConnectionBadge'

describe('ConnectionBadge', () => {
  it('renders connected state with Live text', () => {
    render(<ConnectionBadge status="connected" />)
    expect(screen.getByText('Live')).toBeDefined()
  })

  it('renders connecting state', () => {
    render(<ConnectionBadge status="connecting" />)
    expect(screen.getByText('Connecting...')).toBeDefined()
  })

  it('renders disconnected state', () => {
    render(<ConnectionBadge status="disconnected" />)
    expect(screen.getByText('Disconnected')).toBeDefined()
  })

  it('shows pulsing dot when connected', () => {
    const { container } = render(<ConnectionBadge status="connected" />)
    const dot = container.querySelector('.animate-pulse')
    expect(dot).not.toBeNull()
  })

  it('does not pulse when disconnected', () => {
    const { container } = render(<ConnectionBadge status="disconnected" />)
    const dot = container.querySelector('.animate-pulse')
    expect(dot).toBeNull()
  })
})
