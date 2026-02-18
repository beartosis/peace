import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import HandoffViewer from './HandoffViewer'
import { server } from '../test/server'

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  )
}

describe('HandoffViewer', () => {
  it('shows loading state', () => {
    renderWithQuery(<HandoffViewer runId={1} stepNumber={1} />)
    expect(screen.getByText('Loading handoff...')).toBeInTheDocument()
  })

  it('renders all handoff sections', async () => {
    renderWithQuery(<HandoffViewer runId={1} stepNumber={1} />)
    expect(await screen.findByText('Key Decisions')).toBeInTheDocument()
    expect(screen.getByText('Tradeoffs')).toBeInTheDocument()
    expect(screen.getByText('Known Risks')).toBeInTheDocument()
    expect(screen.getByText('Learnings')).toBeInTheDocument()
    expect(screen.getByText('Follow-ups')).toBeInTheDocument()
  })

  it('renders next step info', async () => {
    renderWithQuery(<HandoffViewer runId={1} stepNumber={1} />)
    expect(await screen.findByText(/Next: Step 92/)).toBeInTheDocument()
    expect(screen.getByText(/Combat Resolution/)).toBeInTheDocument()
  })

  it('renders nothing when handoff not found (404)', async () => {
    server.use(
      http.get('/api/runs/:runId/steps/:stepNumber/handoff', () => {
        return new HttpResponse(null, { status: 404 })
      })
    )
    const { container } = renderWithQuery(<HandoffViewer runId={1} stepNumber={999} />)
    // Wait for loading to finish
    await screen.findByText('Loading handoff...')
    // After error, should render nothing
    await new Promise(r => setTimeout(r, 100))
    expect(container.querySelector('[class*="rounded"]')).toBeNull()
  })

  it('parses JSON array items correctly', async () => {
    renderWithQuery(<HandoffViewer runId={1} stepNumber={1} />)
    // From makeHandoff: key_decisions contains object format, tradeoffs contains string format
    expect(await screen.findByText('Use existing schema')).toBeInTheDocument()
    expect(screen.getByText('Simpler model over flexibility')).toBeInTheDocument()
  })
})
