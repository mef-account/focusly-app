'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { TimerTicker } from '@/components/tracker/TimerTicker'
import { NotePanel } from '@/components/notes/NotePanel'
import { TaskSheet } from '@/components/tasks/TaskSheet'
import { QuickCreateTaskDialog } from '@/components/tasks/QuickCreateTaskDialog'
import { useQuickCreateStore } from '@/store/useQuickCreateStore'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const openQuickCreate = useQuickCreateStore((s) => s.open)
  const isQuickCreateOpen = useQuickCreateStore((s) => s.isOpen)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
        return
      }

      if (e.key === 'c' && !inInput && !isQuickCreateOpen) {
        e.preventDefault()
        openQuickCreate()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [openQuickCreate, isQuickCreateOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <TimerTicker />
      <NotePanel />
      <TaskSheet />
      <QuickCreateTaskDialog />
    </div>
  )
}
