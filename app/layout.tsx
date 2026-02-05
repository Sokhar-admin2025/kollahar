import './globals.css'
import type { Metadata } from 'next'
import { Knewave, DM_Sans } from 'next/font/google'
import Footer from './components/organisms/Footer'
import CookieConsent from './components/layout/CookieConsent'
import ScrollbarGutter from './components/ScrollbarGutter' 

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
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className={`${dmSans.variable} ${knewave.variable} font-body min-h-screen flex flex-col bg-brand-beige`}>
        <ScrollbarGutter />
        {/* Huvudinnehållet (växer för att fylla skärmen) */}
        <div className="flex-grow">
          {children}
        </div>

        {/* Footern hamnar alltid längst ner */}
        <Footer />
        
        {/* Cookie Consent Banner */}
        <CookieConsent />
        
      </body>
    </html>
  )
}