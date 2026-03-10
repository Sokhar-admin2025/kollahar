/**
 * LeadOS Marketing – Mail 3: Framtiden & SEO
 * Tredje mejlet i 3-stegs-serien. Fokus på SEO och kommande funktioner.
 * Inkluderar två seller-view-bilder (samma visuella stil som Mail 1/2).
 */

const imageStyle = {
  maxWidth: '100%' as const,
  height: 'auto' as const,
  border: 'none' as const,
  borderRadius: '8px' as const,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' as const,
  display: 'block' as const,
  margin: '0 auto' as const,
}

export interface MarketingMail3Props {
  contactName?: string | null
  companyName?: string | null
  signupUrl: string
  /** Seller view 1 – t.ex. översikt av era annonser i Mission Control */
  imageUrl1?: string | null
  /** Seller view 2 – t.ex. hantering och detaljer */
  imageUrl2?: string | null
}

export default function MarketingMail3({
  contactName,
  companyName,
  signupUrl,
  imageUrl1,
  imageUrl2,
}: MarketingMail3Props) {
  const greeting = contactName
    ? `Hej ${contactName}`
    : companyName
      ? `Hej ${companyName}`
      : 'Hej'

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '22px', color: '#2C4638', marginBottom: '16px' }}>
        Vi bygger bryggan till framtiden
      </h1>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        {greeting},
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        LeadOS utvecklas ständigt. Vi satsar på sökbarhet och synlighet – så att era annonser når
        rätt köpare – och på att ni snart ska kunna se och hantera externa annonser (t.ex. från
        Blocket eller andra platser) i samma Mission Control. Ett ställe för alla era leads.
      </p>
      {imageUrl1 && (
        <>
          <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '12px' }}>
            Så här kan det se ut för er – era annonser i samma vy:
          </p>
          <p style={{ marginBottom: '16px', textAlign: 'center' }}>
            <a href={signupUrl} style={{ textDecoration: 'none' }}>
              <img
                src={imageUrl1}
                alt="Seller view 1 – era annonser i Mission Control"
                width={560}
                height={320}
                style={imageStyle}
              />
            </a>
          </p>
        </>
      )}
      {imageUrl2 && (
        <p style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a href={signupUrl} style={{ textDecoration: 'none' }}>
            <img
              src={imageUrl2}
              alt="Seller view 2 – översikt och hantering av annonser"
              width={560}
              height={320}
              style={imageStyle}
            />
          </a>
        </p>
      )}
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        De som är med nu får tillgång först till det vi bygger: bättre SEO, tydligare rapporter och
        fler kanaler in i samma flöde. Gratis Beta fram till 2028 – ni hjälper oss utmana de gamla
        drakarna, vi ger er verktygen.
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        Om ni inte redan har testat: skapa konto på 3 minuter och börja använda Mission Control
        och Sniper Mode idag. Inget kreditkort, ingen förpliktelse – bara 3 minuter till översikten.
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '24px' }}>
        Klicka nedan och se själva hur det ser ut för er som säljare.
      </p>
      <p style={{ marginBottom: '24px' }}>
        <a
          href={signupUrl}
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: '#2C4638',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '16px',
          }}
        >
          Starta din Mission Control på 3 minuter
        </a>
      </p>
      <p style={{ fontSize: '14px', color: '#666' }}>
        Med vänliga hälsningar,
        <br />
        Kolla här! / LeadOS
      </p>
    </div>
  )
}
