'use client'

import { format } from 'date-fns'

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHeader() {
  const now = new Date()
  const greeting = getGreeting(now.getHours())
  const today = format(now, 'EEEE, MMMM d')

  return (
    <div>
      <h2 className="text-2xl font-bold" suppressHydrationWarning>
        {greeting} 👋
      </h2>
      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
        {today}
      </p>
    </div>
  )
}
