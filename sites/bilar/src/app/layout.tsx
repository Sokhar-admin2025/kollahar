import type { Metadata } from 'next'
import { Urbanist } from 'next/font/google'
import './globals.css'

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-urbanist',
})

export const metadata: Metadata = {
  title: {
    default: 'KollaBilar — Bilar från verifierade handlare',
    template: '%s | KollaBilar',
  },
  description:
    'Hitta din nästa bil hos verifierade bilhandlare på KollaBilar — ett verktyg från Kolla här!',
  metadataBase: new URL('https://bilar.kollahar.se'),
  openGraph: {
    type: 'website',
    locale: 'sv_SE',
    siteName: 'KollaBilar',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className={urbanist.variable}>{children}</body>
    </html>
  )
}
