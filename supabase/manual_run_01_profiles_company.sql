-- Skript 1: Adress/bio-kolumner + handle_new_user
-- Kopiera HELA filens innehåll (Ctrl+A) och klistra in i Supabase SQL Editor. Inga ``` eller annan text.

-- Adress och bio för profiler (företag och privat)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zip_code text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.profiles.address IS 'Gatuadress (valfritt)';
COMMENT ON COLUMN public.profiles.zip_code IS 'Postnummer';
COMMENT ON COLUMN public.profiles.city IS 'Ort';
COMMENT ON COLUMN public.profiles.bio IS 'Kort beskrivning (t.ex. företagsbio)';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    account_type,
    website,
    org_number
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'account_type', 'private'),
    new.raw_user_meta_data->>'website',
    new.raw_user_meta_data->>'org_number'
  );
  RETURN new;
END;
$fn$;
