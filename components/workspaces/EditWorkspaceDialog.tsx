'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useUpdateWorkspace } from '@/lib/queries/useWorkspace'
import type { Workspace } from '@/types'

interface EditWorkspaceDialogProps {
  workspace: Workspace
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditWorkspaceDialog({ workspace, open, onOpenChange }: EditWorkspaceDialogProps) {
  const updateWorkspace = useUpdateWorkspace()
  const [name, setName] = useState(workspace.name)
  const [identifier, setIdentifier] = useState(workspace.identifier ?? '')
  const [type, setType] = useState<'personal' | 'work'>(workspace.type)

  useEffect(() => {
    if (open) {
      setName(workspace.name)
      setIdentifier(workspace.identifier ?? '')
      setType(workspace.type)
    }
  }, [open, workspace])

  function handleIdentifierChange(value: string) {
    setIdentifier(value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updateWorkspace.mutateAsync({
      id: workspace.id,
      name: name.trim(),
      identifier: identifier || undefined,
      type,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-ws-name">Name</Label>
            <Input
              id="edit-ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-ws-identifier">
              Identifier
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                Task prefix — changing this does not rename existing task keys
              </span>
            </Label>
            <Input
              id="edit-ws-identifier"
              placeholder="MUR"
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              maxLength={3}
              className="w-24 font-mono uppercase"
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || updateWorkspace.isPending}>
              {updateWorkspace.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
