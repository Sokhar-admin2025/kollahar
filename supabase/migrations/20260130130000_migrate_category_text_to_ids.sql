-- Migration: Konvertera gamla textvärden i category till nya ID:n
-- Detta säkerställer att alla befintliga annonser använder det nya formatet

-- Mappning från gamla textvärden till nya ID:n
UPDATE public.listings
SET category = 'cars'
WHERE category IN ('Fordon', 'Bilar');

UPDATE public.listings
SET category = 'boats'
WHERE category = 'Båtar';

UPDATE public.listings
SET category = 'mc'
WHERE category = 'MC & Moped';

UPDATE public.listings
SET category = 'caravan'
WHERE category IN ('Husvagn & Husbil', 'Husvagn', 'Husbil');

UPDATE public.listings
SET category = 'vehicle_other'
WHERE category = 'Övrigt Fordon';

-- Hem & Inredning
UPDATE public.listings
SET category = 'furniture'
WHERE category IN ('Hem & Inredning', 'Möbler');

UPDATE public.listings
SET category = 'lighting'
WHERE category = 'Belysning';

UPDATE public.listings
SET category = 'garden'
WHERE category = 'Trädgård';

UPDATE public.listings
SET category = 'household'
WHERE category = 'Husgeråd';

-- Elektronik
UPDATE public.listings
SET category = 'computers'
WHERE category IN ('Elektronik', 'Datorer');

UPDATE public.listings
SET category = 'mobile'
WHERE category = 'Mobil';

UPDATE public.listings
SET category = 'audio_video'
WHERE category IN ('Ljud/Bild', 'Ljud', 'Bild');

UPDATE public.listings
SET category = 'gaming'
WHERE category = 'Gaming';

-- Kläder & Accessoarer
UPDATE public.listings
SET category = 'clothes'
WHERE category IN ('Kläder & Accessoarer', 'Kläder');

UPDATE public.listings
SET category = 'shoes'
WHERE category = 'Skor';

UPDATE public.listings
SET category = 'accessories'
WHERE category = 'Accessoarer';

UPDATE public.listings
SET category = 'kids'
WHERE category = 'Barn';

-- Fritid & Hobby
UPDATE public.listings
SET category = 'sports'
WHERE category IN ('Fritid & Hobby', 'Sport');

UPDATE public.listings
SET category = 'outdoor'
WHERE category = 'Friluft';

UPDATE public.listings
SET category = 'music'
WHERE category = 'Musik';

UPDATE public.listings
SET category = 'collectibles'
WHERE category = 'Samlar';

-- Övrigt (sista, så inget annat matchar)
UPDATE public.listings
SET category = 'other'
WHERE category = 'Övrigt';

-- Logga hur många rader som uppdaterades (för verifiering)
DO $$
DECLARE
  total_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_updated
  FROM public.listings
  WHERE category IN (
    'cars', 'boats', 'mc', 'caravan', 'vehicle_other',
    'furniture', 'lighting', 'garden', 'household',
    'computers', 'mobile', 'audio_video', 'gaming',
    'clothes', 'shoes', 'accessories', 'kids',
    'sports', 'outdoor', 'music', 'collectibles',
    'other'
  );
  
  RAISE NOTICE 'Migration klar. Totalt % annonser använder nu nya kategori-ID:n.', total_updated;
END $$;
