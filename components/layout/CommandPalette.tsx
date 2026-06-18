'use client'

import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
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
import { useCurrentUserRole } from '@/lib/hooks/useCurrentUserRole'

const PAGES = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Structure', href: '/app/projects', icon: FolderKanban },
  { label: 'My Tasks', href: '/app/my-tasks', icon: CheckSquare },
  { label: 'Planner', href: '/app/planner', icon: CalendarDays },
  { label: 'Daily', href: '/app/notes', icon: FileText },
  { label: 'Views', href: '/app/views', icon: TableProperties },
  { label: 'Tracker', href: '/app/tracker', icon: Timer },
  { label: 'Reports', href: '/app/reports', icon: BarChart3 },
  { label: 'Settings', href: '/app/settings', icon: Settings },
]

const QUICK_ACTIONS = [
  { label: 'New project', href: '/app/projects', icon: Plus },
  { label: 'New task', href: '/app/my-tasks', icon: Plus },
  { label: 'Open daily note', href: '/app/notes', icon: Plus },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const role = useCurrentUserRole()
  const isAdmin = role === 'admin'
  const pages = isAdmin
    ? PAGES
    : PAGES.filter((page) => page.href === '/app/projects' || page.href === '/app/settings')

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
          {pages.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => run(href)}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
                <CommandItem key={label} onSelect={() => run(href)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
