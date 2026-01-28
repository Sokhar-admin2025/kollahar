-- Migration: Ersätt website med location i public.profiles
-- Datum: 2026-01-28

-- 1. Lägg till ny kolumn location (text)
alter table public.profiles
  add column if not exists location text;

-- 2. Migrera befintliga värden från website till location (om location är tom)
update public.profiles
set location = website
where location is null
  and website is not null;

-- 3. Ta bort gamla kolumnen website
alter table public.profiles
  drop column if exists website;

