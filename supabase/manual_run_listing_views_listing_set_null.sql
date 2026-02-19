-- Preserve listing_views when listing is deleted – Total Views ska inte försvinna
-- Kör i Supabase SQL Editor om migration inte körts automatiskt

DO $$
DECLARE
  conname text;
BEGIN
  SELECT tc.constraint_name INTO conname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'listing_views'
    AND kcu.column_name = 'listing_id';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.listing_views DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE public.listing_views
  ALTER COLUMN listing_id DROP NOT NULL;

ALTER TABLE public.listing_views
  ADD CONSTRAINT listing_views_listing_id_fkey
  FOREIGN KEY (listing_id)
  REFERENCES public.listings(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.listing_views.listing_id IS 'Annonsen – NULL om annonsen raderats (view behålls för Total Views-statistik)';
