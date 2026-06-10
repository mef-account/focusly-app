import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { DailyProgressWidget } from '@/components/dashboard/DailyProgressWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardHeader />

      <div className="grid gap-4 lg:grid-cols-2">
        <TimerWidget />
        <DailyProgressWidget />
      </div>

      {/* Main grid: 2 columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TodaysTasksWidget />
        <UpcomingWidget />
      </div>
    </div>
  )
}
