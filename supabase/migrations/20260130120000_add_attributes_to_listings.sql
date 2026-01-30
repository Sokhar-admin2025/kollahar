alter table public.listings
  add column if not exists attributes jsonb not null default '{}'::jsonb;
