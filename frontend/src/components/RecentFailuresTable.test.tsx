import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RecentFailuresTable from './RecentFailuresTable'

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  )
}

describe('RecentFailuresTable', () => {
  it('renders table with failure rows', async () => {
    renderWithQuery(<RecentFailuresTable />)
    const table = await screen.findByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('Character Stat Sheet')).toBeInTheDocument()
    expect(screen.getByText('Inventory System')).toBeInTheDocument()
  })

  it('renders column headers', async () => {
    renderWithQuery(<RecentFailuresTable />)
    await screen.findByRole('table')
    expect(screen.getByText('Step')).toBeInTheDocument()
    expect(screen.getByText('State')).toBeInTheDocument()
    expect(screen.getByText('Verdict')).toBeInTheDocument()
    expect(screen.getByText('Arbiter')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
  })

  it('renders arbiter attempt counts', async () => {
    renderWithQuery(<RecentFailuresTable />)
    await screen.findByRole('table')
    expect(screen.getByText('3 attempts')).toBeInTheDocument()
  })
})
