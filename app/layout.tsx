import './globals.css'
import type { Metadata } from 'next'
import { Knewave, DM_Sans } from 'next/font/google'

// Importera din nya Footer
// OBS: Kontrollera att sökvägen stämmer. 
// Om du lade filen i 'components/organisms/Footer.tsx' så är detta rätt.
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
  title: 'Min Marknadsplats',
  description: 'Köp och sälj enkelt och tryggt',
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