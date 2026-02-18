import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import RunList from './RunList'
import DarkModeToggle from './DarkModeToggle'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isLive = location.pathname === '/live'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 lg:hidden">
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <Link to="/" className="ml-3 text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          PEACE
        </Link>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:translate-x-0 lg:shrink-0`}
      >
        <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
          <Link
            to="/"
            className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => setSidebarOpen(false)}
          >
            PEACE
          </Link>
          <Link
            to="/live"
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
              isLive
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-300'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            Live
          </Link>
          <DarkModeToggle />
        </header>
        <nav aria-label="Runs" onClick={() => setSidebarOpen(false)}>
          <RunList />
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 pt-20 lg:pt-6">
        {children}
      </main>
    </div>
  )
}
