import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DispatchViewer from './DispatchViewer'

describe('DispatchViewer', () => {
  it('renders skill name in collapsed state', () => {
    render(<DispatchViewer skill="/parse-roadmap" durationSecs={45} content="output text" />)
    expect(screen.getByText('/parse-roadmap')).toBeInTheDocument()
    expect(screen.getByText('(45s)')).toBeInTheDocument()
  })

  it('does not show content when collapsed', () => {
    render(<DispatchViewer skill="/parse-roadmap" durationSecs={45} content="output text" />)
    expect(screen.queryByText('output text')).not.toBeInTheDocument()
  })

  it('expands to show dispatch content on click', async () => {
    const user = userEvent.setup()
    render(<DispatchViewer skill="/parse-roadmap" durationSecs={45} content="output text" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('output text')).toBeInTheDocument()
  })

  it('shows not-available message when content is null', async () => {
    const user = userEvent.setup()
    render(<DispatchViewer skill="/parse-roadmap" durationSecs={null} content={null} />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Dispatch content not available.')).toBeInTheDocument()
  })

  it('renders content in a pre block', async () => {
    const user = userEvent.setup()
    render(<DispatchViewer skill="/parse-roadmap" durationSecs={45} content="log output" />)
    await user.click(screen.getByRole('button'))
    const code = screen.getByText('log output')
    expect(code.closest('pre')).not.toBeNull()
  })

  it('is keyboard accessible', async () => {
    const user = userEvent.setup()
    render(<DispatchViewer skill="/parse-roadmap" durationSecs={45} content="output" />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})
