import { useState, useEffect } from 'react'

function getInitialDark(): boolean {
  try {
    const stored = window.localStorage.getItem('peace-theme')
    if (stored === 'dark') return true
    if (stored === 'light') return false
  } catch {
    // localStorage may not be available
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

export default function DarkModeToggle() {
  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      window.localStorage.setItem('peace-theme', dark ? 'dark' : 'light')
    } catch {
      // localStorage may not be available
    }
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark(d => !d)}
      aria-label="Toggle dark mode"
      className="ml-auto text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
    >
      {dark ? '\u2600' : '\u263D'}
    </button>
  )
}
