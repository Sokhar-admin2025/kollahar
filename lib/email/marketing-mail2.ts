import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import MarketingMail2 from '@/app/emails/MarketingMail2'

export interface MarketingMail2Params {
  contactName?: string | null
  companyName?: string | null
  signupUrl: string
  imageUrl?: string | null
}

/**
 * Renderar Mail 2 (Sniper Mode) till HTML-sträng för Resend.
 */
export function renderMarketingMail2Html(params: MarketingMail2Params): string {
  const body = renderToStaticMarkup(
    createElement(MarketingMail2, {
      contactName: params.contactName ?? null,
      companyName: params.companyName ?? null,
      signupUrl: params.signupUrl,
      imageUrl: params.imageUrl ?? null,
    })
  )
  return `<!DOCTYPE html><html lang="sv"><body style="margin:0;padding:0;background:#f5f5f5">${body}</body></html>`
}
