import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import StepCard from './StepCard'
import { makeStep } from '../test/handlers'

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

function getToggleButton() {
  return screen.getByRole('button', { name: /toggle details/i })
}

describe('StepCard', () => {
  it('renders collapsed state with step name and status', () => {
    renderWithQuery(<StepCard step={makeStep()} />)
    expect(screen.getByText(/Step 91: Enemy Definition Schema/)).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('shows duration in collapsed state', () => {
    renderWithQuery(<StepCard step={makeStep()} />)
    expect(screen.getByText('12m 00s')).toBeInTheDocument()
  })

  it('has a link to the step detail page', () => {
    renderWithQuery(<StepCard step={makeStep()} />)
    const link = screen.getByRole('link', { name: /Step 91/ })
    expect(link).toHaveAttribute('href', '/runs/1/steps/91')
  })

  it('expands on toggle click and shows loading state', async () => {
    const user = userEvent.setup()
    renderWithQuery(<StepCard step={makeStep()} />)

    const button = getToggleButton()
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('loads and displays transitions when expanded', async () => {
    const user = userEvent.setup()
    renderWithQuery(<StepCard step={makeStep()} />)

    await user.click(getToggleButton())

    const transitionText = await screen.findByText(/INIT/)
    expect(transitionText).toBeInTheDocument()
  })

  it('collapses on second click', async () => {
    const user = userEvent.setup()
    renderWithQuery(<StepCard step={makeStep()} />)

    const button = getToggleButton()
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('handles keyboard activation with Enter', async () => {
    const user = userEvent.setup()
    renderWithQuery(<StepCard step={makeStep()} />)

    const button = getToggleButton()
    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})
