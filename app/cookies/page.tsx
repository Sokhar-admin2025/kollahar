import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Information om hur Kolla här! använder cookies och Sentry för tekniska förbättringar.',
}

export default function CookiesPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-beige py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-display text-brand-text mb-8 antialiased">
              Cookies
            </h1>

            <div className="space-y-6 text-brand-text leading-relaxed antialiased">
              <section>
                <p className="mb-4">
                  Vi använder cookies (&quot;kakor&quot;) för att få sajten att fungera, hålla dig inloggad och – om du
                  vill – hjälpa oss att förstå hur tjänsten används så att vi kan förbättra den. Här förklarar
                  vi kort vilka typer av cookies vi använder.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3">
                  Nödvändiga cookies
                </h2>
                <p className="mb-4">
                  Vi använder nödvändiga kakor för att inloggning och sajten ska fungera.
                  Dessa kan inte stängas av.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3">
                  Sentry – felspårning och prestanda
                </h2>
                <p className="mb-4">
                  Vi använder Sentry för att fånga tekniska fel och övervaka prestanda.
                  Det hjälper oss att hitta och åtgärda buggar snabbare och förbättra
                  användarupplevelsen. Om du accepterar cookies aktiveras även Session Replay,
                  som spelar in anonymiserade sessioner vid fel – så att vi kan se exakt vad
                  som hände innan ett problem uppstod.
                </p>
                <p className="mb-4">
                  <strong>Datahantering:</strong> All data som skickas till Sentry är
                  anonymiserad och används enbart för tekniska förbättringar. Vi lagrar
                  ingen personlig information i Sentry. Du kan när som helst välja
                  &quot;Endast nödvändiga&quot; i cookie-bannern för att stänga av
                  Sentry-spårning.
                </p>
                <p>
                  Läs mer om Sentrys integritetspolicy på{' '}
                  <a
                    href="https://sentry.io/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-green underline hover:text-brand-green/80"
                  >
                    sentry.io/privacy
                  </a>
                  .
                </p>
              </section>

              <section>
                <p className="text-brand-green font-medium mb-2">
                  Vi spårar dig inte i onödan – och du kan alltid välja bort allt utom det som är
                  absolut nödvändigt för att tjänsten ska fungera.
                </p>
                <p>
                  Har du frågor om hur vi använder cookies eller Sentry? Hör av dig på{' '}
                  <a
                    href="mailto:hej@kollahar.se"
                    className="text-brand-green underline hover:text-brand-green/80"
                  >
                    hej@kollahar.se
                  </a>
                  .
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

              <p className="mt-4 text-sm text-brand-text/70">
                Senast uppdaterad: 2026-02-19
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
