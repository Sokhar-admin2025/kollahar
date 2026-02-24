-- Privacy-first contact controls for listings.
-- Private sellers can choose chat/phone/email per listing.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contact_via_chat boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_phone text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listings_at_least_one_contact_channel'
      AND conrelid = 'public.listings'::regclass
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_at_least_one_contact_channel
      CHECK (contact_via_chat OR show_phone OR show_email);
  END IF;
END $$;

COMMENT ON COLUMN public.listings.contact_via_chat IS 'Om chat via plattformen är tillåten för annonsen.';
COMMENT ON COLUMN public.listings.show_phone IS 'Om säljarens telefonnummer ska visas publikt för annonsen.';
COMMENT ON COLUMN public.listings.show_email IS 'Om säljarens e-postadress ska visas publikt för annonsen.';
COMMENT ON COLUMN public.listings.contact_phone IS 'Annons-specifikt telefonnummer. Kan vara null för dataminimering.';
