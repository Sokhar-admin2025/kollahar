-- Användare ska kunna se alla egna annonser (aktiva + sålda) för Dashboard Historik-fliken.
-- Befintlig policy "Public read active ads" behålls för alla att läsa aktiva annonser.

create policy "Users can view all own listings"
  on public.listings
  for select
  using (auth.uid() = user_id);
