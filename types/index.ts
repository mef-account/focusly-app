// ─── Enums ────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'cancelled'

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

export type Tag = 'work' | 'personal'

export type NoteType = 'daily' | 'project' | 'task'

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  timezone: string
  created_at: string
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  type: 'personal' | 'work'
  owner_id: string
  created_at: string
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export type PortfolioStatus = 'active' | 'on_hold' | 'completed' | 'cancelled'

export interface Portfolio {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string
  status: PortfolioStatus
  owner_id: string | null
  start_date: string | null
  target_date: string | null
  created_at: string
  updated_at: string
  // joined
  owner?: Profile | null
  projects?: Project[]
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  workspace_id: string
  portfolio_id: string | null
  name: string
  description: string | null
  color: string
  created_by: string | null
  created_at: string
  updated_at: string
  // joined / computed
  task_count?: number
  done_count?: number
  min_due_date?: string | null
  max_due_date?: string | null
}

// ─── Label ────────────────────────────────────────────────────────────────────

export interface Label {
  id: string
  workspace_id: string
  name: string
  color: string | null
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  project_id: string | null
  parent_task_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  created_by: string | null
  start_date: string | null
  due_date: string | null
  scheduled_start: string | null
  estimate_minutes: number | null
  created_at: string
  updated_at: string
  // joined
  project?: Project
  assignee?: Profile | null
  labels?: Label[]
  subtasks?: Task[]
  time_logged?: number // seconds
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  author?: Profile
}

// ─── Task Activity ────────────────────────────────────────────────────────────

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
  user?: Profile
}

// ─── Task Attachment ──────────────────────────────────────────────────────────

export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  storage_path: string
  created_at: string
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  note_type: NoteType
  note_date: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
}

// ─── Time Entry ───────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  description: string | null
  tag: Tag | null
  started_at: string | null
  stopped_at: string | null
  duration_seconds: number | null
  date: string
  created_at: string
  // joined
  project?: Project | null
  task?: Task | null
}

// ─── View ─────────────────────────────────────────────────────────────────────

export type ViewGroupBy =
  | 'due_date'
  | 'status'
  | 'project'
  | 'assignee'
  | 'priority'
  | 'created_at'
  | 'none'

export type ViewFilterOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'before'
  | 'after'
  | 'is_empty'
  | 'is_not_empty'

export interface ViewFilter {
  field: string
  operator: ViewFilterOperator
  value: string | string[] | null
}

export interface ViewSort {
  column: string
  direction: 'asc' | 'desc'
}

export interface SavedView {
  id: string
  workspace_id: string
  user_id: string
  name: string
  filters: ViewFilter[]
  group_by: ViewGroupBy
  group_config: Record<string, unknown>
  visible_columns: string[]
  sort: ViewSort
  project_ids: string[] | null
  show_subitems: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

// ─── Due date bucket helper type ─────────────────────────────────────────────

export type DueDateBucket =
  | 'Before today'
  | 'Today'
  | 'Tomorrow'
  | 'This week'
  | 'Later'
  | 'Empty'
