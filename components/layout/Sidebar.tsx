'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/store/useSidebarStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Initiatives', href: '/app/initiatives', icon: Layers },
  { label: 'Projects', href: '/app/projects', icon: FolderKanban },
  { label: 'My Tasks', href: '/app/my-tasks', icon: CheckSquare },
  { label: 'Planner', href: '/app/planner', icon: CalendarDays },
  { label: 'Notes', href: '/app/notes', icon: FileText },
  { label: 'Views', href: '/app/views', icon: TableProperties },
  { label: 'Tracker', href: '/app/tracker', icon: Timer },
  { label: 'Reports', href: '/app/reports', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebarStore()

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center gap-2 px-4 font-bold text-primary',
          collapsed && 'justify-center px-0'
        )}
      >
        <Zap className="h-5 w-5 shrink-0 text-brand-600" />
        {!collapsed && <span className="text-sm tracking-tight">Focusly</span>}
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          const item = (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          )

          if (collapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger render={<span />}>
                  {item}
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            )
          }

          return item
        })}
      </nav>

      <Separator />

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 p-2">
        <Tooltip>
          <TooltipTrigger render={<span />}>
            <Link
              href="/app/settings"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && 'Settings'}
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Settings</TooltipContent>}
        </Tooltip>

        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2',
            collapsed && 'justify-center px-2'
          )}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-brand-100 text-brand-800 text-xs">
              U
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="truncate text-xs text-muted-foreground">
              My Workspace
            </span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-accent"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  )
}
