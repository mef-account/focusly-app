import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Viewer users are restricted to Structure (/app/projects) only.
  if (user) {
    const restrictedForViewer = [
      '/app/dashboard',
      '/app/planner',
      '/app/notes',
      '/app/views',
      '/app/tracker',
    ]

    const pathname = request.nextUrl.pathname
    const isRestricted = restrictedForViewer.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )

    if (isRestricted) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.type === 'user') {
        const url = request.nextUrl.clone()
        url.pathname = '/app/projects'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
