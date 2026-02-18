import { useState } from 'react'
import { formatDuration } from '../utils'

interface DispatchViewerProps {
  skill: string
  durationSecs: number | null
  content: string | null
}

export default function DispatchViewer({ skill, durationSecs, content }: DispatchViewerProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mt-2">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {skill}
          {durationSecs != null && (
            <span className="ml-2 text-gray-400">({formatDuration(durationSecs)})</span>
          )}
        </span>
        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-2">
          {content ? (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
              <code>{content}</code>
            </pre>
          ) : (
            <p className="text-xs text-gray-400 italic px-2 py-1">Dispatch content not available.</p>
          )}
        </div>
      )}
    </div>
  )
}
