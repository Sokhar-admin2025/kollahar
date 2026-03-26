-- Migration: kontaktkanal-defaults på organizations
-- Syfte: Gör det möjligt för handlare att sätta org-nivå-defaults för
--        vilka kontaktkanaler som visas på deras profil och annonser.
--        show_phone/show_email/contact_via_chat finns sedan tidigare på listings
--        (per-annons), den här migrationen lägger org-nivå-defaults.
-- Påverkan: Icke-destruktiv. Befintliga rader får safe defaults.
-- Kräver: NOTIFY pgrst, 'reload schema'; efter körning i produktion.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_via_chat boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organizations.show_phone IS 'Org-default: visa telefonnummer på profil och annonser.';
COMMENT ON COLUMN public.organizations.show_email IS 'Org-default: visa e-post på profil och annonser.';
COMMENT ON COLUMN public.organizations.contact_via_chat IS 'Org-default: aktivera lead-formulär/chatt på annonser.';

-- ============================================================
-- POST-KÖRNING (kör manuellt i Supabase SQL-editor efteråt)
-- ============================================================
-- NOTIFY pgrst, 'reload schema';
