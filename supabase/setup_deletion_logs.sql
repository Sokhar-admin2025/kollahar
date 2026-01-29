-- Skapar deletion_logs-tabellen + RLS enligt docs/02-BACKEND_DATABASE.md
-- Logg för borttagna annonser (analytics)

create table if not exists public.deletion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  ad_title text not null,
  created_at timestamptz default now()
);

alter table public.deletion_logs enable row level security;

-- RLS Policies

-- Endast ägare kan läsa sina egna raderingsloggar
create policy "Users read own deletion logs"
  on public.deletion_logs
  for select
  using (auth.uid() = user_id);

-- Endast ägare kan skapa raderingsloggar (endast sina egna)
create policy "Users create own deletion logs"
  on public.deletion_logs
  for insert
  with check (auth.uid() = user_id);

-- Loggar ska inte kunna uppdateras eller raderas (immutable)
-- Ingen update/delete policy = ingen kan ändra eller radera
