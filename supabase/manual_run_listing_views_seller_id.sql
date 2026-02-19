-- Lägg till seller_id på listing_views
-- Kör i Supabase SQL Editor om du får "column seller_id does not exist"

ALTER TABLE public.listing_views
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listing_views_seller_id ON public.listing_views(seller_id);

COMMENT ON COLUMN public.listing_views.seller_id IS 'Säljaren (listings.user_id) – för dashboard-query';
