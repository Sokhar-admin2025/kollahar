import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Information om hur Kolla här! använder cookies.',
}

export default function CookiesPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-beige py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          {/* Centrerad container med vit content-yta */}
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            {/* Huvudrubrik */}
            <h1 className="text-4xl md:text-5xl font-display text-brand-text mb-8 antialiased">
              Cookies
            </h1>

            {/* Huvudinnehåll */}
            <div className="space-y-6 text-brand-text leading-relaxed antialiased">
              <section>
                <p className="text-lg mb-4">
                  Vi använder nödvändiga kakor för att inloggning och sajten ska fungera.
                </p>
                <p className="text-brand-green font-medium">
                  Vi spårar dig inte i onödan.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
