-- Migration: Backfill dedikerade kolumner för bilar-annonser
-- Syfte: Befintliga bilar-annonser saknar mileage/fuel_type/transmission i
--        dedikerade kolumner — data finns i attributes (JSONB).
--        Nya och redigerade annonser skrivs korrekt via bilar-listings-service.ts.
-- Påverkan: Icke-destruktiv UPDATE. Rör bara rader där source_site = 'bilar'
--           och minst ett av de tre fälten saknas.

UPDATE listings
SET
  mileage = NULLIF(
    regexp_replace(attributes->>'mileage', '[^0-9]', '', 'g'),
    ''
  )::numeric,

  fuel_type = NULLIF(trim(attributes->>'fuel_type'), ''),

  transmission = NULLIF(trim(attributes->>'gearbox'), '')

WHERE source_site = 'bilar'
  AND (
    mileage      IS NULL OR
    fuel_type    IS NULL OR
    transmission IS NULL
  );
