'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const done = project.done_count ?? 0
  const total = project.task_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h3 className="truncate font-semibold group-hover:text-primary transition-colors">
            {project.name}
          </h3>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {done}/{total} tasks
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
      )}

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: project.color }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{pct}% complete</span>
          <span>Updated {formatDate(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}
