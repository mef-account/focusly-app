import type { PostgrestError } from '@supabase/supabase-js'

/** Converts a Supabase PostgrestError into a standard Error so it renders correctly in dev overlay / catch blocks. */
export function toError(error: PostgrestError): Error {
  return new Error(`${error.message} (code: ${error.code})`)
}

/** Returns true when a Supabase error is a permission-denied (42501) error. */
export function isPermissionDenied(error: unknown): boolean {
  if (error && typeof error === 'object') {
    // PostgrestError shape
    if ('code' in error && (error as { code: string }).code === '42501') return true
    // Error message fallback
    if ('message' in error) {
      const msg = (error as { message: string }).message
      return msg.includes('42501') || msg.toLowerCase().includes('permission denied')
    }
  }
  return false
}

/** Returns a user-friendly message for common Supabase errors. */
export function friendlyError(error: unknown): string {
  if (isPermissionDenied(error)) return "You don't have permission to do this."
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}
