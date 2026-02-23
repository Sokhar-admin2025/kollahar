-- Fix: prevent FK failures on organization_id when creating new listings.
-- Root cause: NEW.organization_id could resolve to user_id that had no row in organizations.
-- This migration backfills missing organizations and hardens triggers to auto-create rows.

-- 1) Backfill missing organization rows for any existing organization_id in core tables.
INSERT INTO public.organizations (id, name, slug)
SELECT
  src.organization_id,
  COALESCE(NULLIF(trim(p.full_name), ''), 'Organization ' || substr(src.organization_id::text, 1, 8)),
  'org-' || replace(src.organization_id::text, '-', '')
FROM (
  SELECT organization_id FROM public.profiles WHERE organization_id IS NOT NULL
  UNION
  SELECT organization_id FROM public.listings WHERE organization_id IS NOT NULL
  UNION
  SELECT organization_id FROM public.listing_views WHERE organization_id IS NOT NULL
  UNION
  SELECT organization_id FROM public.leads WHERE organization_id IS NOT NULL
) src
LEFT JOIN public.profiles p ON p.id = src.organization_id
ON CONFLICT (id) DO NOTHING;

-- 2) Listing trigger:
--    - company users: set organization_id (or fallback user_id) + ensure organizations row exists
--    - private users: keep organization_id NULL
CREATE OR REPLACE FUNCTION public.set_listing_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE profile_name text;
DECLARE profile_account_type text;
BEGIN
  SELECT p.full_name, p.account_type, p.organization_id
  INTO profile_name, profile_account_type, NEW.organization_id
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF COALESCE(profile_account_type, 'private') = 'company' THEN
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := NEW.user_id;
    END IF;
  ELSE
    -- Private sellers should not carry tenant id on listings.
    NEW.organization_id := NULL;
  END IF;

  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.organizations (id, name, slug)
    VALUES (
      NEW.organization_id,
      COALESCE(NULLIF(trim(profile_name), ''), 'Organization ' || substr(NEW.organization_id::text, 1, 8)),
      'org-' || replace(NEW.organization_id::text, '-', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) listing_views trigger:
--    - inherit org from listing when available
--    - otherwise, only company seller gets org fallback
--    - private sellers keep NULL organization_id
CREATE OR REPLACE FUNCTION public.set_listing_view_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE seller_account_type text;
DECLARE seller_org_id uuid;
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT l.organization_id
    INTO NEW.organization_id
    FROM public.listings l
    WHERE l.id = NEW.listing_id;

    IF NEW.organization_id IS NULL THEN
      SELECT p.account_type, p.organization_id
      INTO seller_account_type, seller_org_id
      FROM public.profiles p
      WHERE p.id = NEW.seller_id;

      IF COALESCE(seller_account_type, 'private') = 'company' THEN
        NEW.organization_id := COALESCE(seller_org_id, NEW.seller_id);
      ELSE
        NEW.organization_id := NULL;
      END IF;
    END IF;
  END IF;

  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.organizations (id, name, slug)
    VALUES (
      NEW.organization_id,
      'Organization ' || substr(NEW.organization_id::text, 1, 8),
      'org-' || replace(NEW.organization_id::text, '-', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) leads trigger:
--    - inherit org from listing when available
--    - otherwise, only company seller gets org fallback
--    - private sellers keep NULL organization_id
CREATE OR REPLACE FUNCTION public.set_lead_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE seller_account_type text;
DECLARE seller_org_id uuid;
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT l.organization_id
    INTO NEW.organization_id
    FROM public.listings l
    WHERE l.id = NEW.listing_id;

    IF NEW.organization_id IS NULL THEN
      SELECT p.account_type, p.organization_id
      INTO seller_account_type, seller_org_id
      FROM public.profiles p
      WHERE p.id = NEW.seller_id;

      IF COALESCE(seller_account_type, 'private') = 'company' THEN
        NEW.organization_id := COALESCE(seller_org_id, NEW.seller_id);
      ELSE
        NEW.organization_id := NULL;
      END IF;
    END IF;
  END IF;

  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.organizations (id, name, slug)
    VALUES (
      NEW.organization_id,
      'Organization ' || substr(NEW.organization_id::text, 1, 8),
      'org-' || replace(NEW.organization_id::text, '-', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
