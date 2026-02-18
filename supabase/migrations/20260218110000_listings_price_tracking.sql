-- Phase 3: Price tracking för "PRISSÄNKT" badge och Price Drop Performance

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS previous_price numeric;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz;

COMMENT ON COLUMN public.listings.previous_price IS 'Tidigare pris – sätts vid prissänkning för att visa "Price Drop Performance"';
COMMENT ON COLUMN public.listings.price_updated_at IS 'När priset senast uppdaterades';
