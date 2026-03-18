-- Migration: organization_sites
-- Syfte: Spårar vilka syskon-sajter ett företag är registrerat på.
--        Grund för SSO-onboarding-flöde och CC-fakturering/support.
-- Påverkan: Icke-destruktiv. Ny tabell, inga befintliga tabeller ändras.
-- Kräver: NOTIFY pgrst, 'reload schema'; efter körning i produktion.

CREATE TABLE public.organization_sites (
  organization_id uuid    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site            text    NOT NULL CHECK (site IN ('bilar', 'batar', 'lokaler')),
  status          text    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, site)
);

-- Index för CC-vy: lista alla registrerade företag per syskon
CREATE INDEX idx_organization_sites_site
  ON public.organization_sites (site);

COMMENT ON TABLE public.organization_sites IS
  'Vilka syskon-sajter ett företag är registrerat på. Grund för SSO-onboarding-flöde och CC-fakturering.';

COMMENT ON COLUMN public.organization_sites.site IS
  'Syskon-sajt: bilar, batar eller lokaler. Main ingår inte — alla company-konton har implicit tillgång till Main.';

COMMENT ON COLUMN public.organization_sites.status IS
  'active = aktivt registrerat, inactive = avstängt (t.ex. vid utebliven betalning).';

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.organization_sites ENABLE ROW LEVEL SECURITY;

-- Företag kan läsa sina egna rader
CREATE POLICY "Org members read own organization_sites"
  ON public.organization_sites
  FOR SELECT
  USING (organization_id = public.current_user_organization_id());

-- Skrivoperationer (INSERT/UPDATE/DELETE) sker via service role i server actions.
-- Ingen klient-policy för skrivning — service role bypass RLS.

-- ============================================================
-- POST-KÖRNING (kör manuellt i Supabase SQL-editor efteråt)
-- ============================================================
-- NOTIFY pgrst, 'reload schema';
