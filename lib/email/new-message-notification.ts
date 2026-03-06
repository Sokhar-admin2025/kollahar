import { Resend } from 'resend'

const FROM_EMAIL = 'noreply@kollahar.se'

// Använd endast produktions-URL för e-postlänkar – aldrig VERCEL_URL (tar användare till Vercel-login)
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kollahar.se'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface SendNewMessageNotificationParams {
  to: string
  conversationId: string
  listingTitle: string
  senderName: string
  messagePreview: string
}

export async function sendNewMessageNotification(
  params: SendNewMessageNotificationParams
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[resend] RESEND_API_KEY saknas – nytt-meddelande-notis skickas inte')
    return { success: false, error: 'E-post är inte konfigurerad.' }
  }

  const { to, conversationId, listingTitle, senderName, messagePreview } = params
  const chatUrl = `${BASE_URL}/dashboard/messages?conv=${conversationId}`
  const subject = `Nytt meddelande: ${listingTitle} – ${senderName}`

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
    <h2 style="margin:0 0 16px;font-size:20px;color:#2C4638;">Nytt meddelande från Kollahar.se</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#333;">
      <strong>${escapeHtml(senderName)}</strong> har skickat ett meddelande angående <strong>${escapeHtml(listingTitle)}</strong>.
    </p>
    ${messagePreview ? `<p style="margin:0 0 24px;font-size:14px;color:#333;background:#f9f9f9;padding:12px;border-radius:8px;border-left:4px solid #2C4638;">${escapeHtml(messagePreview)}</p>` : ''}
    <p style="margin:0;">
      <a href="${escapeHtml(chatUrl)}" style="display:inline-block;padding:12px 24px;background:#2C4638;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Öppna chatten</a>
    </p>
  </div>
</body>
</html>
`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: bodyHtml,
    })
    if (error) {
      console.error('[resend] New message notification error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[resend] New message notification exception:', err)
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
