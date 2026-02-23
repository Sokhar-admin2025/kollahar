-- Step 1.4: Vehicle-agnostic listing columns for high-performance filtering
-- Keeps attributes JSONB for compatibility, but promotes key fields to typed columns.

-- 1) Dedicated columns (category + price already exist)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS mileage integer,
  ADD COLUMN IF NOT EXISTS engine_hours integer,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS engine_power integer,
  ADD COLUMN IF NOT EXISTS length_cm integer;

-- Price is already dedicated; widen to bigint for future-proofing.
ALTER TABLE public.listings
  ALTER COLUMN price TYPE bigint
  USING price::bigint;

-- 2) Backfill from attributes JSONB.
-- Mapping rules:
-- - mileage: attributes.mileage OR attributes.mil OR attributes."mätarställning"
-- - engine_hours: attributes.engine_hours OR attributes."gångtimmar"
-- - length_cm: attributes.length_cm OR attributes."längd"
UPDATE public.listings
SET
  make = COALESCE(
    make,
    NULLIF(TRIM(attributes->>'make'), '')
  ),
  model = COALESCE(
    model,
    NULLIF(TRIM(attributes->>'model'), '')
  ),
  year = COALESCE(
    year,
    CASE
      WHEN NULLIF(regexp_replace(COALESCE(attributes->>'year', attributes->>'model_year', ''), '[^0-9]', '', 'g'), '') IS NULL THEN NULL
      ELSE regexp_replace(COALESCE(attributes->>'year', attributes->>'model_year', ''), '[^0-9]', '', 'g')::integer
    END
  ),
  mileage = COALESCE(
    mileage,
    CASE
      WHEN NULLIF(regexp_replace(COALESCE(attributes->>'mileage', attributes->>'mil', attributes->>'mätarställning', attributes->>'matarstallning', ''), '[^0-9]', '', 'g'), '') IS NULL THEN NULL
      ELSE regexp_replace(COALESCE(attributes->>'mileage', attributes->>'mil', attributes->>'mätarställning', attributes->>'matarstallning', ''), '[^0-9]', '', 'g')::integer
    END
  ),
  engine_hours = COALESCE(
    engine_hours,
    CASE
      WHEN NULLIF(regexp_replace(COALESCE(attributes->>'engine_hours', attributes->>'gångtimmar', attributes->>'gangtimmar', ''), '[^0-9]', '', 'g'), '') IS NULL THEN NULL
      ELSE regexp_replace(COALESCE(attributes->>'engine_hours', attributes->>'gångtimmar', attributes->>'gangtimmar', ''), '[^0-9]', '', 'g')::integer
    END
  ),
  fuel_type = COALESCE(
    fuel_type,
    NULLIF(TRIM(COALESCE(attributes->>'fuel_type', attributes->>'fuel')), '')
  ),
  transmission = COALESCE(
    transmission,
    NULLIF(TRIM(COALESCE(attributes->>'transmission', attributes->>'gearbox', attributes->>'drive_type')), '')
  ),
  engine_power = COALESCE(
    engine_power,
    CASE
      WHEN NULLIF(regexp_replace(COALESCE(attributes->>'engine_power', attributes->>'horse_power', attributes->>'hp', attributes->>'kw', ''), '[^0-9]', '', 'g'), '') IS NULL THEN NULL
      ELSE regexp_replace(COALESCE(attributes->>'engine_power', attributes->>'horse_power', attributes->>'hp', attributes->>'kw', ''), '[^0-9]', '', 'g')::integer
    END
  ),
  length_cm = COALESCE(
    length_cm,
    CASE
      WHEN NULLIF(regexp_replace(COALESCE(attributes->>'length_cm', attributes->>'längd', attributes->>'langd', attributes->>'length', ''), '[^0-9]', '', 'g'), '') IS NULL THEN NULL
      ELSE regexp_replace(COALESCE(attributes->>'length_cm', attributes->>'längd', attributes->>'langd', attributes->>'length', ''), '[^0-9]', '', 'g')::integer
    END
  )
WHERE attributes IS NOT NULL;

-- 3) Performance indexes (B-tree)
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_make ON public.listings(make);
CREATE INDEX IF NOT EXISTS idx_listings_model ON public.listings(model);
CREATE INDEX IF NOT EXISTS idx_listings_year ON public.listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
