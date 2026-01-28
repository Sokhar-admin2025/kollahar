-- Migration: Lägg till otp_verified-flagga i public.profiles
-- Syfte: Förhindra inloggning med konto som inte verifierats via 6-siffrig OTP

-- 1. Lägg till kolumnen om den saknas
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS otp_verified boolean;

-- 2. Sätt befintliga profiler som verifierade (bakåtkompatibilitet)
UPDATE public.profiles
SET otp_verified = true
WHERE otp_verified IS NULL;

-- 3. Sätt default till false för nya profiler
ALTER TABLE public.profiles
ALTER COLUMN otp_verified SET DEFAULT false;

-- 4. Gör kolumnen NOT NULL
ALTER TABLE public.profiles
ALTER COLUMN otp_verified SET NOT NULL;

