-- Migration: source_site på listings och leads
-- Syfte: Möjliggör syskon-arkitektur genom att spåra vilken sajt
--        en annons eller ett lead skapades på.
-- Påverkan: Icke-destruktiv. Befintliga rader backfillas med 'main'.
-- Kräver: NOTIFY pgrst, 'reload schema'; efter körning i produktion.

-- ============================================================
-- 1. listings.source_site
-- ============================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source_site text NOT NULL DEFAULT 'main'
  CHECK (source_site IN ('main', 'bilar', 'batar', 'lokaler'));

-- Backfill: alla befintliga annonser tillhör Main
UPDATE public.listings
  SET source_site = 'main'
  WHERE source_site IS NULL OR source_site = '';

-- Index för filtrering per sajt (syskon-sajter frågar alltid på detta)
CREATE INDEX IF NOT EXISTS idx_listings_source_site
  ON public.listings (source_site);

-- Kombinerat index för vanligaste frågan: aktiva annonser per sajt
CREATE INDEX IF NOT EXISTS idx_listings_source_site_status
  ON public.listings (source_site, status);

-- ============================================================
-- 2. leads.source_site
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_site text NOT NULL DEFAULT 'main'
  CHECK (source_site IN ('main', 'bilar', 'batar', 'lokaler'));

-- Backfill: alla befintliga leads kom från Main
UPDATE public.leads
  SET source_site = 'main'
  WHERE source_site IS NULL OR source_site = '';

-- Index för CRM-filtrering (visa leads oavsett källa för ett företag)
CREATE INDEX IF NOT EXISTS idx_leads_source_site
  ON public.leads (source_site);

-- ============================================================
-- 3. RLS — inga ändringar krävs
-- ============================================================
-- Befintliga RLS-policies påverkas inte.
-- source_site är ett informationsfält, inte ett åtkomstfält.
-- Åtkomst styrs fortsatt av organization_id och user_id.

-- ============================================================
-- POST-KÖRNING (kör manuellt i Supabase SQL-editor efteråt)
-- ============================================================
-- NOTIFY pgrst, 'reload schema';
