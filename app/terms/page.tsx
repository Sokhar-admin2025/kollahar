import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Villkor & säkerhet',
  description: 'Villkor, trygghet och säker användning av Kolla här!.',
}

export default function TermsPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-beige py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-display text-brand-text mb-8 antialiased">
              Villkor & säkerhet
            </h1>

            <div className="space-y-6 text-brand-text leading-relaxed antialiased">
              {/* Vad Kolla här! är (och inte är) */}
              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3 antialiased">
                  1. Vad Kolla här! är
                </h2>
                <p className="mb-3">
                  Kolla här! är en marknadsplats där privatpersoner och företag kan köpa och sälja saker
                  mellan varandra. Vi tillhandahåller plattformen, men är inte part i själva affären mellan
                  köpare och säljare.
                </p>
                <p>
                  Du ansvarar själv för dina annonser, innehåll och affärer. Vi jobbar för att göra det så
                  tryggt och tydligt som möjligt, men kan inte lämna några garantier för varor, betalning
                  eller leverans.
                </p>
              </section>

              {/* Användarkonto & ansvar */}
              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3 antialiased">
                  2. Användarkonto & uppträdande
                </h2>
                <p className="mb-3">
                  Du ansvarar för att den information du lämnar är korrekt och uppdaterad, och att du
                  använder tjänsten på ett schyst sätt. Det innebär bland annat att:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>inte lägga upp olagligt innehåll eller varor som är förbjudna att sälja,</li>
                  <li>inte trakassera, hota eller kränka andra användare,</li>
                  <li>inte försöka kringgå säkerhet, spärrar eller RLS/regler i databasen.</li>
                </ul>
                <p className="mt-3">
                  Bryter du mot villkoren eller missbrukar tjänsten kan vi pausa eller stänga ditt konto och
                  radera innehåll som bryter mot regler eller lag.
                </p>
              </section>

              {/* Säkerhet & trygg affär */}
              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3 antialiased">
                  3. Säkerhet & trygg affär
                </h2>
                <p className="mb-3">
                  Vi rekommenderar alltid sunt förnuft och extra försiktighet vid affärer på nätet. Några
                  grundtips:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Möt gärna upp på en offentlig plats när det går.</li>
                  <li>Var skeptisk mot förskottsbetalningar till okända personer eller företag.</li>
                  <li>Var uppmärksam på bluff-sms, bluffmejl och länkar som ber om dina bankuppgifter.</li>
                  <li>
                    Kontakta oss om du ser misstänkt beteende eller bedrägeriförsök – skriv till{' '}
                    <a
                      href="mailto:hej@kollahar.se"
                      className="text-brand-green underline hover:text-brand-green/80"
                    >
                      hej@kollahar.se
                    </a>
                    .
                  </li>
                </ul>
                <p className="mt-3">
                  Vi bygger löpande in skydd och logik för att upptäcka missbruk, men du som användare har
                  alltid sista ordet om vilka affärer du väljer att fullfölja.
                </p>
              </section>

              {/* Integritet & dataskydd (översikt) */}
              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3 antialiased">
                  4. Integritet & dataskydd (översikt)
                </h2>
                <p className="mb-3">
                  Vi behandlar personuppgifter för att kunna driva tjänsten – till exempel ditt konto,
                  annonser, chatt och leads mellan köpare och säljare. Vi försöker alltid samla in så lite
                  som möjligt, och bara det som behövs för att plattformen ska fungera och utvecklas.
                </p>
                <p className="mb-3">
                  Du kan när som helst radera ditt konto. Då rensas din data i våra tabeller enligt vår
                  raderingslogik. För vissa delar, som företagets lead-statistik, kan vi behålla
                  aggregerad/anonymiserad information – till exempel att en lead registrerats på en viss
                  annons, utan koppling tillbaka till ett aktivt konto.
                </p>
                <p>
                  Mer detaljer om cookies finns på vår{' '}
                  <a
                    href="/cookies"
                    className="text-brand-green underline hover:text-brand-green/80"
                  >
                    cookie-sida
                  </a>
                  . Mer omfattande integritetstext kan vid behov kompletteras i en separat policy.
                </p>
              </section>

              {/* Ändringar i villkor */}
              <section>
                <h2 className="text-xl font-semibold text-brand-green mb-3 antialiased">
                  5. Ändringar i villkoren
                </h2>
                <p>
                  Vi kommer att uppdatera dessa villkor i takt med att tjänsten utvecklas. Vid större
                  förändringar försöker vi informera tydligt i tjänsten eller via e-post. Genom att fortsätta
                  använda Kolla här! efter att villkoren uppdaterats accepterar du de nya villkoren.
                </p>
              </section>
            </div>

            <p className="mt-8 text-sm text-brand-text/70">
              Senast uppdaterad: 2026-02-19
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
