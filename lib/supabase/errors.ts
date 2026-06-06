import type { PostgrestError } from '@supabase/supabase-js'

/** Converts a Supabase PostgrestError into a standard Error so it renders correctly in dev overlay / catch blocks. */
export function toError(error: PostgrestError): Error {
  return new Error(`${error.message} (code: ${error.code})`)
}
