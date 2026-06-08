'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useDeleteProject } from '@/lib/queries/useProjects'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

const supabase = createClient()

interface DeleteProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteProjectDialog({ project, open, onOpenChange }: DeleteProjectDialogProps) {
  const deleteProject = useDeleteProject()
  const [confirm, setConfirm] = useState('')
  const [taskCount, setTaskCount] = useState<number | null>(null)

  useEffect(() => {
    if (!open) { setConfirm(''); return }
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .then(({ count }) => setTaskCount(count ?? 0))
  }, [open, project.id])

  async function handleDelete() {
    if (confirm !== project.name) return
    await deleteProject.mutateAsync(project.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Delete project
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="font-medium">This action is permanent and cannot be undone.</p>
            {taskCount !== null && (
              <p className="mt-1 text-destructive/80">
                Deleting <span className="font-semibold">{project.name}</span> will also permanently delete{' '}
                <span className="font-semibold">{taskCount}</span> task{taskCount !== 1 ? 's' : ''} and all related data.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delete-proj-confirm">
              Type <span className="font-semibold">{project.name}</span> to confirm
            </Label>
            <Input
              id="delete-proj-confirm"
              placeholder={project.name}
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
            disabled={confirm !== project.name || deleteProject.isPending}
            onClick={handleDelete}
          >
            {deleteProject.isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
