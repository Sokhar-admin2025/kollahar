import { Resend } from 'resend'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Kollahar.se <noreply@send.kollahar.se>'
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://kollahar.se'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface SendLeadNotificationParams {
  to: string
  cc?: string[]
  type: 'lead_card' | 'first_message'
  conversationId: string
  listingTitle: string
  buyerName: string
  buyerPhone?: string
  messageContent?: string
  claimAccountUrl?: string | null
}

export async function sendLeadNotification(
  params: SendLeadNotificationParams
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[resend] RESEND_API_KEY saknas – lead-notis skickas inte')
    return { success: false, error: 'E-post är inte konfigurerad.' }
  }

  const {
    to,
    cc = [],
    type,
    conversationId,
    listingTitle,
    buyerName,
    buyerPhone,
    messageContent,
    claimAccountUrl,
  } = params

  const chatUrl = `${BASE_URL}/dashboard/messages?conv=${conversationId}`

  const subject =
    type === 'lead_card'
      ? `Nytt Lead: ${listingTitle} – ${buyerName}`
      : `Nytt meddelande: ${listingTitle} – ${buyerName}`

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;padding:24px;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="margin:0 0 16px;font-size:20px;color:#2C4638;">Nytt Lead från Kollahar.se</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#333;">
      <strong>Köpare:</strong> ${escapeHtml(buyerName)}
    </p>
    ${buyerPhone ? `<p style="margin:0 0 16px;font-size:14px;color:#333;"><strong>Telefon:</strong> ${escapeHtml(buyerPhone)}</p>` : ''}
    <p style="margin:0 0 16px;font-size:14px;color:#333;">
      <strong>Annons:</strong> ${escapeHtml(listingTitle)}
    </p>
    ${messageContent ? `<p style="margin:0 0 16px;font-size:14px;color:#333;background:#f9f9f9;padding:12px;border-radius:8px;border-left:4px solid #2C4638;"><strong>Meddelande:</strong><br>${escapeHtml(messageContent)}</p>` : ''}
    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(chatUrl)}" style="display:inline-block;padding:12px 24px;background:#2C4638;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Öppna chatten</a>
    </p>
    ${claimAccountUrl ? `<p style="margin:0;font-size:12px;color:#666;">Har du inget konto än? <a href="${escapeHtml(claimAccountUrl)}" style="color:#2C4638;">Skapa konto</a></p>` : ''}
  </div>
</body>
</html>
`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      cc: cc.length > 0 ? cc : undefined,
      subject,
      html: bodyHtml,
    })

    if (error) {
      console.error('[resend] Lead notification error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[resend] Lead notification exception:', err)
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
