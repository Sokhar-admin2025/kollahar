import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkProfileComplete } from './lib/supabase/check-profile-complete'

// Rutter som alltid passerar utan guard-kontroll
function isExemptPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/inte-foretag' ||
    pathname.startsWith('/registrera') ||
    pathname.startsWith('/bil/') ||
    pathname.startsWith('/handlare/')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isExemptPath(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Guard 1: oinloggad på skyddad route (/dashboard/*)
  if (!user) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/inte-foretag', request.url))
  }

  // Guards 2+3: kontrollera bilar-registrering via organization_sites.
  // organization_sites är primär källa för bilar-behörighet — account_type kan vara
  // 'private' på grund av legacy-data (signUp utan account_type i metadata).
  // Logik:
  //   - Aktiv organization_sites-rad → bilar-handlare, fortsätt till Guard 4
  //   - Ingen organization_sites-rad + account_type !== 'company' → privatperson → /inte-foretag
  //   - Ingen organization_sites-rad + account_type = 'company' → ej registrerad → /registrera
  let hasBilarRegistration = false
  if (profile.organization_id) {
    const { data: registration } = await supabase
      .from('organization_sites')
      .select('status')
      .eq('organization_id', profile.organization_id)
      .eq('site', 'bilar')
      .single()
    hasBilarRegistration = registration?.status === 'active'
  }

  if (!hasBilarRegistration) {
    if (profile.account_type !== 'company') {
      // Guard 2: privatperson utan bilar-registrering → /inte-foretag
      return NextResponse.redirect(new URL('/inte-foretag', request.url))
    }
    // Guard 3: company-konto utan aktiv bilar-registrering → /registrera
    return NextResponse.redirect(new URL('/registrera', request.url))
  }

  // Guard 4: bilar-registrering OK men profilen inte ifylld → /registrera/profil
  const profileComplete = await checkProfileComplete(supabase)
  if (!profileComplete) {
    return NextResponse.redirect(new URL('/registrera/profil', request.url))
  }

  // Guard 5: allt OK
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
