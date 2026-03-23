import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROXY_TIMEOUT_MS = 5000

// Rutter som alltid passerar utan guard-kontroll
function isExemptPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/inte-foretag' ||
    pathname.startsWith('/registrera') ||
    pathname.startsWith('/bil/') ||
    pathname.startsWith('/handlare/') ||
    pathname.startsWith('/api/')
  )
}

async function runGuards(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const { pathname } = request.nextUrl

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

  // Query 1: auth — måste göras först för att validera session
  const { data: { user } } = await supabase.auth.getUser()

  // Guard 1: oinloggad på skyddad route
  if (!user) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Query 2: profiles + organization_sites i ett enda anrop via PostgREST-join.
  // profiles.organization_id → organizations.id → organization_sites (reverse FK).
  // Eliminerar det tidigare tredje sekventiella anropet.
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, organization_id, profile_completed, organizations(organization_sites(site, status))')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/inte-foretag', request.url))
  }

  // Extrahera organization_sites från den inbäddade joinen.
  // Supabase infererar organizations som array (reverse FK) — vi tar första raden.
  type OrgSite = { site: string; status: string }
  type OrgRow = { organization_sites: OrgSite[] }
  const orgsRaw = profile.organizations as unknown as OrgRow | OrgRow[] | null
  const orgRow = Array.isArray(orgsRaw) ? orgsRaw[0] : orgsRaw
  const orgSites = orgRow?.organization_sites ?? []
  const hasBilarRegistration = orgSites.some(
    (s) => s.site === 'bilar' && s.status === 'active'
  )

  // Guard 2: privatperson utan bilar-registrering → /inte-foretag
  if (!hasBilarRegistration && profile.account_type !== 'company') {
    return NextResponse.redirect(new URL('/inte-foretag', request.url))
  }

  // Guard 3: company-konto utan aktiv bilar-registrering → /registrera
  if (!hasBilarRegistration) {
    return NextResponse.redirect(new URL('/registrera', request.url))
  }

  // Guard 4: bilar-registrering OK men profiles.profile_completed = false → /registrera/profil
  if (!profile.profile_completed) {
    return NextResponse.redirect(new URL('/registrera/profil', request.url))
  }

  // Guard 5: allt OK
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isExemptPath(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  try {
    return await Promise.race<NextResponse>([
      runGuards(request, response),
      new Promise<NextResponse>((_, reject) =>
        setTimeout(() => reject(new Error('proxy timeout')), PROXY_TIMEOUT_MS)
      ),
    ])
  } catch {
    // Fail safe: vid timeout eller oväntat fel → /login
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
