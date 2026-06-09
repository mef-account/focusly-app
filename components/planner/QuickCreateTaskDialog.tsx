'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTask } from '@/lib/queries/useTasks'
import { useProjects } from '@/lib/queries/useProjects'
import { parseEstimate } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

interface QuickCreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** YYYY-MM-DD date string to prefill due_date. */
  dueDate: string | null
}

export function QuickCreateTaskDialog({ open, onOpenChange, dueDate }: QuickCreateTaskDialogProps) {
  const createTask = useCreateTask()
  const { data: projects = [] } = useProjects()

  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [estimate, setEstimate] = useState('')

  useEffect(() => {
    if (open && !projectId && projects.length) setProjectId(projects[0].id)
  }, [open, projects, projectId])

  const when = dueDate ? format(parseISO(dueDate), 'EEE, MMM d') : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    await createTask.mutateAsync({
      title: title.trim(),
      project_id: projectId,
      status: 'todo',
      priority: 'none',
      description: null,
      parent_task_id: null,
      assignee_id: null,
      created_by: null,
      start_date: null,
      due_date: dueDate,
      scheduled_start: null,
      estimate_minutes: parseEstimate(estimate) ?? null,
    })

    setTitle('')
    setEstimate('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task{when ? ` · ${when}` : ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qc-title">Title</Label>
            <Input
              id="qc-title"
              placeholder="What needs doing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId ?? 'none'} onValueChange={(v) => setProjectId(v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-est">Estimate</Label>
              <Input
                id="qc-est"
                placeholder="1h 30m"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createTask.isPending}>
              {createTask.isPending ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
