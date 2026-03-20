import { Resend } from 'resend'

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'KollaBilar <hej@kollahar.se>'

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export { FROM_EMAIL }

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
