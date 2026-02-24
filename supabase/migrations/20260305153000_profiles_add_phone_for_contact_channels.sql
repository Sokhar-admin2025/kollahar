-- Add optional profile phone used by private listing contact toggles.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text;
