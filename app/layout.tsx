import './globals.css'
import type { Metadata } from 'next'
import { Knewave, DM_Sans } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import Footer from './components/organisms/Footer'
import CookieConsent from './components/layout/CookieConsent'
import ScrollbarGutter from './components/ScrollbarGutter'
import LayoutWithHeader from './components/layout/LayoutWithHeader' 

const knewave = Knewave({ 
  subsets: ['latin'],
  weight: '400',
  variable: '--font-knewave',
  display: 'swap',
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Kolla här! – En gladare marknadsplats, gjord för alla',
    template: '%s | Kolla här!',
  },
  description: 'En ny sorts marknadsplats skapad för användarna. Köp och sälj prylar enkelt, i en skön miljö helt utan krångel.',
  authors: [{ name: 'Kolla här! Crew' }],
  creator: 'Kolla här! Crew',
  keywords: ['marknadsplats', 'loppis', 'köp och sälj', 'begagnat', 'community', 'hållbart', 'sverige'],
  openGraph: {
    title: 'Kolla här! – En gladare marknadsplats',
    description: 'Gjord för alla. Köp, sälj och häng med i vårt community.',
    locale: 'sv_SE',
    type: 'website',
    siteName: 'Kolla här!',
  },
  // Ikon: app/icon.png (Next.js file convention)
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let initialIsVerified = true
  if (user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('otp_verified')
      .eq('id', user.id)
      .single()
    initialIsVerified = profile && typeof profile.otp_verified === 'boolean' ? profile.otp_verified : true
  }

  return (
    <html lang="sv">
      <body className={`${dmSans.variable} ${knewave.variable} font-body min-h-screen flex flex-col bg-brand-beige`}>
        <ScrollbarGutter />
        {/* Header med server-hämtad user = inget flimmer; innehållet wrappat i LayoutWithHeader */}
        <LayoutWithHeader
          initialUserId={user?.id ?? null}
          initialIsVerified={initialIsVerified}
        >
          {/* Huvudinnehållet: min-h-0 så att flex-barn (t.ex. InboxClient med h-full) kan fylla utan att tvinga body att växa */}
          <div className="flex-grow min-h-0 flex flex-col">
            {children}
          </div>
        </LayoutWithHeader>

        {/* Footern hamnar alltid längst ner */}
        <Footer />
        
        {/* Cookie Consent Banner */}
        <CookieConsent />
        
      </body>
    </html>
  )
}