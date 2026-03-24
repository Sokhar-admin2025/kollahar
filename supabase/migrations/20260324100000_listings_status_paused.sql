-- Migration: listings_status_paused
-- Syfte: Lägg till 'paused' som tillåtet värde i listings_status_check.
-- Bakgrund: Constraint definierades i 20260230000000_listings_draft_status.sql
-- med ('active', 'sold', 'deleted', 'draft') — 'paused' saknades,
-- vilket gav 23514 vid Pausa annons i bilar-dashboarden.

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_status_check
  CHECK (status IN ('active', 'paused', 'sold', 'deleted', 'draft'));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
