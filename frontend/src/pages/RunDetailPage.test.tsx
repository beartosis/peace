import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RunDetailPage from './RunDetailPage'

function renderAtRoute(route: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/runs/:runId" element={<RunDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RunDetailPage', () => {
  it('renders run header with project name', async () => {
    renderAtRoute('/runs/1')
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('my-project')
  })

  it('renders summary stats cards', async () => {
    renderAtRoute('/runs/1')
    await screen.findByRole('heading', { level: 1 })
    // Steps card shows completed/attempted
    expect(screen.getByText('90/93')).toBeInTheDocument()
    // Failed card
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders StepTimeline section', async () => {
    renderAtRoute('/runs/1')
    const section = await screen.findByRole('region', { name: 'Step timeline' })
    expect(section).toBeInTheDocument()
  })

  it('shows status badge', async () => {
    renderAtRoute('/runs/1')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
  })
})
