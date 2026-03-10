/**
 * LeadOS Marketing – Mail 2: Sniper Mode
 * Andra mejlet i 3-stegs-serien. Fokus på team-samarbete kring leads.
 */

export interface MarketingMail2Props {
  contactName?: string | null
  companyName?: string | null
  signupUrl: string
  /** Full URL till bild (t.ex. Dealer-inventory-settings.png). Om tom visas ingen bild. */
  imageUrl?: string | null
}

export default function MarketingMail2({
  contactName,
  companyName,
  signupUrl,
  imageUrl,
}: MarketingMail2Props) {
  const greeting = contactName
    ? `Hej ${contactName}`
    : companyName
      ? `Hej ${companyName}`
      : 'Hej'

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '22px', color: '#2C4638', marginBottom: '16px' }}>
        Sluta gissa – börja svara tillsammans
      </h1>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px' }}>
        {greeting},
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '20px' }}>
        Ett lead ska inte hamna mellan stolarna. Med <strong>Sniper Mode</strong> i LeadOS har ni
        en intern chatt kring varje lead – så att rätt person svarar i tid, utan gissningar om vem
        som pratat med kunden. Som i skärmbilden nedan: samma flöde, tydliga inställningar.
      </p>

      {imageUrl && (
        <p style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a href={signupUrl} style={{ textDecoration: 'none' }}>
            <img
              src={imageUrl}
              alt="LeadOS – Dealer inventory och inställningar"
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
        Teamet ser samma konversation, kan lägga till anteckningar och koordinera nästa steg. Det
        är byggt för handlare som vill ha kontroll, inte kaos.
      </p>
      <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '24px' }}>
        Fortfarande gratis (Beta) fram till 2028. Nästa steg: skapa konto och testa Sniper Mode
        tillsammans med er säljgrupp.
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
