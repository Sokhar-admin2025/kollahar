/**
 * LeadOS Marketing – Mail 1: Hero image + sälj-copy
 * Första mejlet i 3-stegs-serien. Premium, rent utseende. Personlig touch via contact_name/company_name.
 */

export interface MarketingMail1Props {
  contactName?: string | null
  companyName?: string | null
  signupUrl: string
  /** Full URL till hero-bild (t.ex. dashboard-preview.png). Om tom visas ingen bild. */
  imageUrl?: string | null
}

export default function MarketingMail1({
  contactName,
  companyName,
  signupUrl,
  imageUrl,
}: MarketingMail1Props) {
  const firstName = contactName?.split(/\s+/)[0] ?? contactName ?? null
  const greeting = contactName
    ? `Hej ${contactName}`
    : companyName
      ? `Hej ${companyName}`
      : 'Hej'
  const headline = contactName?.trim()
    ? `17 minuter är för långsamt, ${contactName.trim()}.`
    : '17 minuter är för långsamt.'

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '22px', color: '#2C4638', marginBottom: '16px' }}>
        {headline}
      </h1>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        {greeting},
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '20px' }}>
        Sanningen svider: Ett lead i bilbranschen dör efter 15 minuter. Ändå ser verkligheten ofta ut
        som på bilden nedan – där affärer rinner ut i sanden för att tekniken inte hänger med.
      </p>

      {imageUrl && (
        <p style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a href={signupUrl} style={{ textDecoration: 'none' }}>
            <img
              src={imageUrl}
              alt="LeadOS Dashboard – Mission Control och SLA i realtid"
              width="560"
              height="320"
              style={{
                maxWidth: '100%',
                height: 'auto',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                display: 'block',
                margin: '0 auto',
              }}
            />
          </a>
        </p>
      )}

      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        LeadOS är byggt för att vända dessa siffror till grönt. Med <strong>Mission Control</strong>{' '}
        ser ni SLA-hälsa och svarstider i realtid – och med <strong>Sniper Mode</strong> samarbetar
        ni internt kring varje lead innan klockan runnit ut.
        {companyName?.trim() && (
          <>
            {' '}
            För {companyName.trim()} handlar det om att inte låta tekniken vara flaskan.
          </>
        )}
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        Vi erbjuder LeadOS som <strong>gratis Beta fram till 2028</strong> – mot att ni hjälper oss
        utmana de gamla drakarna och bygga en marknad där snabbhet och kvalitet vinner.
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '24px' }}>
        Tre minuter{firstName ? `, ${firstName}` : ''}. Därefter har ni Mission Control på plats.
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
