create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  website text,
  avatar_url text,
  consent_marketing boolean not null default false,
  consent_analytics boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Triggerfunktion: Skapa profil automatiskt när en ny användare registreras
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- RLS-policies

-- Alla får läsa profiler
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

-- Endast användaren själv får uppdatera sin profil
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

