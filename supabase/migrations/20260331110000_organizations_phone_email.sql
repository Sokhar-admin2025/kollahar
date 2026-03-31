-- Migration: kontaktuppgifter på organizations
-- Syfte: Lägger till phone och email på organizations så att handlarprofilens
--        kontaktknappar (tel:/mailto:) kan länka till verkliga uppgifter.
-- Påverkan: Icke-destruktiv. Befintliga rader får NULL (nullable).
-- Kräver: NOTIFY pgrst, 'reload schema'; efter körning i produktion.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.organizations.phone IS 'Org-kontakttelefon — visas på handlarprofilen om show_phone = true.';
COMMENT ON COLUMN public.organizations.email IS 'Org-kontakt-e-post — visas på handlarprofilen om show_email = true.';

-- ============================================================
-- POST-KÖRNING (kör manuellt i Supabase SQL-editor efteråt)
-- ============================================================
-- NOTIFY pgrst, 'reload schema';
