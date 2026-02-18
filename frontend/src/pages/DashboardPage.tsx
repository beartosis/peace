import SummaryCards from '../components/SummaryCards'
import DurationTrendChart from '../components/DurationTrendChart'
import StateDurationChart from '../components/StateDurationChart'
import FailureDonutChart from '../components/FailureDonutChart'
import RecentFailuresTable from '../components/RecentFailuresTable'

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h2>

      <SummaryCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DurationTrendChart />
        <StateDurationChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <FailureDonutChart />
        <RecentFailuresTable />
      </div>
    </div>
  )
}
