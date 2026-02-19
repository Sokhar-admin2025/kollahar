-- Säljare får läsa egna listing_views (seller_id = auth.uid())
-- Kör i Supabase SQL Editor om dashboard visar 0 views trots att listing_views har rader
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_views' AND policyname = 'Sellers read own listing views') THEN
    CREATE POLICY "Sellers read own listing views"
      ON public.listing_views
      FOR SELECT
      USING (seller_id = auth.uid());
  END IF;
END $$;
