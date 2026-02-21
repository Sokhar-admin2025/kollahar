-- Kör manuellt om migration inte körts: Lägg till status 'draft' för gömd annons.
-- Draft räknas inte i listings_limit_company (endast status='active' räknas).

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('active', 'sold', 'deleted', 'draft'));
