import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Om oss',
  description: 'Kolla här! – En gladare marknadsplats. Vi bygger detta tillsammans med er.',
}

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-beige py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          {/* Centrerad container med vit content-yta */}
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            {/* Huvudrubrik */}
            <h1 className="text-4xl md:text-5xl font-display text-brand-text mb-8 antialiased">
              Kolla här! – En gladare marknadsplats.
            </h1>

            {/* Huvudinnehåll */}
            <div className="space-y-6 text-brand-text leading-relaxed antialiased">
              {/* Visionen */}
              <section>
                <p className="text-lg mb-4">
                  Vi är alternativet till de stela jättarna. Vi vill göra det enkelt, lokalt och kul att köpa och sälja. En plats där alla känner sig välkomna, oavsett om du är en erfaren säljare eller bara vill rensa lite i garderoben.
                </p>
                <p>
                  Här handlar det om community, inte bara affärer. Vi tror på att göra det enkelt att hitta det du letar efter, eller att ge dina prylar ett nytt hem där de uppskattas.
                </p>
              </section>

              {/* Inkludering & tillgänglighet */}
              <section>
                <h2 className="text-xl font-semibold mb-3 antialiased">För alla – på riktigt</h2>
                <p className="mb-3">
                  Vi vill att Kolla här! ska kännas som en trygg plats för alla, oavsett bakgrund, erfarenhet
                  eller funktionsnedsättning. Därför jobbar vi steg för steg med tillgänglighet enligt
                  gällande riktlinjer (t.ex. WCAG och EU:s tillgänglighetskrav), bättre kontraster, tydligare
                  texter och ett gränssnitt som fungerar med hjälpmedel.
                </p>
                <p>
                  Perfekt blir vi aldrig – men vi lyssnar, justerar och förbättrar hela tiden. Hör gärna av dig
                  om du stöter på något som gör tjänsten svår att använda, så tar vi det vidare in i vår
                  backlog. Du kan alltid nå oss på{' '}
                  <a
                    href="mailto:hej@kollahar.se"
                    className="text-brand-green underline hover:text-brand-green/80"
                  >
                    hej@kollahar.se
                  </a>
                  .
                </p>
              </section>

              {/* Community-driven Beta */}
              <section className="bg-brand-beige rounded-lg p-6 border border-brand-green/10">
                <h2 className="text-xl font-semibold mb-3 antialiased">Vi bygger detta tillsammans</h2>
                <p>
                  Sajten är i Beta och formas av er – användarna. Vi lyssnar på era idéer, feedback och önskemål. Har du förslag på hur vi kan göra Kolla här! bättre? Vi lyssnar! Detta är vår gemensamma marknadsplats.
                </p>
              </section>

              {/* Avslutning */}
              <section className="pt-6 border-t border-gray-200">
                <p className="text-lg font-medium">
                  Välkommen till gänget!
                </p>
                <p className="text-brand-green mt-2">
                  /Kolla här! Crew
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
