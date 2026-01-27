-- Migration: Lägg till kolumner för välkomst-popup spårning
-- Detta gör att vi kan spåra när användare ser popupen och om de stängt den permanent

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS welcome_popup_dismissed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_popup_last_shown timestamptz,
ADD COLUMN IF NOT EXISTS welcome_popup_view_count integer DEFAULT 0;

-- Kommentarer för dokumentation
COMMENT ON COLUMN public.profiles.welcome_popup_dismissed IS 'Om användaren har stängt popupen permanent';
COMMENT ON COLUMN public.profiles.welcome_popup_last_shown IS 'När popupen senast visades';
COMMENT ON COLUMN public.profiles.welcome_popup_view_count IS 'Antal gånger popupen har visats (för UX-analys)';
