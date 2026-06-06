'use client'

import { useEffect } from 'react'
import { Activity } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRecentActivity } from '@/lib/queries/useActivity'
import { getInitials, formatDate } from '@/lib/utils'

const ACTION_LABELS: Record<string, string> = {
  status_changed: 'changed status of',
  comment_added: 'commented on',
  task_created: 'created',
  task_assigned: 'was assigned',
  priority_changed: 'changed priority of',
}

export function ActivityFeed() {
  const { data: activity, isLoading } = useRecentActivity(15)
  const queryClient = useQueryClient()

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('task_activity_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_activity' },
        () => queryClient.invalidateQueries({ queryKey: ['activity'] })
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Activity</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : !activity?.length ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No activity yet
        </p>
      ) : (
        <div className="space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {getInitials(item.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">
                    {item.user?.name ?? 'Someone'}
                  </span>{' '}
                  {ACTION_LABELS[item.action] ?? item.action}{' '}
                  <span className="font-medium text-foreground">
                    {(item as any).task?.title ?? 'a task'}
                  </span>
                  {item.new_value && (
                    <span className="ml-1 text-muted-foreground">
                      → {item.new_value}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDate(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
