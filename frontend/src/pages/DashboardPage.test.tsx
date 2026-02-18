import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DashboardPage from './DashboardPage'

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  it('renders the dashboard heading', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders summary cards section', async () => {
    renderDashboard()
    expect(await screen.findByText('90/93')).toBeInTheDocument()
  })

  it('renders chart headings', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Step Duration Trend' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Time by Phase' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Failures by State' })).toBeInTheDocument()
  })

  it('renders recent failures table', async () => {
    renderDashboard()
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('renders recent failures heading', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Recent Failures' })).toBeInTheDocument()
  })
})
