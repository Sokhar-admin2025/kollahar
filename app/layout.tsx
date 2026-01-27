import './globals.css'
import type { Metadata } from 'next'
import { Knewave, DM_Sans } from 'next/font/google'
import Footer from './components/organisms/Footer' 

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
  title: 'Kollahär! - En marknadsplats för trygg handel',
  description: 'Köp och sälj enkelt i en trygg marknadsplats. Var med och bygg framtiden tillsammans!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className={`${dmSans.variable} ${knewave.variable} font-body min-h-screen flex flex-col bg-brand-beige`}>
        
        {/* Huvudinnehållet (växer för att fylla skärmen) */}
        <div className="flex-grow">
          {children}
        </div>

        {/* Footern hamnar alltid längst ner */}
        <Footer />
        
      </body>
    </html>
  )
}