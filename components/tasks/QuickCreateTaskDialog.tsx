'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Clock, FolderKanban, CalendarIcon, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { useCreateTask } from '@/lib/queries/useTasks'
import { useProjects } from '@/lib/queries/useProjects'
import { useQuickCreateStore } from '@/store/useQuickCreateStore'
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  parseEstimate,
  formatMinutes,
  cn,
} from '@/lib/utils'
import type { TaskStatus, TaskPriority } from '@/types'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

export function QuickCreateTaskDialog() {
  const { isOpen, close } = useQuickCreateStore()
  const createTask = useCreateTask()
  const { data: projects = [] } = useProjects()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('backlog')
  const [priority, setPriority] = useState<TaskPriority>('none')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [estimateInput, setEstimateInput] = useState('')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [dueDateOpen, setDueDateOpen] = useState(false)
  const [createMore, setCreateMore] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  // No auto-select — "No project" is the default  // Focus title on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [isOpen])

  function reset() {
    setTitle('')
    setDescription('')
    setStatus('backlog')
    setPriority('none')
    setAssigneeId(null)
    setEstimateInput('')
    setDueDate(null)
    setProjectId(null)
  }

  async function handleCreate() {
    if (!title.trim()) return
    const estimateMinutes = estimateInput ? parseEstimate(estimateInput) : null
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      project_id: projectId,
      assignee_id: assigneeId,
      estimate_minutes: estimateMinutes,
      parent_task_id: null,
      created_by: null,
      start_date: null,
      due_date: dueDate,
      scheduled_start: null,
    })
    if (createMore) {
      reset()
      titleRef.current?.focus()
    } else {
      reset()
      close()
    }
  }

  const selectedProject = projects.find((p) => p.id === projectId)
  const estimateMinutes = estimateInput ? parseEstimate(estimateInput) : null

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Title */}
        <div className="px-5 pt-5">
          <input
            ref={titleRef}
            className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleCreate()
              }
              if (e.key === 'Escape') close()
            }}
          />
        </div>

        {/* Description */}
        <div className="px-5 pb-4 pt-3">
          <textarea
            className="w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Add description..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Separator />

        {/* Bottom toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs hover:bg-accent transition-colors" />
            }>
              <Badge className={cn('text-[10px] px-1.5 py-0', STATUS_CLASSES[status])}>
                {STATUS_LABELS[status]}
              </Badge>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatus(s)}>
                  <Badge className={cn('text-xs', STATUS_CLASSES[s])}>{STATUS_LABELS[s]}</Badge>
                  {status === s && <Check className="ml-auto h-3 w-3" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs hover:bg-accent transition-colors" />
            }>
              <Badge className={cn('text-[10px] px-1.5 py-0', PRIORITY_CLASSES[priority])}>
                {PRIORITY_LABELS[priority]}
              </Badge>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PRIORITIES.map((p) => (
                <DropdownMenuItem key={p} onClick={() => setPriority(p)}>
                  <Badge className={cn('text-xs', PRIORITY_CLASSES[p])}>{PRIORITY_LABELS[p]}</Badge>
                  {priority === p && <Check className="ml-auto h-3 w-3" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignee */}
          <AssigneePicker
            value={assigneeId}
            assignee={null}
            onChange={setAssigneeId}
            variant="compact"
          />

          {/* Project */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-accent transition-colors" />
            }>
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
              {selectedProject ? (
                <span className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                  <span className="max-w-[100px] truncate text-xs">{selectedProject.name}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Project</span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setProjectId(null)}>
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">No project</span>
                {!projectId && <Check className="ml-auto h-3.5 w-3.5" />}
              </DropdownMenuItem>
              {projects.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setProjectId(p.id)}>
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate">{p.name}</span>
                  {projectId === p.id && <Check className="ml-auto h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Estimate */}
          <div className="flex items-center gap-1 rounded-md border border-input px-1.5 py-0.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <input
              className="w-14 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              placeholder="Estimate"
              value={estimateInput}
              onChange={(e) => setEstimateInput(e.target.value)}
            />
            {estimateMinutes !== null && (
              <span className="text-[10px] text-muted-foreground">{formatMinutes(estimateMinutes)}</span>
            )}
          </div>

          {/* Due date */}
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger
              render={
                <button className="flex items-center gap-1 rounded-md border border-input px-1.5 py-0.5 text-xs hover:bg-accent transition-colors" />
              }
            >
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <span className={cn(dueDate ? 'text-foreground' : 'text-muted-foreground')}>
                {dueDate ? format(parseISO(dueDate), 'MMM d') : 'Due date'}
              </span>
              {dueDate && (
                <span
                  role="button"
                  tabIndex={0}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); setDueDate(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setDueDate(null) } }}
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate ? parseISO(dueDate) : undefined}
                onSelect={(d) => {
                  setDueDate(d ? format(d, 'yyyy-MM-dd') : null)
                  setDueDateOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <div
              onClick={() => setCreateMore((v) => !v)}
              className={cn(
                'relative inline-flex h-4 w-7 items-center rounded-full border-2 border-transparent transition-colors',
                createMore ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-3 w-3 rounded-full bg-white shadow transition-transform',
                  createMore ? 'translate-x-3' : 'translate-x-0'
                )}
              />
            </div>
            Create more
          </label>
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={!title.trim() || createTask.isPending}
            onClick={handleCreate}
          >
            {createTask.isPending ? 'Creating…' : 'Create task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
