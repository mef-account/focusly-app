'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Layers,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  FileText,
  TableProperties,
  Timer,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const PAGES = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Initiatives', href: '/app/initiatives', icon: Layers },
  { label: 'Projects', href: '/app/projects', icon: FolderKanban },
  { label: 'My Tasks', href: '/app/my-tasks', icon: CheckSquare },
  { label: 'Planner', href: '/app/planner', icon: CalendarDays },
  { label: 'Notes', href: '/app/notes', icon: FileText },
  { label: 'Views', href: '/app/views', icon: TableProperties },
  { label: 'Tracker', href: '/app/tracker', icon: Timer },
  { label: 'Reports', href: '/app/reports', icon: BarChart3 },
  { label: 'Settings', href: '/app/settings', icon: Settings },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()

  const run = (href: string) => {
    router.push(href)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, tasks, notes…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {PAGES.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => run(href)}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => run('/app/projects')}>
            <Plus className="mr-2 h-4 w-4" />
            New project
          </CommandItem>
          <CommandItem onSelect={() => run('/app/my-tasks')}>
            <Plus className="mr-2 h-4 w-4" />
            New task
          </CommandItem>
          <CommandItem onSelect={() => run('/app/notes')}>
            <Plus className="mr-2 h-4 w-4" />
            New note
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
