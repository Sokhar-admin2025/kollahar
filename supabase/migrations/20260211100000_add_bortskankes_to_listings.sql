-- Bortskänkes: annonser som ges bort gratis
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS bortskankes boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.bortskankes IS 'Om true visas "Bortskänkes" istället för pris; pris sparas som 0.';
