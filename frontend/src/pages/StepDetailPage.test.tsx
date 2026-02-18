import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StepDetailPage from './StepDetailPage'

function renderAtRoute(route: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/runs/:runId/steps/:stepNumber" element={<StepDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StepDetailPage', () => {
  it('shows loading state initially', () => {
    renderAtRoute('/runs/1/steps/1')
    expect(screen.getByText('Loading step...')).toBeInTheDocument()
  })

  it('renders breadcrumb navigation', async () => {
    renderAtRoute('/runs/1/steps/1')
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
  })

  it('renders step title in heading', async () => {
    renderAtRoute('/runs/1/steps/1')
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/Step 91/)
  })

  it('shows error for invalid step ID', () => {
    renderAtRoute('/runs/1/steps/abc')
    expect(screen.getByText('Invalid step or run ID.')).toBeInTheDocument()
  })
})
