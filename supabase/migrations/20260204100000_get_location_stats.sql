-- RPC: Returnerar antal aktiva annonser per location, med valfria filter (kategori, sökfråga).
-- listnings.location är text, t.ex. "Täby, Stockholms län" (kommun, län).
-- Frontend skickar category_filter (t.ex. 'cars') och/eller search_query så att siffrorna matchar valda filter.

create or replace function public.get_location_stats(
  category_filter text default null,
  search_query text default null
)
returns table (location_value text, count integer)
language sql
stable
security definer
set search_path = public
as $$
  select location as location_value, count(*)::integer as count
  from public.listings
  where status = 'active'
    and (coalesce(category_filter, '') = '' or category = category_filter)
    and (
      coalesce(search_query, '') = ''
      or title ilike '%' || search_query || '%'
      or description ilike '%' || search_query || '%'
    )
  group by location;
$$;

comment on function public.get_location_stats(text, text) is
  'Antal annonser per område. category_filter: t.ex. cars. search_query: fritext för title/description.';
