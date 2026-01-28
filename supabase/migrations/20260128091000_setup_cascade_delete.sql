-- Säkerställ ON DELETE CASCADE för användarrelaterade tabeller
-- Datum: 2026-01-28

-- 1. Uppdatera profiles → auth.users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2. Uppdatera listings.user_id → auth.users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'listings_user_id_fkey'
      AND table_name = 'listings'
  ) THEN
    ALTER TABLE public.listings
      DROP CONSTRAINT listings_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

