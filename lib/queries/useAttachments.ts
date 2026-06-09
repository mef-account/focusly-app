import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import type { TaskAttachment } from '@/types'

const supabase = createClient()
const BUCKET = 'attachments'

export function useAttachmentsByTask(taskId?: string) {
  return useQuery({
    queryKey: ['attachments', 'by-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false })
      if (error) throw toError(error)
      return data as TaskAttachment[]
    },
    enabled: !!taskId,
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
      const uniqueName = `${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
      const storagePath = `${user.id}/${taskId}/${uniqueName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type })
      if (uploadError) throw toError(uploadError as any)

      const { data, error: insertError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: storagePath,
        })
        .select()
        .single()
      if (insertError) throw toError(insertError)
      return data as TaskAttachment
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', 'by-task', taskId] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taskId, storagePath }: { id: string; taskId: string; storagePath: string }) => {
      await supabase.storage.from(BUCKET).remove([storagePath])
      const { error } = await supabase.from('task_attachments').delete().eq('id', id)
      if (error) throw toError(error)
      return { taskId }
    },
    onSuccess: ({ taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', 'by-task', taskId] })
    },
  })
}

export async function getSignedDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  if (error) throw toError(error as any)
  return data.signedUrl
}
