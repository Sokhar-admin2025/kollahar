-- Aktivera Realtime för listing_views så att Dealer Dashboard uppdateras vid nya visningar
-- Krävs för postgres_changes subscription på listing_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_views;
