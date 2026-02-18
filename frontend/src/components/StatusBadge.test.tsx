import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('renders completed status with green styling', () => {
    render(<StatusBadge status="completed" />)
    const badge = screen.getByText('Completed')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('renders failed status with red styling', () => {
    render(<StatusBadge status="failed" />)
    const badge = screen.getByText('Failed')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('renders halted status with red styling', () => {
    render(<StatusBadge status="halted" />)
    const badge = screen.getByText('Halted')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('renders running status with blue styling', () => {
    render(<StatusBadge status="running" />)
    const badge = screen.getByText('Running')
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('renders unknown status with gray styling for null', () => {
    render(<StatusBadge status={null} />)
    const badge = screen.getByText('Unknown')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
  })

  it('renders unrecognized status with gray styling', () => {
    render(<StatusBadge status="pending" />)
    const badge = screen.getByText('Pending')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
  })
})
