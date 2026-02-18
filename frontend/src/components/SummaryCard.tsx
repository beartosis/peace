interface SummaryCardProps {
  label: string
  value: string
  subtitle?: string
}

export default function SummaryCard({ label, value, subtitle }: SummaryCardProps) {
  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </h3>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  )
}
