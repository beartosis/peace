import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SummaryCards from './SummaryCards'

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  )
}

describe('SummaryCards', () => {
  it('shows loading skeleton initially', () => {
    const { container } = renderWithQuery(<SummaryCards />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders all four summary cards with data', async () => {
    renderWithQuery(<SummaryCards />)
    // Steps Completed
    expect(await screen.findByText('90/93')).toBeInTheDocument()
    // PRs Merged
    expect(screen.getByText('190')).toBeInTheDocument()
    // Arbiter Success Rate
    expect(screen.getByText('75.0%')).toBeInTheDocument()
  })

  it('renders card labels', async () => {
    renderWithQuery(<SummaryCards />)
    await screen.findByText('90/93')
    expect(screen.getByRole('heading', { name: 'Steps Completed' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PRs Merged' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Avg Step Duration' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Arbiter Success Rate' })).toBeInTheDocument()
  })
})
