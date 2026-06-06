'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Clock, ChevronDown, X, Plus, Check, FileText, Maximize2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
import { useUpdateTask } from '@/lib/queries/useTasks'
import { useTimeTotalsByTask } from '@/lib/queries/useTimeEntries'
import { useNotesByTask, useCreateNote } from '@/lib/queries/useNotes'
import { useNotePanelStore } from '@/store/useNotePanelStore'
import { TaskTimerButton } from '@/components/tracker/TaskTimerButton'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { createClient } from '@/lib/supabase/client'
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  formatMinutes,
  formatDuration,
  formatDate,
  parseEstimate,
  cn,
} from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority, Comment } from '@/types'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

const supabase = createClient()

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPicker({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent transition-colors" />}>
        <Badge className={cn('text-xs', STATUS_CLASSES[value])}>{STATUS_LABELS[value]}</Badge>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {STATUSES.map((s) => (
          <DropdownMenuItem key={s} onClick={() => onChange(s)}>
            <Badge className={cn('text-xs', STATUS_CLASSES[s])}>{STATUS_LABELS[s]}</Badge>
            {value === s && <Check className="ml-auto h-3 w-3" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PriorityPicker({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent transition-colors" />}>
        <Badge className={cn('text-xs', PRIORITY_CLASSES[value])}>{PRIORITY_LABELS[value]}</Badge>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {PRIORITIES.map((p) => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)}>
            <Badge className={cn('text-xs', PRIORITY_CLASSES[p])}>{PRIORITY_LABELS[p]}</Badge>
            {value === p && <Check className="ml-auto h-3 w-3" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent transition-colors" />}>
        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(value ? 'text-foreground' : 'text-muted-foreground')}>
          {value ? format(parseISO(value), 'MMM d, yyyy') : label}
        </span>
        {value && (
          <button
            className="ml-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange(d ? format(d, 'yyyy-MM-dd') : null)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function SubtaskRow({
  task,
  onToggle,
}: {
  task: Task
  onToggle: (id: string, done: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <button onClick={() => onToggle(task.id, task.status !== 'done')}>
        {task.status === 'done' ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <div className="h-4 w-4 rounded border border-input" />
        )}
      </button>
      <span className={cn('text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>
        {task.title}
      </span>
    </div>
  )
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export function TaskSheet() {
  const { activeTaskId, close } = useTaskPanelStore()
  const updateTask = useUpdateTask()

  const [task, setTask] = useState<Task | null>(null)
  const { data: timeTotals = {} } = useTimeTotalsByTask(task ? [task.id] : [])
  const loggedSeconds = task ? timeTotals[task.id] ?? 0 : 0

  const { data: taskNotes = [] } = useNotesByTask(task?.id)
  const createNote = useCreateNote()
  const openNote = useNotePanelStore((s) => s.openNote)

  async function handleNewNote() {
    if (!task) return
    const note = await createNote.mutateAsync({
      task_id: task.id,
      title: task.title,
      content: '',
      tag: 'work',
    })
    openNote(note.id)
  }
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [estimateInput, setEstimateInput] = useState('')
  const [titleEdit, setTitleEdit] = useState('')

  useEffect(() => {
    if (!activeTaskId) { setTask(null); return }

    supabase
      .from('tasks')
      .select('*, project:projects(id,name,color), assignee:profiles!assignee_id(id,name,avatar_url), labels(id,name,color)')
      .eq('id', activeTaskId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTask(data as Task)
          setTitleEdit(data.title)
          setEstimateInput(data.estimate_minutes ? formatMinutes(data.estimate_minutes) : '')
        }
      })

    supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', activeTaskId)
      .then(({ data }) => setSubtasks((data as Task[]) ?? []))

    supabase
      .from('comments')
      .select('*, author:profiles(id,name,avatar_url)')
      .eq('task_id', activeTaskId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments((data as Comment[]) ?? []))
  }, [activeTaskId])

  function patch(updates: Partial<Task>) {
    if (!task) return
    const next = { ...task, ...updates }
    setTask(next)
    updateTask.mutate({ id: task.id, ...updates })
  }

  async function addSubtask() {
    if (!newSubtask.trim() || !task) return
    const { data } = await supabase
      .from('tasks')
      .insert({ title: newSubtask.trim(), project_id: task.project_id, parent_task_id: task.id, status: 'todo', priority: 'none' })
      .select()
      .single()
    if (data) setSubtasks((prev) => [...prev, data as Task])
    setNewSubtask('')
  }

  async function toggleSubtask(id: string, done: boolean) {
    await supabase.from('tasks').update({ status: done ? 'done' : 'todo' }).eq('id', id)
    setSubtasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: done ? 'done' : 'todo' } : t))
    )
  }

  async function addComment() {
    if (!newComment.trim() || !task) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('comments')
      .insert({ task_id: task.id, author_id: user!.id, body: newComment.trim() })
      .select('*, author:profiles(id,name,avatar_url)')
      .single()
    if (data) setComments((prev) => [...prev, data as Comment])
    setNewComment('')
  }

  if (!task) return null

  return (
    <Sheet open={!!activeTaskId} onOpenChange={(o) => !o && close()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-4">
          <input
            className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
            value={titleEdit}
            onChange={(e) => setTitleEdit(e.target.value)}
            onBlur={() => { if (titleEdit !== task.title) patch({ title: titleEdit }) }}
          />
        </SheetHeader>

        <div className="flex flex-col gap-0 overflow-y-auto">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1 border-b px-4 py-3">
            <StatusPicker value={task.status} onChange={(v) => patch({ status: v })} />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <PriorityPicker value={task.priority} onChange={(v) => patch({ priority: v })} />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <AssigneePicker
              value={task.assignee_id}
              assignee={task.assignee}
              variant="full"
              onChange={(id) => patch({ assignee_id: id })}
            />
            <div className="ml-auto">
              <TaskTimerButton
                task={{ id: task.id, title: task.title, project_id: task.project_id }}
                variant="full"
              />
            </div>
          </div>

          {/* Dates + estimate */}
          <div className="flex flex-wrap items-center gap-1 border-b px-4 py-3">
            <DatePicker
              label="Start date"
              value={task.start_date ?? null}
              onChange={(v) => patch({ start_date: v ?? undefined })}
            />
            <span className="text-muted-foreground">→</span>
            <DatePicker
              label="Due date"
              value={task.due_date ?? null}
              onChange={(v) => patch({ due_date: v ?? undefined })}
            />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <div className="flex items-center gap-1.5 rounded-md px-2 py-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-20 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Estimate"
                value={estimateInput}
                onChange={(e) => setEstimateInput(e.target.value)}
                onBlur={() => {
                  const mins = parseEstimate(estimateInput)
                  if (mins !== null) patch({ estimate_minutes: mins })
                }}
              />
            </div>
            {loggedSeconds > 0 && (
              <>
                <Separator orientation="vertical" className="mx-1 h-5" />
                <div className="flex items-center gap-1.5 rounded-md px-2 py-1" title="Total time logged">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm tabular-nums">{formatDuration(loggedSeconds)} logged</span>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          <div className="border-b px-4 py-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <Textarea
              placeholder="Add a description…"
              className="min-h-[120px] resize-none border-0 p-0 shadow-none focus-visible:ring-0"
              value={task.description ?? ''}
              onChange={(e) => setTask({ ...task, description: e.target.value })}
              onBlur={() => patch({ description: task.description })}
            />
          </div>

          {/* Notes */}
          <div className="border-b px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notes ({taskNotes.length})
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={handleNewNote}
                disabled={createNote.isPending}
              >
                <Plus className="h-3.5 w-3.5" /> New note
              </Button>
            </div>
            {taskNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-0.5">
                {taskNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => openNote(note.id)}
                    className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{note.title || 'Untitled'}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(note.updated_at)}</span>
                    <button
                      title="Open full screen"
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); openNote(note.id, true) }}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div className="border-b px-4 py-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Subtasks ({subtasks.length})
            </p>
            <div className="space-y-0.5">
              {subtasks.map((st) => (
                <SubtaskRow key={st.id} task={st} onToggle={toggleSubtask} />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Add subtask…"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
              />
            </div>
          </div>

          {/* Comments */}
          <div className="px-4 py-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Comments ({comments.length})
            </p>
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                    {(c.author as any)?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs font-medium">{(c.author as any)?.name ?? 'Unknown'}</p>
                    <p className="mt-0.5 text-sm">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="Add a comment… (Enter to send)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment()
                }}
              />
              <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
