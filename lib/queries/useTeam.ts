import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Profile } from '@/types'

export interface TeamUser {
  user_id: string
  email: string | null
  profiles: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
  project_ids: string[]
}

/** All user-type accounts with their current project access. */
export function useAllUsers() {
  return useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const res = await fetch('/api/team/members')
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<TeamUser[]>
    },
  })
}

/** Invite a new person by email only. No project assignment. */
export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to invite')
      }
      return res.json() as Promise<{ success: boolean; userId: string; alreadyExists: boolean }>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }),
  })
}

/** Grant an existing user access to one or more projects. */
export function useGrantProjects() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, projectIds }: { userId: string; projectIds: string[] }) => {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectIds }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to grant access')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }),
  })
}

/** Remove a user from one project (pass projectId) or all projects (omit projectId). */
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }),
  })
}
