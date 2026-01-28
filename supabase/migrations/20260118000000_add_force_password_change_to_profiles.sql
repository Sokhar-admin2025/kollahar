-- Lägg till flagga för att tvinga lösenordsbyte efter återställningslänk

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.force_password_change IS 'Om användaren är tvingad att byta lösenord efter återställning.';

