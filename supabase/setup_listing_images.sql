-- Skapa listing-images-bucket + grundläggande RLS-policys
-- Enligt docs/02-BACKEND_DATABASE.md

-- 1. Själva bucketen (idempotent)
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- 2. Policies för listing-images-objekt
-- Obs: RLS är normalt redan aktiverat på storage.objects i Supabase-projekt.

-- Alla får läsa listing-bilder (public bucket)
create policy "Listing images are publicly accessible"
  on storage.objects
  for select
  using (bucket_id = 'listing-images');

-- Endast autentiserade användare får ladda upp
create policy "Authenticated users can upload listing images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
  );

-- Användare får bara ta bort sina egna bilder (baserat på path som innehåller user_id)
-- Path-format: {user_id}/{timestamp}-{random}.{ext}
create policy "Users can delete own listing images"
  on storage.objects
  for delete
  using (
    bucket_id = 'listing-images'
    and (
      -- Kontrollera om path börjar med användarens ID
      (storage.foldername(name))[1] = auth.uid()::text
      or auth.uid() = owner
    )
  );
