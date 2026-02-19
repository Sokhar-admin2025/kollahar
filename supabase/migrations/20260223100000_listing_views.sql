-- View tracker for listing page views – fills "Total Views" in Dealer Command Center
CREATE TABLE IF NOT EXISTS public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id ON public.listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_created_at ON public.listing_views(created_at);

COMMENT ON TABLE public.listing_views IS 'Page views for listings – logged client-side when annons/[id] is viewed';

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a view (client-side tracking when page is viewed)
CREATE POLICY "Anyone can insert listing views"
  ON public.listing_views
  FOR INSERT
  WITH CHECK (true);
