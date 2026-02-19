-- Leads-tabell för Hot Leads – kör i Supabase SQL Editor om tabellen saknas
-- (Om du redan har migrerat 20260217100000 och 20260220100000 behöver du inte köra detta)

-- 1. Skapa leads om den inte finns (baserat på 20260217100000)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'hot' CHECK (status IN ('hot', 'contacted', 'closed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id)
);

-- 2. Lägg till seller_id och buyer_id (20260220100000)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON public.leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Säljare kan läsa leads för sina konversationer
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Sellers read own leads') THEN
    CREATE POLICY "Sellers read own leads"
      ON public.leads FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.conversations
          WHERE conversations.id = leads.conversation_id AND conversations.seller_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: Köpare kan skapa lead (vid lead-kort)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Buyers insert leads for own conversations') THEN
    CREATE POLICY "Buyers insert leads for own conversations"
      ON public.leads FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.conversations
          WHERE conversations.id = leads.conversation_id AND conversations.buyer_id = auth.uid()
        )
      );
  END IF;
END $$;

COMMENT ON TABLE public.leads IS 'Hot Leads från lead-kort – för Dealer Command Center';
