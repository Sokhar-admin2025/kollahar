-- Fält för publika säljprofiler: kontotyp, webb, verifiering, orgnummer, created_at
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
COMMENT ON COLUMN public.profiles.created_at IS 'När profilen skapades – används för "Medlem sedan" (historik).';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'private' CHECK (account_type IN ('private', 'company'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_company_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_number text;

COMMENT ON COLUMN public.profiles.account_type IS 'private = privat profil (kräver inloggning att visa), company = öppen säljprofil';
COMMENT ON COLUMN public.profiles.is_company_verified IS 'Visa verifieringsbricka för företag';
COMMENT ON COLUMN public.profiles.org_number IS 'Organisationsnummer (valfritt för företag)';
