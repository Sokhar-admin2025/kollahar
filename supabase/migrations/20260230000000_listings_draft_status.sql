-- Lägg till status 'draft' så handlare kan gömma annonser tills de är redo att sälja.
-- Draft-räknas inte i listings_limit_company (trigger räknar endast status='active').
-- "Users can view all own listings" tillåter ägare att läsa draft; "Public read active" gäller endast active.

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('active', 'sold', 'deleted', 'draft'));
