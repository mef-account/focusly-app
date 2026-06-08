'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useDeleteWorkspace } from '@/lib/queries/useWorkspace'
import { createClient } from '@/lib/supabase/client'
import type { Workspace } from '@/types'

const supabase = createClient()

interface DeleteWorkspaceDialogProps {
  workspace: Workspace
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWorkspaceDialog({ workspace, open, onOpenChange }: DeleteWorkspaceDialogProps) {
  const deleteWorkspace = useDeleteWorkspace()
  const [confirm, setConfirm] = useState('')
  const [counts, setCounts] = useState<{ portfolios: number; projects: number } | null>(null)

  useEffect(() => {
    if (!open) { setConfirm(''); return }

    async function loadCounts() {
      const [portRes, projRes] = await Promise.all([
        supabase.from('portfolios').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      ])
      setCounts({
        portfolios: portRes.count ?? 0,
        projects: projRes.count ?? 0,
      })
    }

    loadCounts()
  }, [open, workspace.id])

  async function handleDelete() {
    if (confirm !== workspace.name) return
    await deleteWorkspace.mutateAsync(workspace.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Delete workspace
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="font-medium">This action is permanent and cannot be undone.</p>
            {counts && (
              <>
                <p className="mt-1 text-destructive/80">
                  Deleting <span className="font-semibold">{workspace.name}</span> will also permanently delete:
                </p>
                <ul className="mt-1.5 space-y-0.5 text-destructive/80">
                  <li>· <span className="font-semibold">{counts.portfolios}</span> portfolio{counts.portfolios !== 1 ? 's' : ''}</li>
                  <li>· <span className="font-semibold">{counts.projects}</span> project{counts.projects !== 1 ? 's' : ''} and all their tasks</li>
                </ul>
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delete-ws-confirm">
              Type <span className="font-semibold">{workspace.name}</span> to confirm
            </Label>
            <Input
              id="delete-ws-confirm"
              placeholder={workspace.name}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={confirm !== workspace.name || deleteWorkspace.isPending}
            onClick={handleDelete}
          >
            {deleteWorkspace.isPending ? 'Deleting…' : 'Delete workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
