import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import MarketingMail1 from '@/app/emails/MarketingMail1'

export interface MarketingMail1Params {
  contactName?: string | null
  companyName?: string | null
  signupUrl: string
  /** Full URL till hero-bild (t.ex. https://kollahar.se/dashboard-preview.png). Valfri. */
  imageUrl?: string | null
}

/**
 * Renderar Mail 1 till HTML-sträng för Resend.
 */
export function renderMarketingMail1Html(params: MarketingMail1Params): string {
  const body = renderToStaticMarkup(
    createElement(MarketingMail1, {
      contactName: params.contactName ?? null,
      companyName: params.companyName ?? null,
      signupUrl: params.signupUrl,
      imageUrl: params.imageUrl ?? null,
    })
  )
  return `<!DOCTYPE html><html lang="sv"><body style="margin:0;padding:0;background:#f5f5f5">${body}</body></html>`
}
