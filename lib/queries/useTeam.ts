import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Profile } from '@/types'

export interface WorkspaceMember {
  id: string
  user_id: string
  email: string
  role: 'admin' | 'viewer'
  created_at: string
  project_ids: string[]
  profiles: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
}

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: ['workspace-members'],
    queryFn: async () => {
      const res = await fetch('/api/team/invite')
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<WorkspaceMember[]>
    },
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to invite')
      }
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members'] }),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch('/api/team/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to remove member')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members'] }),
  })
}

export function useUpdateMemberAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, projectIds }: { userId: string; projectIds: string[] }) => {
      const res = await fetch('/api/team/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectIds }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to update access')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members'] }),
  })
}
