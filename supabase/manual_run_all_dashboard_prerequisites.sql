-- Kör i Supabase SQL Editor – säkerställer allt för Dealer Command Center
-- Säker att köra flera gånger (IF NOT EXISTS / IF NOT EXISTS)

-- 1. listing_views: tabell + seller_id (om tabellen saknas eller seller_id saknas)
CREATE TABLE IF NOT EXISTS public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.listing_views
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id ON public.listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_seller_id ON public.listing_views(seller_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_created_at ON public.listing_views(created_at);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_views' AND policyname = 'Anyone can insert listing views') THEN
    CREATE POLICY "Anyone can insert listing views"
      ON public.listing_views FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 2. leads: tabell + seller_id, buyer_id (om leads saknas)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'hot' CHECK (status IN ('hot', 'contacted', 'closed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id)
);

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON public.leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_seller_id ON public.leads(seller_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Sellers read leads by seller_id') THEN
    CREATE POLICY "Sellers read leads by seller_id" ON public.leads FOR SELECT USING (leads.seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Buyers insert leads for own conversations') THEN
    CREATE POLICY "Buyers insert leads for own conversations"
      ON public.leads FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = leads.conversation_id AND conversations.buyer_id = auth.uid()));
  END IF;
END $$;

-- 3. profiles.email_notifications (för e-postnotiser vid nya meddelanden)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;

-- 4. Realtime för leads (live-uppdatering av Hot Leads-räknaren)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  END IF;
END $$;
