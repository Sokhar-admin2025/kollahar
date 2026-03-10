import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import MarketingMail3 from '@/app/emails/MarketingMail3'

export interface MarketingMail3Params {
  contactName?: string | null
  companyName?: string | null
  signupUrl: string
  /** Seller view 1 – t.ex. översikt av era annonser i Mission Control */
  imageUrl1?: string | null
  /** Seller view 2 – t.ex. hantering och detaljer */
  imageUrl2?: string | null
}

/**
 * Renderar Mail 3 (Framtiden & SEO) till HTML-sträng för Resend.
 */
export function renderMarketingMail3Html(params: MarketingMail3Params): string {
  const body = renderToStaticMarkup(
    createElement(MarketingMail3, {
      contactName: params.contactName ?? null,
      companyName: params.companyName ?? null,
      signupUrl: params.signupUrl,
      imageUrl1: params.imageUrl1 ?? null,
      imageUrl2: params.imageUrl2 ?? null,
    })
  )
  return `<!DOCTYPE html><html lang="sv"><body style="margin:0;padding:0;background:#f5f5f5">${body}</body></html>`
}
