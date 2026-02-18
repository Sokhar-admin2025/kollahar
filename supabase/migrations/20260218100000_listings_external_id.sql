-- Phase 3: external_id + dealer analytics read

-- 1. external_id för framtida inventory sync
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_external_id_user
  ON public.listings(user_id, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON COLUMN public.listings.external_id IS 'Externt ID för inventory sync – unikt per användare, används vid import/export';

-- 2. RLS: Annonsägare kan läsa analytics för sina annonser (dealer dashboard)
CREATE POLICY "Listing owners read analytics"
  ON public.analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = analytics_events.listing_id
      AND listings.user_id = auth.uid()
    )
  );
