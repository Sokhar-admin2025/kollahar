-- E-postnotiser för nya meddelanden – användare kan stänga av i inställningar
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.email_notifications IS 'Skicka e-post vid nya meddelanden (kan stängas av i inställningar)';
