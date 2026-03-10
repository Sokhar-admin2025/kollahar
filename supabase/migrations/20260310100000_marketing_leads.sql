-- LeadOS Marketing Automation: prospekt-tabell för 3-stegs-serien
-- Endast platform-admins (profiles.is_admin) har åtkomst. Ingen publik läsning.

-- 1) Kolumn is_admin på profiles om den saknas (för admin-only RLS)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS
  'true = platform-admin, t.ex. åtkomst till marketing_leads; false = vanlig användare.';

-- 2) Tabell marketing_leads
CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  company_name text,
  contact_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'onboarded', 'unsubscribed')),
  current_step int NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_leads IS
  'Prospekt för LeadOS Marketing Automation (3-stegs e-postserie). Endast admins.';
COMMENT ON COLUMN public.marketing_leads.email IS 'E-post; UNIQUE för att undvika dubbletter.';
COMMENT ON COLUMN public.marketing_leads.status IS 'active = i kampanj, onboarded = blivit kund, unsubscribed = avregistrerad.';
COMMENT ON COLUMN public.marketing_leads.current_step IS 'Var i 3-stegs-serien prospekten befinner sig (0, 1, 2, 3).';
COMMENT ON COLUMN public.marketing_leads.last_sent_at IS 'När senaste mejl i serien skickades (för throttling/nästa steg).';

-- 3) Index för status och current_step
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status
  ON public.marketing_leads(status);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_current_step
  ON public.marketing_leads(current_step);

-- 4) RLS – endast inloggade användare med is_admin
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read marketing_leads"
  ON public.marketing_leads
  FOR SELECT
  TO authenticated
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Only admins can insert marketing_leads"
  ON public.marketing_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Only admins can update marketing_leads"
  ON public.marketing_leads
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Only admins can delete marketing_leads"
  ON public.marketing_leads
  FOR DELETE
  TO authenticated
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );
