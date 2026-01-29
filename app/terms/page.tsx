import type { Metadata } from 'next'
import Header from '../components/organisms/Header'

export const metadata: Metadata = {
  title: 'Villkor, Säkerhet & Vett och etikett',
  description: 'Spelregler, säkerhetstips och information om din data på Kolla här!',
}

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand-beige py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          {/* Centrerad container med vit content-yta */}
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            {/* Titel */}
            <h1 className="text-4xl md:text-5xl font-display text-brand-text mb-8 antialiased">
              Villkor, Säkerhet & Vett och etikett
            </h1>

            {/* Innehåll */}
            <div className="space-y-8 text-brand-text leading-relaxed antialiased">
              {/* Spelregler (Vett & Etikett) */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 antialiased">Spelregler (Vett & Etikett)</h2>
                <div className="space-y-4">
                  <article>
                    <h3 className="text-lg font-semibold mb-2 antialiased">Var snäll.</h3>
                    <p>
                      Inga hot, inget hat. Alla ska känna sig trygga och välkomna här. Respektera varandra och var schysst i era interaktioner. Om någon beter sig otrevligt, rapportera det så tar vi hand om det.
                    </p>
                  </article>
                  <article>
                    <h3 className="text-lg font-semibold mb-2 antialiased">Vi förmedlar bara kontakten.</h3>
                    <p>
                      Köpare och säljare gör upp affären och betalning själva. Vi är inte part i köpet. Vi är här för att hjälpa er hitta varandra, resten är upp till er.
                    </p>
                  </article>
                </div>
              </section>

              {/* Säkerhet */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 antialiased">Säkerhet</h2>
                <p>
                  Använd sunt förnuft vid affärer. Träffas på säkra platser – gärna offentliga platser eller polisstationer om det känns bättre. Kontrollera produkterna innan köp, och var försiktig med betalningar. Betala inte i förskott till okända. Om något känns konstigt, lita på magkänslan.
                </p>
              </section>

              {/* Din Data (GDPR) */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 antialiased">Din Data (GDPR)</h2>
                <p>
                  Vi sparar bara det som behövs för att tjänsten ska funka. Vi säljer inte din data. Vill du bli raderad? Det fixar du i inställningarna.
                </p>
              </section>

              {/* Tillgänglighet & Inkludering (EAA) */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 antialiased">För alla (EAA & Tillgänglighet)</h2>
                <p>
                  Vi tror på ett internet för alla. Vi jobbar aktivt för att följa European Accessibility Act (EAA) och göra Kolla här! tillgängligt för alla, oavsett funktionsvariation. Eftersom vi är i Beta kanske allt inte är perfekt än – stöter du på hinder? Berätta för oss så fixar vi det!
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
