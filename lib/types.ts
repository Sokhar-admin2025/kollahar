/**
 * Profil (public.profiles). Nya fält kan saknas i DB tills migration körts – använd optional/safe access.
 */
export interface Profile {
  id: string
  full_name: string | null
  location: string | null
  avatar_url: string | null
  updated_at: string
  /** När profilen skapades – använd för "Medlem sedan" (historik). */
  created_at?: string | null
  /** 'private' | 'company' – default 'private' om kolumn saknas */
  account_type?: 'private' | 'company'
  /** Företagswebb – null om inte satt */
  website?: string | null
  /** Verifierat företag – default false */
  is_company_verified?: boolean
  /** Orgnummer – null om privat eller ej ifyllt */
  org_number?: string | null
  /** Gatuadress (valfritt) */
  address?: string | null
  /** Postnummer */
  zip_code?: string | null
  /** Ort */
  city?: string | null
  /** Kort beskrivning (t.ex. företagsbio) */
  bio?: string | null
  /** Kontaktperson (t.ex. för företagskonto) */
  contact_person?: string | null
  /** true = huvuddealer, ser alla leads; false = säljare, ser endast egna */
  is_admin?: boolean
  /** Pekar på huvuddealer – säljare har denna satt */
  parent_organization_id?: string | null
  /** E-post vid nya meddelanden – default true */
  email_notifications?: boolean
}
