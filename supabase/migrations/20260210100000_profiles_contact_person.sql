-- Kontaktperson för företagsprofiler (visas i inställningar under Användaruppgifter)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_person text;

COMMENT ON COLUMN public.profiles.contact_person IS 'Kontaktperson (t.ex. för företagskonto).';
