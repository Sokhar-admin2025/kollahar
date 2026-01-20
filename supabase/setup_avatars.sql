-- Skapa avatars-bucket + grundläggande RLS-policys

-- 1. Själva bucketen (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Policies för avatars-objekt
-- Obs: RLS är normalt redan aktiverat på storage.objects i Supabase-projekt.

-- Alla får läsa avatar-bilder
create policy "Avatars are publicly accessible"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Endast autentiserade användare får ladda upp
create policy "Authenticated users can upload avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

-- Användare får bara ta bort sina egna avatarer
create policy "Users can delete own avatars"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() = owner
  );

