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

/** List all members of a project. */
export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/team/members?projectId=${projectId}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ProjectMember[]>
    },
    enabled: !!projectId,
  })
}

/** Invite a user by email and add them to a project. */
export function useInviteToProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, projectId }: { email: string; projectId: string }) => {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, projectId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to invite')
      }
      return res.json()
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}

/** Remove a viewer from a project. */
export function useRemoveFromProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const res = await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to remove member')
      }
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}
