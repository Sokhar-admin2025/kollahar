-- Debug: Kontrollera listing_views
-- Kör i Supabase SQL Editor för att se om rader finns och om seller_id är ifylld

-- 0. Aktivera Realtime för listing_views (så dashboard uppdateras vid nya visningar)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_views;

-- 1. Antal rader totalt
SELECT COUNT(*) AS total_rows FROM public.listing_views;

-- 2. Senaste 10 rader (kolla seller_id)
SELECT id, listing_id, seller_id, viewer_id, created_at
FROM public.listing_views
ORDER BY created_at DESC
LIMIT 10;

-- 3. Rader med tom seller_id (bugg?)
SELECT COUNT(*) AS rows_with_null_seller
FROM public.listing_views
WHERE seller_id IS NULL;

-- 4. Listings för dealer (ersätt med din user_id)
-- SELECT id, title, status, user_id, contact_email FROM public.listings WHERE user_id = '960c4659-26eb-4aec-8055-bb76f0d8793f';
