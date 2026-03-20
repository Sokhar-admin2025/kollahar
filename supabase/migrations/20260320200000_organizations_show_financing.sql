-- Migration: organizations.show_financing
-- Syfte: Aktivera finansieringsmodul per handlare på annonsdetaljsidan.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS show_financing boolean NOT NULL DEFAULT false;
NOTIFY pgrst, 'reload schema';
