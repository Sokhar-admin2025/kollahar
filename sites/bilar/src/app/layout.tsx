import type { Metadata } from 'next'
import { Urbanist } from 'next/font/google'
import './globals.css'

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-urbanist',
})

export const metadata: Metadata = {
  title: 'bilar.kollahar.se',
  description: 'Kollahär Bilar — B2B-marknadsplats för bilhandlare',
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
