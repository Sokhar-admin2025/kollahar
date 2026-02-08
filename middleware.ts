import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options })
          })
        }
      }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/fav')

  // Om användaren är inloggad, kontrollera om de är flaggade för tvingat lösenordsbyte
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, force_password_change')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.force_password_change && pathname !== '/reset-password') {
        const url = new URL('/reset-password', request.url)
        return NextResponse.redirect(url)
      }
    } catch (e) {
      console.error('Kunde inte läsa force_password_change från profil:', e)
    }
  }

  if (isProtected && (error || !user)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
