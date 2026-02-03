-- Migration: Uppdatera dummy-data för att fungera med ny struktur (JSONB attributes och kategori-ID:n)
-- Kör detta script i Supabase SQL Editor för att uppdatera befintlig dummy-data

-- 1. Mappa om kategorier till ID:n
UPDATE public.listings
SET category = CASE
  WHEN category IN ('Fordon', 'Bilar') THEN 'cars'
  WHEN category IN ('Möbler', 'Hem & Inredning') THEN 'furniture'
  WHEN category = 'Elektronik' THEN 'computers'  -- Standardiserar till 'computers' för elektronik
  WHEN category = 'Kläder' THEN 'clothes'
  ELSE 'other'
END
WHERE category IN ('Fordon', 'Bilar', 'Möbler', 'Hem & Inredning', 'Elektronik', 'Kläder')
   OR category NOT IN (
     'cars', 'boats', 'mc', 'caravan', 'vehicle_other',
     'furniture', 'lighting', 'garden', 'household',
     'computers', 'mobile', 'audio_video', 'gaming',
     'clothes', 'shoes', 'accessories', 'kids',
     'sports', 'outdoor', 'music', 'collectibles',
     'other'
   );

-- 2. Generera JSONB attributes för Bilar (cars)
-- Använder CASE statements för att säkerställa korrekt slumpning
UPDATE public.listings
SET 
  attributes = jsonb_build_object(
    'make', CASE floor(random() * 4)::int
      WHEN 0 THEN 'Volvo'
      WHEN 1 THEN 'Volkswagen'
      WHEN 2 THEN 'BMW'
      WHEN 3 THEN 'Audi'
    END,
    'model', 'Testbil',
    'year', (floor(random() * (2024 - 2010 + 1))::int + 2010),
    'mileage', (floor(random() * (25000 - 1000 + 1))::int + 1000),
    'fuel', CASE floor(random() * 3)::int
      WHEN 0 THEN 'Bensin'
      WHEN 1 THEN 'Diesel'
      WHEN 2 THEN 'El'
    END,
    'gearbox', CASE floor(random() * 2)::int
      WHEN 0 THEN 'Automat'
      WHEN 1 THEN 'Manuell'
    END
  ),
  price = (floor(random() * (400000 - 50000 + 1))::int + 50000)
WHERE category = 'cars';

-- 3. Generera enkla attributes för övriga kategorier
UPDATE public.listings
SET attributes = jsonb_build_object(
  'condition', CASE floor(random() * 3)::int
    WHEN 0 THEN 'Ny'
    WHEN 1 THEN 'Begagnad'
    WHEN 2 THEN 'Sliten'
  END
)
WHERE category != 'cars' 
  AND (attributes IS NULL OR attributes = '{}'::jsonb);

-- Verifiering: Visa resultat (valfritt - kommentera bort om du inte vill se detta)
-- SELECT 
--   category,
--   COUNT(*) as count,
--   jsonb_object_keys(attributes) as attribute_keys
-- FROM public.listings
-- GROUP BY category, jsonb_object_keys(attributes)
-- ORDER BY category, attribute_keys;
