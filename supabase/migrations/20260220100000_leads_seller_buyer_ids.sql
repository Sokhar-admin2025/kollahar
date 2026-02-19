-- Leads: lägg till seller_id och buyer_id för tydlig separation och statistik
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.seller_id IS 'Säljaren (listings.user_id) – bevara för statistik';
COMMENT ON COLUMN public.leads.buyer_id IS 'Köparen som skickade lead-kortet';
