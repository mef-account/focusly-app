'use client'

import { UserPlus, Check, ChevronDown, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useProfiles } from '@/lib/queries/useProfiles'
import { getInitials, cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface AssigneePickerProps {
  value: string | null
  assignee?: Profile | null
  onChange?: (assigneeId: string | null) => void
  variant?: 'compact' | 'full'
  /** Prevents the click from bubbling to a parent (e.g. board card / table row). */
  stopPropagation?: boolean
  className?: string
}

function AssigneeAvatar({ profile, size = 'sm' }: { profile: Profile; size?: 'sm' | 'default' }) {
  return (
    <Avatar size={size} className={size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'}>
      {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.name ?? ''} />}
      <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
        {getInitials(profile.name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function AssigneePicker({
  value,
  assignee,
  onChange,
  variant = 'compact',
  stopPropagation,
  className,
}: AssigneePickerProps) {
  const { data: profiles = [] } = useProfiles()
  // Resolve from the loaded profiles first (source of truth as `value` changes);
  // fall back to the passed-in `assignee` only until profiles have loaded.
  const current = value ? profiles.find((p) => p.id === value) ?? assignee ?? null : null

  const stop = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            onClick={stop}
            title={current?.name ?? 'Assign'}
            className={cn(
              'flex items-center rounded-md transition-colors hover:bg-accent',
              variant === 'full' ? 'gap-1.5 px-2 py-1 text-sm' : 'p-0.5',
              className
            )}
          />
        }
      >
        {current ? (
          <AssigneeAvatar profile={current} size={variant === 'full' ? 'default' : 'sm'} />
        ) : (
          <span
            className={cn(
              'flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground',
              variant === 'full' ? 'h-6 w-6' : 'h-5 w-5'
            )}
          >
            <UserPlus className={variant === 'full' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
          </span>
        )}
        {variant === 'full' && (
          <>
            <span className={cn(current ? 'text-foreground' : 'text-muted-foreground')}>
              {current?.name ?? 'Unassigned'}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48" onClick={stop}>
        {profiles.map((p) => (
          <DropdownMenuItem key={p.id} onClick={(e) => { stop(e); onChange?.(p.id) }}>
            <AssigneeAvatar profile={p} />
            <span className="truncate">{p.name ?? 'Unnamed'}</span>
            {value === p.id && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
        {value && (
          <DropdownMenuItem onClick={(e) => { stop(e); onChange?.(null) }}>
            <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </span>
            <span className="text-muted-foreground">Unassign</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
