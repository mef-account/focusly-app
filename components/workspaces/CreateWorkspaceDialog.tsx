'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useCreateWorkspace } from '@/lib/queries/useWorkspace'

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const createWorkspace = useCreateWorkspace()
  const [name, setName] = useState('')
  const [type, setType] = useState<'personal' | 'work'>('work')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    await createWorkspace.mutateAsync({ name: name.trim(), type })

    setName('')
    setType('work')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              placeholder="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex gap-2">
              {(['personal', 'work'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                    type === t
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
