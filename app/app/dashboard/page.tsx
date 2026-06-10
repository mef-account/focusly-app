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
        {/* Col 1: Timer + Today's Tasks */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <TimerWidget />
          <TodaysTasksWidget />
        </div>

        {/* Col 2: Today's Progress + Tomorrow */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <DailyProgressWidget />
          <UpcomingWidget />
        </div>

        {/* Col 3: Daily Note */}
        <div className="flex flex-col overflow-hidden">
          <DailyNoteWidget />
        </div>
      </div>
    </div>
  )
}
