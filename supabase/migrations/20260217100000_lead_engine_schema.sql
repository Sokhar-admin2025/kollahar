-- Phase 1: Lead Engine & Analytics Schema
-- profiles.slug, analytics_events, import_logs, leads

-- 1. profiles.slug – URL-vänlig identifierare för company-konton (full_name-city)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.profiles.slug IS 'URL-vänlig slug för company-konton: full_name-city (lowercase, ersatt mellanslag med bindestreck)';

-- Funktion: generera slug från full_name + city
CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  city_part text;
  slug_candidate text;
  counter int := 0;
BEGIN
  IF NEW.account_type != 'company' THEN
    NEW.slug := NULL;
    RETURN NEW;
  END IF;

  base := lower(trim(COALESCE(NEW.full_name, 'foretag')));
  base := regexp_replace(base, '[^a-z0-9\s-]', '', 'g');
  base := regexp_replace(base, '\s+', '-', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  base := trim(both '-' from base);
  IF base = '' THEN base := 'foretag'; END IF;

  city_part := lower(trim(COALESCE(NEW.city, '')));
  city_part := regexp_replace(city_part, '[^a-z0-9\s-]', '', 'g');
  city_part := regexp_replace(city_part, '\s+', '-', 'g');
  city_part := regexp_replace(city_part, '-+', '-', 'g');
  city_part := trim(both '-' from city_part);

  slug_candidate := CASE WHEN city_part != '' THEN base || '-' || city_part ELSE base END;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = slug_candidate AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    slug_candidate := base || CASE WHEN city_part != '' THEN '-' || city_part ELSE '' END || '-' || counter;
  END LOOP;

  NEW.slug := slug_candidate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_profile_slug
  BEFORE INSERT OR UPDATE OF account_type, full_name, city ON public.profiles
  FOR EACH ROW
  WHEN (NEW.account_type = 'company')
  EXECUTE PROCEDURE generate_profile_slug();

-- 2. analytics_events – GDPR: ingen IP, endast referrer_source
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'lead_start', 'phone_click')),
  referrer_source text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_events_listing_id ON public.analytics_events(listing_id);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);

COMMENT ON TABLE public.analytics_events IS 'Analytics för annonser – GDPR: ingen IP, endast referrer_source från Referer-header';

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert analytics (server-side tracking)"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

-- 3. import_logs – för bulk-import, admin-notis vid status=error
CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  rows_processed int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_import_logs_status ON public.import_logs(status);
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own import_logs"
  ON public.import_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own import_logs"
  ON public.import_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. leads – Hot Leads för dealer-dashboard, kopplad till conversation + listing
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'hot' CHECK (status IN ('hot', 'contacted', 'closed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id)
);

CREATE INDEX idx_leads_listing_id ON public.leads(listing_id);
CREATE INDEX idx_leads_status ON public.leads(status);

COMMENT ON TABLE public.leads IS 'Hot Leads från lead-kort i chat – för dealer-dashboard statistik';

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS: Säljare kan läsa leads för sina konversationer
CREATE POLICY "Sellers read own leads"
  ON public.leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = leads.conversation_id
      AND conversations.seller_id = auth.uid()
    )
  );

-- Köpare kan skapa lead (vid submit av lead-kort)
CREATE POLICY "Buyers insert leads for own conversations"
  ON public.leads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = leads.conversation_id
      AND conversations.buyer_id = auth.uid()
    )
  );
