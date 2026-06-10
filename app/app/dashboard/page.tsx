import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { DailyProgressWidget } from '@/components/dashboard/DailyProgressWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DailyNoteWidget } from '@/components/dashboard/DailyNoteWidget'

export default function DashboardPage() {
  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-[100px]">
      {/* Header */}
      <div className="py-6">
        <DashboardHeader />
      </div>

      {/* 3 equal columns */}
      <div className="grid flex-1 grid-cols-3 gap-4 overflow-hidden pb-6">
        {/* Col 1: Timer (compact) → Today's Tasks (fills rest) */}
        <div className="flex min-h-0 flex-col gap-4">
          <TimerWidget />
          <div className="min-h-0 flex-1">
            <TodaysTasksWidget />
          </div>
        </div>

        {/* Col 2: Today's Progress (compact) → Tomorrow (fills rest) */}
        <div className="flex min-h-0 flex-col gap-4">
          <DailyProgressWidget />
          <div className="min-h-0 flex-1">
            <UpcomingWidget />
          </div>
        </div>

        {/* Col 3: Daily Note (full height) */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <DailyNoteWidget />
        </div>
      </div>
    </div>
  )
}
