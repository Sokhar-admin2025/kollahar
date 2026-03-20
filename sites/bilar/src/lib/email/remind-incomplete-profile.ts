import { resend, FROM_EMAIL, escapeHtml } from './resend'

const PROFILE_URL = 'https://bilar.kollahar.se/registrera/profil'

export async function sendIncompleteProfileReminder(params: {
  to: string
  reminderCount: number // 1-based: vilket nummer denna påminnelse är
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[bilar/resend] RESEND_API_KEY saknas — påminnelse skickas inte')
    return { success: false, error: 'E-post är inte konfigurerad.' }
  }

  const { to, reminderCount } = params

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Slutför din registrering på KollaBilar',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0F172A;">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">
            Hej!
          </h2>
          <p style="margin-bottom:16px;line-height:1.6;">
            Du är nästan klar — fyll i ditt företagsnamn, org-nummer och adress
            för att aktivera ditt konto på KollaBilar.
          </p>
          <p style="margin-bottom:24px;">
            <a
              href="${escapeHtml(PROFILE_URL)}"
              style="display:inline-block;padding:12px 24px;background:#2563EB;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;"
            >
              Slutför registrering
            </a>
          </p>
          <p style="font-size:13px;color:#64748B;">
            Detta är påminnelse ${reminderCount} av 3.
          </p>
          <hr style="border:none;border-top:1px solid #F1F5F9;margin:24px 0;" />
          <p style="font-size:12px;color:#94A3B8;">
            KollaBilar &bull; bilar.kollahar.se
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[bilar/resend] Påminnelse-e-post fel:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[bilar/resend] Påminnelse-e-post exception:', err)
    return { success: false, error: msg }
  }
}
