-- Ta bort alla testdata från listings-tabellen
-- VARNING: Detta tar bort ALLA data i tabellerna!

-- Ta bort i rätt ordning (på grund av foreign key constraints):
-- 1. Meddelanden (refererar till konversationer)
-- 2. Konversationer (refererar till listings)
-- 3. Listings

-- Alternativ 1: Ta bort ALLA data (rekommenderat om du bara har testdata)
DELETE FROM public.messages;
DELETE FROM public.conversations;
DELETE FROM public.listings;

-- Alternativ 2: Ta bort endast data med specifik user_id (om du har ersatt REPLACE_WITH_YOUR_ID)
-- DELETE FROM public.messages 
-- WHERE conversation_id IN (
--   SELECT id FROM public.conversations 
--   WHERE buyer_id = 'DITT_USER_ID_HÄR' OR seller_id = 'DITT_USER_ID_HÄR'
-- );
-- DELETE FROM public.conversations 
-- WHERE buyer_id = 'DITT_USER_ID_HÄR' OR seller_id = 'DITT_USER_ID_HÄR';
-- DELETE FROM public.listings WHERE user_id = 'DITT_USER_ID_HÄR';
