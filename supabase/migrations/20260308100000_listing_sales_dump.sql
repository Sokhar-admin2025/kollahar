-- listing_sales: säljdump per annons/lead i LeadOS

CREATE TABLE public.listing_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sold_at timestamptz NOT NULL,
  sold_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  sold_by_role text NOT NULL CHECK (sold_by_role IN ('seller', 'owner')),
  sold_via text NOT NULL CHECK (sold_via IN ('sokhar', 'external', 'other')),
  -- Snapshots vid försäljning (icke-normaliserad avsiktligt)
  listing_title text NOT NULL,
  listing_make text,
  listing_model text,
  listing_year integer,
  price_at_sale integer,
  views_count integer,
  leads_count integer,
  favorites_count integer,
  average_response_time_ms bigint,
  sla_within_15m boolean
);

CREATE INDEX idx_listing_sales_org_sold_at
  ON public.listing_sales(organization_id, sold_at DESC);

CREATE INDEX idx_listing_sales_listing_id
  ON public.listing_sales(listing_id);

CREATE INDEX idx_listing_sales_lead_id
  ON public.listing_sales(lead_id);

-- Auto-sätt organization_id baserat på lead/listing
CREATE OR REPLACE FUNCTION public.set_listing_sale_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Försök först från lead
  IF NEW.lead_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id
    FROM public.leads
    WHERE id = NEW.lead_id;
  END IF;

  -- Fallback: från listing
  IF v_org_id IS NULL AND NEW.listing_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id
    FROM public.listings
    WHERE id = NEW.listing_id;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION
      'listing_sales: could not resolve organization_id for listing_id=% lead_id=%',
      NEW.listing_id, NEW.lead_id;
  END IF;

  NEW.organization_id := v_org_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_listing_sale_organization_id ON public.listing_sales;
CREATE TRIGGER trigger_set_listing_sale_organization_id
  BEFORE INSERT OR UPDATE OF listing_id, lead_id, organization_id
  ON public.listing_sales
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_listing_sale_organization_id();

-- RLS: org-isolering
ALTER TABLE public.listing_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read listing_sales by organization_id"
  ON public.listing_sales
  FOR SELECT
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Org members insert listing_sales by organization_id"
  ON public.listing_sales
  FOR INSERT
  WITH CHECK (organization_id = public.current_user_organization_id());

-- Dokumentation
COMMENT ON TABLE public.listing_sales IS
  'Säljdump per annons/lead i LeadOS – single source of truth för försäljningar (rapportering och historik).';

COMMENT ON COLUMN public.listing_sales.sold_via IS
  'Var försäljningen skedde: sokhar (plattformen), external (annan kanal), other (övrigt).';

COMMENT ON COLUMN public.listing_sales.average_response_time_ms IS
  'Genomsnittlig svarstid (ms) för detta lead innan försäljning, vid säljtillfället.';

COMMENT ON COLUMN public.listing_sales.sla_within_15m IS
  'True om första svar på leadet kom inom 15 minuter (SLA) vid försäljningen.';

