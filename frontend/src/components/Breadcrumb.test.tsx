import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from './Breadcrumb'

function renderBreadcrumb(items: { label: string; to?: string }[]) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>
  )
}

describe('Breadcrumb', () => {
  it('renders all items', () => {
    renderBreadcrumb([
      { label: 'Dashboard', to: '/' },
      { label: 'Run #1', to: '/runs/1' },
      { label: 'Step 91' },
    ])
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Run #1')).toBeInTheDocument()
    expect(screen.getByText('Step 91')).toBeInTheDocument()
  })

  it('renders linked items as links', () => {
    renderBreadcrumb([
      { label: 'Dashboard', to: '/' },
      { label: 'Step 91' },
    ])
    const link = screen.getByRole('link', { name: 'Dashboard' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders last item as plain text (not a link)', () => {
    renderBreadcrumb([
      { label: 'Dashboard', to: '/' },
      { label: 'Step 91' },
    ])
    expect(screen.queryByRole('link', { name: 'Step 91' })).not.toBeInTheDocument()
    expect(screen.getByText('Step 91')).toBeInTheDocument()
  })

  it('has accessible navigation landmark', () => {
    renderBreadcrumb([{ label: 'Dashboard', to: '/' }, { label: 'Step 91' }])
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })
})
