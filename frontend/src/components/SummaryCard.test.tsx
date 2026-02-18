import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SummaryCard from './SummaryCard'

describe('SummaryCard', () => {
  it('renders label and value', () => {
    render(<SummaryCard label="PRs Merged" value="190" />)
    expect(screen.getByRole('heading', { name: 'PRs Merged' })).toBeInTheDocument()
    expect(screen.getByText('190')).toBeInTheDocument()
  })

  it('renders optional subtitle', () => {
    render(<SummaryCard label="Rate" value="96.8%" subtitle="90/93 steps" />)
    expect(screen.getByText('90/93 steps')).toBeInTheDocument()
  })

  it('omits subtitle when not provided', () => {
    const { container } = render(<SummaryCard label="Count" value="5" />)
    const paragraphs = container.querySelectorAll('p')
    // Only the value paragraph, no subtitle
    expect(paragraphs).toHaveLength(1)
  })
})
