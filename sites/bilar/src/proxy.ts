import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rutter som aldrig kräver auth
const PUBLIC_PATHS = ['/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Låt publika rutter passera utan kontroll
  if (PUBLIC_PATHS.includes(pathname)) {
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

  // 1. Auth-check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const loginUrl = new URL('/login', process.env.MAIN_APP_URL)
    loginUrl.searchParams.set('next', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 2. account_type-check: endast company-konton
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.account_type !== 'company') {
    const mainUrl = new URL('/', process.env.MAIN_APP_URL)
    return NextResponse.redirect(mainUrl)
  }

  // 3. organization_sites-check: org måste vara registrerad på 'bilar'
  if (profile.organization_id) {
    const { data: registration } = await supabase
      .from('organization_sites')
      .select('status')
      .eq('organization_id', profile.organization_id)
      .eq('site', 'bilar')
      .single()

    if (!registration || registration.status !== 'active') {
      // Onboarding-flöde — ej byggt ännu, skicka till Main
      const onboardingUrl = new URL('/', process.env.MAIN_APP_URL)
      onboardingUrl.searchParams.set('onboarding', 'bilar')
      return NextResponse.redirect(onboardingUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
