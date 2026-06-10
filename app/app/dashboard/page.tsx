import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { DailyProgressWidget } from '@/components/dashboard/DailyProgressWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DailyNoteWidget } from '@/components/dashboard/DailyNoteWidget'

export default function DashboardPage() {
  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] gap-0 overflow-hidden">
      {/* Left: header + 2x2 grid */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
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

      {/* Right: today's daily note */}
      <div className="w-80 xl:w-96 shrink-0 border-l p-4">
        <DailyNoteWidget />
      </div>
    </div>
  )
}
