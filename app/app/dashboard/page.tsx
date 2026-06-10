import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { DailyProgressWidget } from '@/components/dashboard/DailyProgressWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DailyNoteWidget } from '@/components/dashboard/DailyNoteWidget'

export default function DashboardPage() {
  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-10">
      {/* Header — full width above the widget area */}
      <div className="py-6">
        <DashboardHeader />
      </div>

      {/* Widget row + note panel — side by side, same top level */}
      <div className="flex flex-1 gap-6 overflow-hidden pb-6">
        {/* Left: 2x2 grid */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div className="grid gap-4 lg:grid-cols-2">
            <TimerWidget />
            <DailyProgressWidget />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TodaysTasksWidget />
            <UpcomingWidget />
          </div>
        </div>

        {/* Right: daily note — same top as widgets, full rounded card */}
        <div className="w-[26rem] xl:w-[32rem] shrink-0">
          <DailyNoteWidget />
        </div>
      </div>
    </div>
  )
}
