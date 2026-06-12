import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client for server-side operations that bypass RLS.
 * Only used in API routes — never exposed to the client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
