'use client'

import { createClient } from '@/lib/supabase/client'

const NOTE_IMAGES_BUCKET = 'note-images'

/**
 * Upload an image File to the note-images Supabase Storage bucket
 * and return its permanent public URL.
 *
 * Requires the note-images bucket to exist and be public.
 */
export async function uploadNoteImage(file: File): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(NOTE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}
