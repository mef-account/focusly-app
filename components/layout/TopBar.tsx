'use client'

import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const ROUTE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/projects': 'Structure',
  '/app/my-tasks': 'My Tasks',
  '/app/planner': 'Planner',
  '/app/notes': 'Notes',
  '/app/views': 'Views',
  '/app/tracker': 'Tracker',
  '/app/reports': 'Reports',
  '/app/settings': 'Settings',
}

function getTitle(pathname: string): string {
  for (const [route, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname.startsWith(route)) return title
  }
  return 'Focusly'
}

interface TopBarProps {
  onOpenPalette?: () => void
}

export function TopBar({ onOpenPalette }: TopBarProps) {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-muted-foreground"
          onClick={onOpenPalette}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden text-xs sm:inline">Search</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
            ⌘K
          </kbd>
        </Button>
      </div>
    </header>
  )
}
