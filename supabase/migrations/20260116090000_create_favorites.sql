create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;

create policy "Favorites are viewable by owner"
  on public.favorites
  for select
  using (auth.uid() = user_id);

create policy "Favorites are insertable by owner"
  on public.favorites
  for insert
  with check (auth.uid() = user_id);

create policy "Favorites are deletable by owner"
  on public.favorites
  for delete
  using (auth.uid() = user_id);
