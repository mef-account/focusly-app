import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotesPageClient } from './NotesPageClient'

export default async function NotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('type')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.type === 'user') {
    redirect('/app/projects')
  }

  return <NotesPageClient />
}
