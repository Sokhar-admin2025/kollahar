-- Phase 3.5: Smart Leads & Multi-User Support
-- Run this in Supabase SQL Editor.

-- 1. listings: contact_email, contact_name
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contact_name text;

COMMENT ON COLUMN public.listings.contact_email IS 'E-post för specifik säljare – används för lead-notiser';
COMMENT ON COLUMN public.listings.contact_name IS 'Namn på specifik säljare';

-- 2. profiles: is_admin, parent_organization_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_organization_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.is_admin IS 'true = huvuddealer, ser alla leads; false = säljare, ser endast egna';
COMMENT ON COLUMN public.profiles.parent_organization_id IS 'Pekar på huvuddealer – säljare har denna satt';
