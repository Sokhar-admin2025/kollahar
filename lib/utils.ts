import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Kontrollerar att e-postens domän matchar webbplatsens domän (för företagsregistrering).
 * Strippar https://, http://, www. från website och jämför med e-postens domän (del efter @).
 */
export function validateDomainMatch(email: string, website: string): boolean {
  const trimmedEmail = email.trim()
  const atIndex = trimmedEmail.indexOf('@')
  if (atIndex === -1) return false

  const emailDomain = trimmedEmail.slice(atIndex + 1).toLowerCase()
  if (!emailDomain) return false

  let siteDomain = website.trim().toLowerCase()
  if (!siteDomain) return false

  siteDomain = siteDomain.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  const slashIndex = siteDomain.indexOf('/')
  if (slashIndex !== -1) siteDomain = siteDomain.slice(0, slashIndex)
  siteDomain = siteDomain.replace(/^www\./i, '')

  return emailDomain === siteDomain
}
