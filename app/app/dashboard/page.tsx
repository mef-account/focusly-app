import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { DailyProgressWidget } from '@/components/dashboard/DailyProgressWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { RecentNotesWidget } from '@/components/dashboard/RecentNotesWidget'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardHeader />

      {/* Timer — full width */}
      <TimerWidget />

      {/* Daily Progress — full width */}
      <DailyProgressWidget />

      {/* Main grid: 2 columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TodaysTasksWidget />
        <UpcomingWidget />
      </div>

      {/* Bottom grid: notes + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentNotesWidget />
        <ActivityFeed />
      </div>
    </div>
  )
}
