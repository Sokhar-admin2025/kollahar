-- Migration: gör buyer_name och buyer_phone nullable på leads
-- Syfte: Möjliggör INSERT av leads utan buyer_name/buyer_phone,
--        t.ex. från syskon-sajters publika lead-formulär (bilar.kollahar.se)
--        där dessa fält inte samlas in eller läggs i internal_note.
-- Påverkan: Icke-destruktiv. Befintliga NOT NULL-rader påverkas inte.
-- Kräver: NOTIFY pgrst, 'reload schema'; efter körning i produktion.

ALTER TABLE public.leads
  ALTER COLUMN buyer_name DROP NOT NULL;

ALTER TABLE public.leads
  ALTER COLUMN buyer_phone DROP NOT NULL;

COMMENT ON COLUMN public.leads.buyer_name IS 'Köparens namn – nullable sedan 2026-03-26 (syskon-sajter samlar namn i internal_note).';
COMMENT ON COLUMN public.leads.buyer_phone IS 'Köparens telefon – nullable sedan 2026-03-26 (syskon-sajter samlar ej telefon i formuläret).';

-- ============================================================
-- POST-KÖRNING (kör manuellt i Supabase SQL-editor efteråt)
-- ============================================================
-- NOTIFY pgrst, 'reload schema';
