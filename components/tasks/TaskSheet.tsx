'use client'

import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  CalendarIcon,
  Clock,
  ChevronDown,
  X,
  Plus,
  Check,
  FileText,
  Maximize2,
  Trash2,
  Circle,
  UserCircle2,
  Timer,
  Building2,
  LayoutGrid,
  FolderKanban,
  Paperclip,
  Download,
  Loader2,
} from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
import { useUpdateTask, useDeleteTask } from '@/lib/queries/useTasks'
import { useTimeTotalsByTask } from '@/lib/queries/useTimeEntries'
import { useNotesByTask, useCreateNote } from '@/lib/queries/useNotes'
import { useAttachmentsByTask, useUploadAttachment, useDeleteAttachment, getSignedDownloadUrl } from '@/lib/queries/useAttachments'
import { useNotePanelStore } from '@/store/useNotePanelStore'
import { useProjects } from '@/lib/queries/useProjects'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import { TaskTimerButton } from '@/components/tracker/TaskTimerButton'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { createClient } from '@/lib/supabase/client'
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  formatMinutes,
  formatDuration,
  formatDate,
  parseEstimate,
  getTaskKey,
  cn,
} from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority, Comment } from '@/types'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

const supabase = createClient()

// ─── Status dot ───────────────────────────────────────────────────────────────

const STATUS_DOT: Record<TaskStatus, string> = {
  backlog: 'bg-slate-400',
  todo: 'bg-blue-400',
  in_progress: 'bg-yellow-400',
  done: 'bg-green-500',
  cancelled: 'bg-red-400',
}

// ─── Priority colors (no dots) ────────────────────────────────────────────────

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
  none: 'bg-muted-foreground/30',
}

const PICKER_BTN = 'flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent/60 transition-colors'

// ─── Property row ─────────────────────────────────────────────────────────────

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-h-[2rem]">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// ─── Status picker ────────────────────────────────────────────────────────────

function StatusPicker({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className={PICKER_BTN} />}>
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', STATUS_DOT[value])} />
        <span className="font-medium">{STATUS_LABELS[value]}</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {STATUSES.map((s) => (
          <DropdownMenuItem key={s} onClick={() => onChange(s)} className="gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', STATUS_DOT[s])} />
            {STATUS_LABELS[s]}
            {value === s && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Priority picker ──────────────────────────────────────────────────────────

function PriorityPicker({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className={PICKER_BTN} />}>
        <span className={cn('h-2.5 w-2.5 rounded-sm shrink-0', PRIORITY_COLOR[value])} />
        <span className={cn('font-medium', value === 'none' ? 'text-muted-foreground' : '')}>
          {PRIORITY_LABELS[value]}
        </span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {PRIORITIES.map((p) => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)} className="gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-sm shrink-0', PRIORITY_COLOR[p])} />
            {PRIORITY_LABELS[p]}
            {value === p && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Date picker ──────────────────────────────────────────────────────────────

function DatePicker({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button className={PICKER_BTN} />}>
        <span className={cn('font-medium', value ? 'text-foreground' : 'text-muted-foreground')}>
          {value ? format(parseISO(value), 'MMM d, yyyy') : label}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(null) } }}
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => { onChange(d ? format(d, 'yyyy-MM-dd') : null); setOpen(false) }}
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── Sub-task row ─────────────────────────────────────────────────────────────

function SubtaskRow({ task, onToggle }: { task: Task; onToggle: (id: string, done: boolean) => void }) {
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

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
}

// ─── Big box ──────────────────────────────────────────────────────────────────

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="px-4 py-3 space-y-1">
        {children}
      </div>
    </div>
  )
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export function TaskSheet() {
  const { activeTaskId, close } = useTaskPanelStore()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const { data: allProjects = [] } = useProjects()
  const { data: workspaces = [] } = useWorkspaces()
  const { data: portfolios = [] } = usePortfolios()

  const [task, setTask] = useState<Task | null>(null)
  const { data: timeTotals = {} } = useTimeTotalsByTask(task ? [task.id] : [])
  const loggedSeconds = task ? timeTotals[task.id] ?? 0 : 0

  const { data: taskNotes = [] } = useNotesByTask(task?.id)
  const createNote = useCreateNote()
  const openNote = useNotePanelStore((s) => s.openNote)

  const { data: attachments = [] } = useAttachmentsByTask(task?.id)
  const uploadAttachment = useUploadAttachment()
  const deleteAttachment = useDeleteAttachment()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])

  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [estimateInput, setEstimateInput] = useState('')
  const [titleEdit, setTitleEdit] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // Structure cascade filter state
  const [filterWorkspaceId, setFilterWorkspaceId] = useState<string | null>(null)
  const [filterPortfolioId, setFilterPortfolioId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeTaskId) { setTask(null); return }

    supabase
      .from('tasks')
      .select('*, project:projects(id,name,color,workspace_id,portfolio_id), assignee:profiles!assignee_id(id,name,avatar_url)')
      .eq('id', activeTaskId)
      .single()
      .then(({ data }) => {
        if (data) {
          const t = data as Task
          setTask(t)
          setTitleEdit(t.title)
          setEstimateInput(t.estimate_minutes ? formatMinutes(t.estimate_minutes) : '')

          // Pre-fill cascade from existing project assignment
          const proj = t.project as any
          if (proj) {
            setFilterWorkspaceId(proj.workspace_id ?? null)
            setFilterPortfolioId(proj.portfolio_id ?? null)
          } else {
            setFilterWorkspaceId(null)
            setFilterPortfolioId(null)
          }
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
    setTask({ ...task, ...updates })
    updateTask.mutate({ id: task.id, ...updates })
  }

  async function handleNewNote() {
    if (!task) return
    const note = await createNote.mutateAsync({
      note_type: 'task',
      task_id: task.id,
      title: task.title,
      content: '',
    })
    openNote(note.id, { mode: 'edit' })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!task || !e.target.files?.length) return
    const files = Array.from(e.target.files)
    e.target.value = ''
    for (const file of files) {
      setUploadingFiles((prev) => [...prev, file.name])
      try {
        await uploadAttachment.mutateAsync({ taskId: task.id, file })
      } finally {
        setUploadingFiles((prev) => prev.filter((n) => n !== file.name))
      }
    }
  }

  async function handleDownload(storagePath: string, fileName: string) {
    try {
      const url = await getSignedDownloadUrl(storagePath)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
    } catch {
      alert('Could not download file.')
    }
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
    setSubtasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: done ? 'done' : 'todo' } : t)))
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

  // ── Derived structure data ─────────────────────────────────────────────────

  const currentProject = task?.project_id ? allProjects.find((p) => p.id === task.project_id) ?? (task.project as any) : null
  const currentWorkspace = filterWorkspaceId ? workspaces.find((w) => w.id === filterWorkspaceId) : null
  const currentPortfolio = filterPortfolioId ? portfolios.find((p) => p.id === filterPortfolioId) : null
  const filteredProjects = allProjects

  if (!task) return null

  return (
    <Sheet open={!!activeTaskId} onOpenChange={(o) => !o && close()}>
      <SheetContent className="flex flex-col gap-0 p-0 !w-[min(100vw,72rem)] !max-w-[72rem]">

        {/* Delete confirmation */}
        {confirmDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl">
              <div className="mb-1 flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                <p className="font-semibold">Delete task</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-medium text-foreground">{task.title}</span>? This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setConfirmDeleteOpen(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">Cancel</button>
                <button
                  onClick={async () => { await deleteTask.mutateAsync(task.id); setConfirmDeleteOpen(false); close() }}
                  className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  {deleteTask.isPending ? 'Deleting…' : 'Delete task'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT: main content ────────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col overflow-y-auto bg-background">

            {/* Title */}
            <div className="px-8 pt-8 pb-4">
              {getTaskKey(task) && (
                <span className="mb-1.5 block text-xs font-mono font-medium text-muted-foreground/60 select-none">
                  {getTaskKey(task)}
                </span>
              )}
              <input
                className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/50 leading-snug"
                value={titleEdit}
                onChange={(e) => setTitleEdit(e.target.value)}
                onBlur={() => { if (titleEdit !== task.title) patch({ title: titleEdit }) }}
                placeholder="Task title"
              />
            </div>

            <div className="flex flex-col px-8 pb-8 gap-0">

              {/* Description */}
              <div className="border-b pb-5">
                <Textarea
                  placeholder="Add a description…"
                  className="min-h-[80px] w-full resize-none border-0 p-0 shadow-none focus-visible:ring-0 text-sm text-foreground/80 placeholder:text-muted-foreground/50 bg-transparent"
                  value={task.description ?? ''}
                  onChange={(e) => setTask({ ...task, description: e.target.value })}
                  onBlur={() => patch({ description: task.description })}
                />
              </div>

              {/* Attachments */}
              <div className="border-b py-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Attachments</span>
                    {attachments.length > 0 && (
                      <span className="text-xs text-muted-foreground">({attachments.length})</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Attach file
                  </button>
                </div>

                {/* Uploading in-progress */}
                {uploadingFiles.map((name) => (
                  <div key={name} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span className="flex-1 truncate">{name}</span>
                    <span className="text-xs">Uploading…</span>
                  </div>
                ))}

                {/* Attachment list */}
                {attachments.length === 0 && uploadingFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic">No attachments yet.</p>
                ) : (
                  <div className="space-y-1">
                    {attachments.map((att) => (
                      <div key={att.id} className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent transition-colors">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate text-sm">{att.file_name}</span>
                        {att.file_size && (
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {att.file_size < 1024 * 1024
                              ? `${Math.round(att.file_size / 1024)} KB`
                              : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                        )}
                        <button
                          title="Download"
                          onClick={() => handleDownload(att.storage_path, att.file_name)}
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => deleteAttachment.mutate({ id: att.id, taskId: att.task_id, storagePath: att.storage_path })}
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border-b py-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Notes</span>
                    {taskNotes.length > 0 && (
                      <span className="text-xs text-muted-foreground">({taskNotes.length})</span>
                    )}
                  </div>
                  <button
                    onClick={handleNewNote}
                    disabled={createNote.isPending}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> New note
                  </button>
                </div>
                {taskNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic">No notes yet.</p>
                ) : (
                  <div className="space-y-1">
                    {taskNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => openNote(note.id)}
                        className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate text-sm">{note.title || 'Untitled'}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(note.updated_at)}</span>
                        <button
                          title="Open full screen"
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); openNote(note.id, { fullscreen: true }) }}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-issues */}
              <div className="border-b py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Sub-issues</span>
                  {subtasks.length > 0 && (
                    <span className="text-xs text-muted-foreground">({subtasks.length})</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {subtasks.map((st) => <SubtaskRow key={st.id} task={st} onToggle={toggleSubtask} />)}
                </div>
                <button
                  className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => document.getElementById('subtask-input')?.focus()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <input
                    id="subtask-input"
                    className="bg-transparent outline-none placeholder:text-muted-foreground/60 text-sm"
                    placeholder="Add sub-issue…"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </button>
              </div>

              {/* Activity */}
              <div className="pt-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold">Activity</span>
                </div>

                {/* Created line */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    ✓
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Task created · <span className="font-medium">{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                  </span>
                </div>

                {/* Comments */}
                <div className="space-y-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {(c.author as any)?.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <p className="text-xs font-semibold">{(c.author as any)?.name ?? 'Unknown'}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(c.created_at), 'MMM d, yyyy · h:mm a')}
                          </span>
                        </div>
                        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                          {c.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comment input */}
                <div className="mt-4 rounded-xl border bg-muted/20 px-4 py-3 focus-within:ring-1 focus-within:ring-ring transition-all">
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                    placeholder="Leave a comment…"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                  />
                  {newComment.trim() && (
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={addComment} className="h-7 text-xs">Send</Button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT: sidebar ────────────────────────────────────────────────── */}
          <div className="flex w-[22rem] shrink-0 flex-col gap-4 overflow-y-auto border-l bg-muted/20 px-4 py-5">

            {/* ── BOX 1: Time Tracking ── */}
            <Box title="Time Tracking">
              <div className="pb-1">
                <TaskTimerButton
                  task={{ id: task.id, title: task.title, project_id: task.project_id }}
                  variant="full"
                />
              </div>
              <PropRow label="Estimate">
                <input
                  className="w-full rounded-md px-2 py-1 text-sm bg-transparent hover:bg-accent/60 transition-colors outline-none placeholder:text-muted-foreground font-medium"
                  placeholder="e.g. 1h 30m"
                  value={estimateInput}
                  onChange={(e) => setEstimateInput(e.target.value)}
                  onBlur={() => {
                    const mins = parseEstimate(estimateInput)
                    if (mins !== null) patch({ estimate_minutes: mins })
                  }}
                />
              </PropRow>
              {loggedSeconds > 0 && (
                <PropRow label="Logged">
                  <span className="px-2 py-1 text-sm font-medium tabular-nums text-foreground">
                    {formatDuration(loggedSeconds)}
                  </span>
                </PropRow>
              )}
            </Box>

            {/* ── BOX 2: Properties ── */}
            <Box title="Properties">
              <PropRow label="Status">
                <StatusPicker value={task.status} onChange={(v) => patch({ status: v })} />
              </PropRow>
              <PropRow label="Priority">
                <PriorityPicker value={task.priority} onChange={(v) => patch({ priority: v })} />
              </PropRow>
              <PropRow label="Assignee">
                <AssigneePicker
                  value={task.assignee_id}
                  assignee={task.assignee}
                  variant="full"
                  onChange={(id) => patch({ assignee_id: id })}
                />
              </PropRow>
              <PropRow label="Due date">
                <DatePicker label="Set date" value={task.due_date ?? null} onChange={(v) => patch({ due_date: v ?? undefined })} />
              </PropRow>
            </Box>

            {/* ── BOX 3: Structure ── */}
            <Box title="Structure">

              {/* Workspace — only show if one is set */}
              {filterWorkspaceId && currentWorkspace && (
                <PropRow label="Workspace">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{currentWorkspace.name}</span>
                  </div>
                </PropRow>
              )}

              {/* Portfolio — only show if one is set */}
              {filterPortfolioId && currentPortfolio && (
                <PropRow label="Portfolio">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{currentPortfolio.name}</span>
                  </div>
                </PropRow>
              )}

              {/* Project picker */}
              <PropRow label="Project">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<button className={PICKER_BTN} />}>
                    {currentProject ? (
                      <>
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: currentProject.color }} />
                        <span className="font-medium truncate">{currentProject.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Add to project</span>
                    )}
                    <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="start">

                    {/* No project option */}
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => {
                        patch({ project_id: null })
                        setFilterWorkspaceId(null)
                        setFilterPortfolioId(null)
                        setTask((t) => t ? { ...t, project_id: null, project: undefined } : t)
                      }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full border border-dashed border-muted-foreground/40 shrink-0" />
                      <span className="text-muted-foreground">No project</span>
                      {!task.project_id && <Check className="ml-auto h-3.5 w-3.5" />}
                    </DropdownMenuItem>

                    {/* Project list */}
                    {filteredProjects.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        className="gap-2"
                        onClick={() => {
                          patch({ project_id: p.id })
                          setFilterWorkspaceId(p.workspace_id)
                          setFilterPortfolioId(p.portfolio_id ?? null)
                          setTask((t) => t ? { ...t, project_id: p.id, project: p as any } : t)
                        }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                        {task.project_id === p.id && <Check className="ml-auto h-3.5 w-3.5" />}
                      </DropdownMenuItem>
                    ))}

                    {filteredProjects.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No projects found</p>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </PropRow>
            </Box>

            {/* Delete */}
            <button
              onClick={() => setConfirmDeleteOpen(true)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors mt-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete task
            </button>

          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
