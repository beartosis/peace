import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import RunList from './RunList'

function renderWithProviders(ui: React.ReactElement, initialRoute = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RunList', () => {
  it('shows loading skeleton initially', () => {
    const { container } = renderWithProviders(<RunList />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders run items with project name', async () => {
    renderWithProviders(<RunList />)
    const project = await screen.findByText(/my-project/)
    expect(project).toBeInTheDocument()
  })

  it('renders step counts', async () => {
    renderWithProviders(<RunList />)
    await screen.findByText(/my-project/)
    expect(screen.getByText(/93 steps/)).toBeInTheDocument()
  })

  it('renders runs as links', async () => {
    renderWithProviders(<RunList />)
    await screen.findByText(/my-project/)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/runs/1')
  })
})
