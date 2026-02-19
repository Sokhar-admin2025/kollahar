-- Preserve leads when listing is deleted – Hot Leads count ska inte försvinna
-- Kör i Supabase SQL Editor

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
    AND tc.table_name = 'leads'
    AND kcu.column_name = 'listing_id';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE public.leads
  ALTER COLUMN listing_id DROP NOT NULL;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_listing_id_fkey
  FOREIGN KEY (listing_id)
  REFERENCES public.listings(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.listing_id IS 'Annonsen – NULL om annonsen raderats (lead behålls för statistik)';
