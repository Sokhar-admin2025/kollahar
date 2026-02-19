import type { Metadata } from 'next'
import Link from 'next/link'
import { DASHBOARD_TEXTS } from '../lib/content'

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Hör av dig till Kolla här! Vi älskar att höra från våra användare.',
}

export default function ContactPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-beige py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-display text-brand-text mb-8 antialiased">
              Hör av dig!
            </h1>

            <div className="space-y-6 text-brand-text leading-relaxed antialiased">
              <section>
                <p className="text-lg mb-4">
                  Har du frågor, hittat en bugg eller vill ge oss feedback? Vi älskar att höra från
                  våra användare. Eftersom vi är i Beta är din feedback extra värdefull.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3 antialiased">
                  Skicka e-post
                </h2>
                <p className="mb-4">
                  Skriv till oss på{' '}
                  <a
                    href="mailto:hej@kollahar.se"
                    className="text-brand-green underline hover:text-brand-green/80 font-medium"
                  >
                    hej@kollahar.se
                  </a>
                  . {DASHBOARD_TEXTS.contact.responseTime} Skriv gärna vad det gäller (t.ex.
                  support, bugg, feedback eller samarbete) i ämnesraden.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3 antialiased">
                  {DASHBOARD_TEXTS.contact.followUs}
                </h2>
                <p className="mb-3 text-brand-text/90">
                  Du hittar oss också på Instagram och Facebook – följ oss för nyheter och tips.
                </p>
                <ul className="flex flex-wrap gap-4">
                  <li>
                    <a
                      href={DASHBOARD_TEXTS.landing.footer.socialUrls.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green underline hover:text-brand-green/80 font-medium"
                    >
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a
                      href={DASHBOARD_TEXTS.landing.footer.socialUrls.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green underline hover:text-brand-green/80 font-medium"
                    >
                      Facebook
                    </a>
                  </li>
                </ul>
              </section>

              <section className="pt-6 border-t border-gray-200">
                <p className="text-sm text-brand-text/70">
                  Ett kontaktformulär på sajten kommer i en senare uppdatering – tills dess når du
                  oss enklast via e-post ovan.
                </p>
              </section>

              <p className="pt-4">
                <Link
                  href="/"
                  className="text-brand-green underline hover:text-brand-green/80 font-medium"
                >
                  ← Tillbaka till startsidan
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
