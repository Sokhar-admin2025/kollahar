-- Krävs för upsert vid import: PostgREST/Supabase behöver en UNIQUE CONSTRAINT (inte bara partial index)
-- för ON CONFLICT (user_id, external_id)

DROP INDEX IF EXISTS public.idx_listings_external_id_user;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_user_external_id_unique UNIQUE (user_id, external_id);

COMMENT ON CONSTRAINT listings_user_external_id_unique ON public.listings IS
  'Unikt per användare + externt ID – används för upsert vid CSV-import';
