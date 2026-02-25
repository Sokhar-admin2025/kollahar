-- Leads: intern anteckning för säljare (Lead Detail)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS internal_note_updated_at timestamptz;

COMMENT ON COLUMN public.leads.internal_note IS 'Intern anteckning för säljare (visas endast internt i LeadOS).';
COMMENT ON COLUMN public.leads.internal_note_updated_at IS 'Senaste tidpunkt då intern anteckning uppdaterades.';

