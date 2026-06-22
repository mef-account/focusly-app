import { redirect } from 'next/navigation'
import { TimerWidget } from '@/components/dashboard/TimerWidget'
import { DailyProgressWidget } from '@/components/dashboard/DailyProgressWidget'
import { TodaysTasksWidget } from '@/components/dashboard/TodaysTasksWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DailyNoteWidget } from '@/components/dashboard/DailyNoteWidget'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('type')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.type === 'user') {
    redirect('/app/projects')
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-[100px]">
      {/* Header */}
      <div className="py-6">
        <DashboardHeader />
      </div>

      {/*
        3 cols × 2 rows:
          row 1 (auto)  : Timer | Progress | Note (row-span-2)
          row 2 (1fr)   : Tasks | Tomorrow  | ↑
      */}
      <div className="grid flex-1 grid-cols-3 grid-rows-[auto_1fr] gap-4 overflow-hidden pb-[88px]">
        {/* Row 1, Col 1 */}
        <TimerWidget />

        {/* Row 1, Col 2 */}
        <DailyProgressWidget />

        {/* Col 3 — spans both rows */}
        <div className="row-span-2 flex flex-col overflow-hidden">
          <DailyNoteWidget />
        </div>

        {/* Row 2, Col 1 */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <TodaysTasksWidget />
        </div>

        {/* Row 2, Col 2 */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <UpcomingWidget />
        </div>
      </div>
    </div>
  )
}
