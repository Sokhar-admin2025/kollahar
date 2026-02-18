-- Run this in Supabase SQL Editor to add Phase 3 columns to listings.
-- Safe to run multiple times (uses IF NOT EXISTS).

-- 1. external_id (text) – för inventory sync
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS external_id text;

-- 2. previous_price (numeric) – för prissänkning / Price Drop Performance
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS previous_price numeric;

-- 3. price_updated_at (timestamp) – när priset senast ändrades
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz;

-- Index för external_id (unikt per användare)
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_external_id_user
  ON public.listings(user_id, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON COLUMN public.listings.external_id IS 'Externt ID för inventory sync';
COMMENT ON COLUMN public.listings.previous_price IS 'Tidigare pris – sätts vid prissänkning';
COMMENT ON COLUMN public.listings.price_updated_at IS 'När priset senast uppdaterades';
