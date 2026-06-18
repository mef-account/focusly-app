'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  FileText,
  TableProperties,
  Timer,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  SquarePen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useQuickCreateStore } from '@/store/useQuickCreateStore'
import { useCurrentUserRole } from '@/lib/hooks/useCurrentUserRole'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Structure', href: '/app/projects', icon: FolderKanban },
  { label: 'Planner', href: '/app/planner', icon: CalendarDays },
  { label: 'Daily', href: '/app/notes', icon: FileText },
  { label: 'Views', href: '/app/views', icon: TableProperties },
  { label: 'Tracker', href: '/app/tracker', icon: Timer },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebarStore()
  const openQuickCreate = useQuickCreateStore((s) => s.open)
  const role = useCurrentUserRole()
  const isAdmin = role === 'admin'
  const navItems = isAdmin
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.href === '/app/projects')

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
          collapsed ? 'justify-center px-0' : 'justify-between'
        )}
      >
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 shrink-0 text-brand-600" />
          {!collapsed && <span className="text-sm tracking-tight">Focusly</span>}
        </div>
        {isAdmin && (
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <button
                onClick={() => openQuickCreate()}
                className={cn(
                  'flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  collapsed && 'hidden'
                )}
                aria-label="New task"
              >
                <SquarePen className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">New task (C)</TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)

          const item = (
            <div key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
            </div>
          )

          if (collapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger render={<span />}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground',
                      'justify-center px-2'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </Link>
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

