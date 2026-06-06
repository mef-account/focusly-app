'use client'

import { useState } from 'react'
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
import { useCreateTimeEntry } from '@/lib/queries/useTimeEntries'
import { useProjects } from '@/lib/queries/useProjects'
import { parseEstimate } from '@/lib/utils'
import { format } from 'date-fns'
import type { Tag } from '@/types'

interface ManualEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManualEntryDialog({ open, onOpenChange }: ManualEntryDialogProps) {
  const createEntry = useCreateTimeEntry()
  const { data: projects } = useProjects()

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [projectId, setProjectId] = useState<string>('none')
  const [tag, setTag] = useState<Tag>('work')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const minutes = parseEstimate(duration)
    if (!minutes) return

    await createEntry.mutateAsync({
      description: description.trim() || null,
      project_id: projectId === 'none' ? null : projectId,
      tag,
      duration_seconds: minutes * 60,
      date,
      started_at: null,
      stopped_at: null,
    })

    setDescription('')
    setDuration('')
    setProjectId('none')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual time entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="me-desc">Description</Label>
            <Input
              id="me-desc"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="me-date">Date</Label>
              <Input
                id="me-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-dur">Duration</Label>
              <Input
                id="me-dur"
                placeholder="1h 30m"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={(v) => setProjectId(v ?? 'none')}>
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tag</Label>
              <Select value={tag} onValueChange={(v) => v && setTag(v as Tag)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!parseEstimate(duration) || createEntry.isPending}>
              {createEntry.isPending ? 'Saving…' : 'Add entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
