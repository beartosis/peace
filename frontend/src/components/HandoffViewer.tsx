import { useStepHandoff } from '../api/hooks'
import { parseJsonArray } from '../utils'

interface HandoffViewerProps {
  runId: number
  stepNumber: number
}

function renderItem(item: unknown, i: number): React.ReactNode {
  if (typeof item === 'string') return <li key={i}>{item}</li>
  if (item && typeof item === 'object') {
    // Handle {decision: "..."} format
    const obj = item as Record<string, unknown>
    const text = obj.decision ?? obj.risk ?? obj.learning ?? obj.tradeoff ?? obj.followup
    if (typeof text === 'string') return <li key={i}>{text}</li>
    return <li key={i}>{JSON.stringify(item)}</li>
  }
  return <li key={i}>{String(item)}</li>
}

function HandoffSection({ title, json }: { title: string; json: string | null }) {
  const items = parseJsonArray(json)
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
        {items.map((item, i) => renderItem(item, i))}
      </ul>
    </div>
  )
}

export default function HandoffViewer({ runId, stepNumber }: HandoffViewerProps) {
  const { data: handoff, isLoading, error } = useStepHandoff(runId, stepNumber)

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading handoff...</p>
  }

  // 404 means no handoff for this step — just render nothing
  if (error || !handoff) return null

  return (
    <div className="mt-6 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Handoff</h2>
      <HandoffSection title="Key Decisions" json={handoff.key_decisions} />
      <HandoffSection title="Tradeoffs" json={handoff.tradeoffs} />
      <HandoffSection title="Known Risks" json={handoff.known_risks} />
      <HandoffSection title="Learnings" json={handoff.learnings} />
      <HandoffSection title="Follow-ups" json={handoff.followups} />
      {handoff.next_step_number != null && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300">
          Next: Step {handoff.next_step_number}
          {handoff.next_step_title && `: ${handoff.next_step_title}`}
        </div>
      )}
    </div>
  )
}
