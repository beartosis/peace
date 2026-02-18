import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import StepTimeline from './StepTimeline'

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StepTimeline', () => {
  it('shows loading skeleton initially', () => {
    const { container } = renderWithProviders(<StepTimeline runId={1} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders step cards when data loads', async () => {
    renderWithProviders(<StepTimeline runId={1} />)
    const step91 = await screen.findByText(/Step 91/)
    expect(step91).toBeInTheDocument()
    expect(screen.getByText(/Step 90/)).toBeInTheDocument()
  })

  it('renders the Steps heading', async () => {
    renderWithProviders(<StepTimeline runId={1} />)
    await screen.findByText(/Step 91/)
    expect(screen.getByRole('heading', { name: 'Steps' })).toBeInTheDocument()
  })
})
