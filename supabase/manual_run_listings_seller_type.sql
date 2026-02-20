-- Säljartyp på annonser: särskilj företag vs privatperson för filter och sortering
-- Kör i Supabase SQL Editor om migration inte körts automatiskt

-- 1. Säkerställ att profiler utan account_type får 'private'
UPDATE public.profiles
SET account_type = 'private'
WHERE account_type IS NULL;

-- 2. Lägg till seller_type på listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS seller_type text;

-- 3. Backfill befintliga annonser från profiles
UPDATE public.listings l
SET seller_type = COALESCE(
  (SELECT p.account_type FROM public.profiles p WHERE p.id = l.user_id),
  'private'
)
WHERE l.seller_type IS NULL;

-- 4. Default och constraint
ALTER TABLE public.listings
  ALTER COLUMN seller_type SET DEFAULT 'private';

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_seller_type_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_seller_type_check CHECK (seller_type IN ('private', 'company'));

-- 5. Sätt NOT NULL efter backfill
UPDATE public.listings SET seller_type = 'private' WHERE seller_type IS NULL;
ALTER TABLE public.listings ALTER COLUMN seller_type SET NOT NULL;

COMMENT ON COLUMN public.listings.seller_type IS 'Säljartyp – private eller company; synkad med profiles.account_type';

CREATE INDEX IF NOT EXISTS idx_listings_seller_type ON public.listings(seller_type);

-- 6. Trigger: sätt seller_type vid INSERT från profiles
CREATE OR REPLACE FUNCTION public.sync_listing_seller_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  at text;
BEGIN
  SELECT account_type INTO at FROM public.profiles WHERE id = NEW.user_id;
  NEW.seller_type := COALESCE(NULLIF(at, ''), 'private');
  IF NEW.seller_type NOT IN ('private', 'company') THEN
    NEW.seller_type := 'private';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_listing_seller_type ON public.listings;
CREATE TRIGGER trigger_sync_listing_seller_type
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_listing_seller_type();

-- 7. Synka listings när användaren ändrar account_type (uppgradering privat → företag)
CREATE OR REPLACE FUNCTION public.sync_profile_account_type_to_listings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
    UPDATE public.listings
    SET seller_type = CASE
      WHEN NEW.account_type = 'company' THEN 'company'
      ELSE 'private'
    END
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_profile_to_listings_seller_type ON public.profiles;
CREATE TRIGGER trigger_sync_profile_to_listings_seller_type
  AFTER UPDATE OF account_type ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_account_type_to_listings();
