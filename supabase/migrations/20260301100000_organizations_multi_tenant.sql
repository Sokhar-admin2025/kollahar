-- Multi-tenant foundation: organizations + organization_id on key tables
-- Backward compatibility:
-- - organization_id is nullable for now
-- - existing rows backfilled from owner/seller user_id
-- - legacy user-based behavior still works via fallback

-- 1) Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
COMMENT ON TABLE public.organizations IS 'Tenant table for dealer/company isolation';

-- 2) Add organization_id columns (nullable for compatibility)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.listing_views ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 3) FK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_organization_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_organization_id_fkey'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listing_views_organization_id_fkey'
  ) THEN
    ALTER TABLE public.listing_views
      ADD CONSTRAINT listing_views_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_organization_id_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_listings_organization_id ON public.listings(organization_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_organization_id ON public.listing_views(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);

COMMENT ON COLUMN public.profiles.organization_id IS 'Tenant id; nullable for backward compatibility';
COMMENT ON COLUMN public.listings.organization_id IS 'Tenant id for listing isolation';
COMMENT ON COLUMN public.listing_views.organization_id IS 'Tenant id for analytics isolation';
COMMENT ON COLUMN public.leads.organization_id IS 'Tenant id for lead isolation';

-- 4) Backfill organizations rows from existing profiles
INSERT INTO public.organizations (id, name, slug)
SELECT
  p.id,
  COALESCE(NULLIF(trim(p.full_name), ''), 'Organization ' || substr(p.id::text, 1, 8)),
  COALESCE(NULLIF(trim(p.slug), ''), 'org-' || replace(p.id::text, '-', ''))
FROM public.profiles p
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- 5) Backfill organization_id (compat: default to owner/seller id)
UPDATE public.profiles
SET organization_id = COALESCE(organization_id, id)
WHERE organization_id IS NULL;

UPDATE public.listings l
SET organization_id = COALESCE(l.organization_id, p.organization_id, l.user_id)
FROM public.profiles p
WHERE p.id = l.user_id
  AND l.organization_id IS NULL;

UPDATE public.listings
SET organization_id = user_id
WHERE organization_id IS NULL;

UPDATE public.listing_views lv
SET organization_id = COALESCE(
  lv.organization_id,
  (SELECT l.organization_id FROM public.listings l WHERE l.id = lv.listing_id),
  (SELECT p.organization_id FROM public.profiles p WHERE p.id = lv.seller_id),
  lv.seller_id
)
WHERE lv.organization_id IS NULL;

UPDATE public.listing_views
SET organization_id = seller_id
WHERE organization_id IS NULL;

UPDATE public.leads ld
SET organization_id = COALESCE(
  ld.organization_id,
  (SELECT l.organization_id FROM public.listings l WHERE l.id = ld.listing_id),
  (SELECT p.organization_id FROM public.profiles p WHERE p.id = ld.seller_id),
  ld.seller_id
)
WHERE ld.organization_id IS NULL;

UPDATE public.leads
SET organization_id = seller_id
WHERE organization_id IS NULL;

-- 6) Helper function used by org-based RLS policies
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
    auth.uid()
  );
$$;

COMMENT ON FUNCTION public.current_user_organization_id() IS 'Returns tenant id for current user; fallback to auth.uid() for legacy rows';

-- 7) Auto-populate organization_id on new data (compat-safe)
CREATE OR REPLACE FUNCTION public.set_listing_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT COALESCE(p.organization_id, NEW.user_id)
    INTO NEW.organization_id
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_listing_organization_id ON public.listings;
CREATE TRIGGER trigger_set_listing_organization_id
  BEFORE INSERT OR UPDATE OF user_id, organization_id
  ON public.listings
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_listing_organization_id();

CREATE OR REPLACE FUNCTION public.set_listing_view_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT l.organization_id
    INTO NEW.organization_id
    FROM public.listings l
    WHERE l.id = NEW.listing_id;

    IF NEW.organization_id IS NULL THEN
      SELECT COALESCE(p.organization_id, NEW.seller_id)
      INTO NEW.organization_id
      FROM public.profiles p
      WHERE p.id = NEW.seller_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_listing_view_organization_id ON public.listing_views;
CREATE TRIGGER trigger_set_listing_view_organization_id
  BEFORE INSERT OR UPDATE OF listing_id, seller_id, organization_id
  ON public.listing_views
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_listing_view_organization_id();

CREATE OR REPLACE FUNCTION public.set_lead_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT l.organization_id
    INTO NEW.organization_id
    FROM public.listings l
    WHERE l.id = NEW.listing_id;

    IF NEW.organization_id IS NULL THEN
      SELECT COALESCE(p.organization_id, NEW.seller_id)
      INTO NEW.organization_id
      FROM public.profiles p
      WHERE p.id = NEW.seller_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_lead_organization_id ON public.leads;
CREATE TRIGGER trigger_set_lead_organization_id
  BEFORE INSERT OR UPDATE OF listing_id, seller_id, organization_id
  ON public.leads
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_lead_organization_id();

-- 8) Harden RLS using organization_id checks (backward compatible fallback)

-- LISTINGS
DROP POLICY IF EXISTS "Auth users create ads" ON public.listings;
CREATE POLICY "Auth users create ads"
  ON public.listings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(organization_id, user_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Owners update own ads" ON public.listings;
CREATE POLICY "Owners update own ads"
  ON public.listings
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND COALESCE(organization_id, user_id) = public.current_user_organization_id()
  )
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(organization_id, user_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Owners delete own ads" ON public.listings;
CREATE POLICY "Owners delete own ads"
  ON public.listings
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND COALESCE(organization_id, user_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Users can view all own listings" ON public.listings;
CREATE POLICY "Users can view all own listings"
  ON public.listings
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND COALESCE(organization_id, user_id) = public.current_user_organization_id()
  );

-- LISTING_VIEWS
DROP POLICY IF EXISTS "Sellers read own listing views" ON public.listing_views;
CREATE POLICY "Org members read own listing views"
  ON public.listing_views
  FOR SELECT
  USING (
    COALESCE(organization_id, seller_id) = public.current_user_organization_id()
  );

-- LEADS
DROP POLICY IF EXISTS "Sellers read own leads" ON public.leads;
DROP POLICY IF EXISTS "Sellers read leads by seller_id" ON public.leads;
CREATE POLICY "Org members read leads by organization_id"
  ON public.leads
  FOR SELECT
  USING (
    COALESCE(organization_id, seller_id) = public.current_user_organization_id()
  );
