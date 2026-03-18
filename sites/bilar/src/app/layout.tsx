import type { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}
