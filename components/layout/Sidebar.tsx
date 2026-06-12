'use client'

import { useEffect } from 'react'
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
  Check,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useQuickCreateStore } from '@/store/useQuickCreateStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()

  // Auto-select first workspace if none stored yet
  useEffect(() => {
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [activeWorkspaceId, workspaces, setActiveWorkspace])

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0]

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
        <Tooltip>
          <TooltipTrigger render={<span />}>
            <button
              onClick={openQuickCreate}
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
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
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

        {workspaces.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-brand-100 text-brand-800 text-xs">
                    {activeWorkspace?.name?.[0]?.toUpperCase() ?? 'W'}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {activeWorkspace?.name ?? 'Workspace'}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws.id)}
                  className="gap-2"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {activeWorkspaceId === ws.id && <Check className="h-3 w-3 shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2',
              collapsed && 'justify-center px-2'
            )}
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-brand-100 text-brand-800 text-xs">
                {activeWorkspace?.name?.[0]?.toUpperCase() ?? 'W'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="truncate text-xs text-muted-foreground">
                {activeWorkspace?.name ?? 'Workspace'}
              </span>
            )}
          </div>
        )}
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

