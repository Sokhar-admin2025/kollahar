-- Skapar listings-tabellen + RLS enligt docs/02-BACKEND_DATABASE.md

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  price integer not null,
  location text not null,
  category text not null,
  images text[] default '{}',
  status text not null default 'active' check (status in ('active', 'sold', 'deleted')),
  created_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.listings enable row level security;

-- RLS Policies

-- Alla får läsa aktiva annonser (public read)
create policy "Public read active ads"
  on public.listings
  for select
  using (status = 'active');

-- Autentiserade användare kan skapa annonser (endast sina egna)
create policy "Auth users create ads"
  on public.listings
  for insert
  with check (auth.uid() = user_id);

-- Ägare kan uppdatera sina egna annonser
create policy "Owners update own ads"
  on public.listings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ägare kan ta bort sina egna annonser
create policy "Owners delete own ads"
  on public.listings
  for delete
  using (auth.uid() = user_id);
