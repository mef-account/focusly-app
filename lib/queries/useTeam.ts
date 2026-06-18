import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Profile } from '@/types'

export interface ProjectMember {
  project_id: string
  user_id: string
  role: 'viewer'
  created_at: string
  email: string | null
  profiles: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
}

/** All unique viewers grouped by user, each with their list of project_ids. */
export interface ViewerSummary {
  user_id: string
  email: string | null
  profiles: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
  project_ids: string[]
}

/** Flat list of all project_members across all projects. */
export function useAllMembers() {
  return useQuery({
    queryKey: ['project-members'],
    queryFn: async () => {
      const res = await fetch('/api/team/members')
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ProjectMember[]>
    },
  })
}

/** Invite a user by email and add them to multiple projects at once. */
export function useInviteToProjects() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, projectIds }: { email: string; projectIds: string[] }) => {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, projectIds }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to invite')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members'] })
    },
  })
}

/** Remove a viewer from one project (pass projectId) or all projects (omit projectId). */
export function useRemoveFromProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, projectId }: { userId: string; projectId?: string }) => {
      const res = await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectId }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to remove')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members'] })
    },
  })
}
