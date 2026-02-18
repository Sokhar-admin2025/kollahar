import { Resend } from 'resend'

const ADMIN_EMAIL = 'hej@kollahar.se'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Kolla här! <hej@kollahar.se>'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

/** Skicka lead-e-post till dealer med BCC till admin. */
export async function sendLeadEmailToDealer(params: {
  to: string
  buyerName: string
  buyerPhone: string
  listingTitle: string
  listingUrl: string
  price: string
  year: string | null
  model: string | null
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[resend] RESEND_API_KEY saknas – lead-e-post skickas inte')
    return { success: false, error: 'E-post är inte konfigurerad.' }
  }

  const { to, buyerName, buyerPhone, listingTitle, listingUrl, price, year, model } = params

  const paramsLine = [price, year, model].filter(Boolean).join(' • ')

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      bcc: [ADMIN_EMAIL],
      subject: `Ny lead: ${buyerName} – ${listingTitle}`,
      html: `
        <h2>Ny lead från Kolla här!</h2>
        <p><strong>Köpare:</strong> ${escapeHtml(buyerName)}</p>
        <p><strong>Telefon:</strong> ${escapeHtml(buyerPhone)}</p>
        <p><strong>Annons:</strong> <a href="${escapeHtml(listingUrl)}">${escapeHtml(listingTitle)}</a></p>
        <p><strong>Detaljer:</strong> ${escapeHtml(paramsLine || '–')}</p>
        <p><a href="${escapeHtml(listingUrl)}">Öppna annonsen</a></p>
      `,
    })

    if (error) {
      console.error('[resend] Lead email error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[resend] Lead email exception:', err)
    return { success: false, error: msg }
  }
}

/** Skicka admin-notis vid import-fel (för import_logs-trigger). */
export async function sendImportErrorNotification(params: {
  userId: string
  errorMessage: string
  rowsProcessed: number
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[resend] RESEND_API_KEY saknas – import-fel-notis skickas inte')
    return { success: false, error: 'E-post är inte konfigurerad.' }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `[Kolla här!] Import-fel – ${params.rowsProcessed} rader`,
      html: `
        <h2>Import-fel</h2>
        <p><strong>Användare:</strong> ${escapeHtml(params.userId)}</p>
        <p><strong>Rader:</strong> ${params.rowsProcessed}</p>
        <p><strong>Fel:</strong> ${escapeHtml(params.errorMessage)}</p>
      `,
    })

    if (error) {
      console.error('[resend] Import error notification:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[resend] Import error notification exception:', err)
    return { success: false, error: msg }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
