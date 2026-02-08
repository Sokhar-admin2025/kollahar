-- Alla får läsa sålda annonser (visas som "Såld" på annonssidan, ingen kontaktknapp).
create policy "Public read sold listings"
  on public.listings
  for select
  using (status = 'sold');
