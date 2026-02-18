import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DarkModeToggle from './DarkModeToggle'

const store: Record<string, string> = {}
const mockStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

let originalLocalStorage: Storage

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  for (const key of Object.keys(store)) delete store[key]
  vi.clearAllMocks()
  // Replace window.localStorage with our mock
  originalLocalStorage = window.localStorage
  Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true, configurable: true })
})

afterEach(() => {
  Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true, configurable: true })
})

describe('DarkModeToggle', () => {
  it('renders a button with accessible label', () => {
    render(<DarkModeToggle />)
    expect(screen.getByRole('button', { name: 'Toggle dark mode' })).toBeInTheDocument()
  })

  it('toggles dark class on documentElement when clicked', async () => {
    const user = userEvent.setup()
    render(<DarkModeToggle />)
    const button = screen.getByRole('button', { name: 'Toggle dark mode' })

    await user.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists preference to localStorage', async () => {
    const user = userEvent.setup()
    render(<DarkModeToggle />)
    const button = screen.getByRole('button', { name: 'Toggle dark mode' })

    await user.click(button)
    expect(store['peace-theme']).toBe('dark')

    await user.click(button)
    expect(store['peace-theme']).toBe('light')
  })

  it('reads initial state from localStorage', () => {
    store['peace-theme'] = 'dark'
    render(<DarkModeToggle />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
