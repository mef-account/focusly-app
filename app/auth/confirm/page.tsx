'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function confirm() {
      const next = searchParams.get('next') ?? '/app/dashboard'
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (token_hash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as EmailOtpType,
        })
        if (otpError) {
          setError(otpError.message)
          return
        }
        router.replace(next)
        return
      }

      // Implicit flow: tokens arrive in the URL hash (#access_token=...)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')

      if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
        if (sessionError) {
          setError(sessionError.message)
          return
        }
        router.replace(next)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(next)
        return
      }

      setError('Invalid or expired invitation link.')
    }

    void confirm()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/login" className="text-sm text-primary underline">
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    }>
      <AuthConfirmContent />
    </Suspense>
  )
}
