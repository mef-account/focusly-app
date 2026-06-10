import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { DailyProgressWidget } from '@/components/dashboard/DailyProgressWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DailyNoteWidget } from '@/components/dashboard/DailyNoteWidget'

export default function DashboardPage() {
  return (
    <div className="-my-6 flex h-[calc(100vh-3.5rem)] gap-6 overflow-hidden">
      {/* Left: header + 2x2 grid */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto py-6">
        <DashboardHeader />

        <div className="grid gap-4 lg:grid-cols-2">
          <TimerWidget />
          <DailyProgressWidget />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TodaysTasksWidget />
          <UpcomingWidget />
        </div>
      </div>

      {/* Right: today's daily note — starts at same level as left content */}
      <div className="w-[26rem] xl:w-[32rem] shrink-0 border-l pt-6">
        <DailyNoteWidget />
      </div>
    </div>
  )
}
