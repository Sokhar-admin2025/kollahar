import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Hör av dig till Kolla här! Vi älskar att höra från våra användare.',
}

export default function ContactPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-beige py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          {/* Centrerad container med vit content-yta */}
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            {/* Huvudrubrik */}
            <h1 className="text-4xl md:text-5xl font-display text-brand-text mb-8 antialiased">
              Hör av dig!
            </h1>

            {/* Huvudinnehåll */}
            <div className="space-y-6 text-brand-text leading-relaxed antialiased">
              <section>
                <p className="text-lg mb-4">
                  Har du frågor, hittat en bugg eller vill ge oss feedback? Vi älskar att höra från våra användare.
                </p>
                <p className="text-brand-green font-medium">
                  Eftersom vi är i Beta är din feedback guld värd.
                </p>
              </section>

              <section className="pt-6 border-t border-gray-200">
                <p className="text-sm text-brand-text/70">
                  Kontaktformulär kommer snart!
                </p>
              </section>

              {/* TODO: Lägg till kontaktformulär här i framtiden */}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
