-- Migration: organizations_address_profiles_completion
-- Syfte: Lägger till adressfält på organizations samt spårningskolumner
--        för registreringsflödets slutförande på syskon-sajter.
-- Påverkan: Icke-destruktiv. Fyra nya kolumner med defaults/nullable.
--           Inga befintliga RLS-policies behöver uppdateras.
-- Kräver: NOTIFY pgrst, 'reload schema'; efter körning i produktion.

-- 1. organizations.address
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS address text;

-- 2. organizations.city
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS city text;

-- 3. profiles.profile_completed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- 4. profiles.reminder_count
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

-- Kommentarer
COMMENT ON COLUMN public.organizations.address IS
  'Gatuadress för handlaren — ifylls i registreringsflödet på syskon-sajter.';

COMMENT ON COLUMN public.organizations.city IS
  'Ort för handlaren — ifylls i registreringsflödet på syskon-sajter.';

COMMENT ON COLUMN public.profiles.profile_completed IS
  'true när company-kontot har slutfört steg 3 i registreringsflödet (företagsnamn, adress m.m. ifyllt).';

COMMENT ON COLUMN public.profiles.reminder_count IS
  'Antal påminnelse-e-post skickade till kontot om ofullständig handlarprofil. Max 3 (styrs av cron remind-incomplete-profiles).';

-- ============================================================
-- POST-KÖRNING (kör manuellt i Supabase SQL-editor efteråt)
-- ============================================================
-- NOTIFY pgrst, 'reload schema';
