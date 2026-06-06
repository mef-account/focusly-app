import { format } from 'date-fns'
import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { RecentNotesWidget } from '@/components/dashboard/RecentNotesWidget'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const today = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{getGreeting()} 👋</h2>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Timer — full width */}
      <TimerWidget />

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
