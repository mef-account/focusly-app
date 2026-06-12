'use client'

import { useState, useEffect } from 'react'
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
import { suggestIdentifier } from '@/lib/utils'

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const createWorkspace = useCreateWorkspace()
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [identifierTouched, setIdentifierTouched] = useState(false)
  const [type, setType] = useState<'personal' | 'work'>('work')

  // Auto-suggest identifier from name until user manually edits it
  useEffect(() => {
    if (!identifierTouched) {
      setIdentifier(suggestIdentifier(name))
    }
  }, [name, identifierTouched])

  function handleIdentifierChange(value: string) {
    setIdentifierTouched(true)
    setIdentifier(value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    await createWorkspace.mutateAsync({
      name: name.trim(),
      identifier: identifier || undefined,
      type,
    })

    setName('')
    setIdentifier('')
    setIdentifierTouched(false)
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
            <Label htmlFor="workspace-identifier">
              Identifier
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                Used as task prefix (e.g. {identifier || 'MUR'}-1)
              </span>
            </Label>
            <Input
              id="workspace-identifier"
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
