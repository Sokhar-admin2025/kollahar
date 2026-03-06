-- Fix: listings_limit_company ska inte trigga när en annons går från active -> sold/deleted/draft.
-- Den ska endast begränsa när NEW.status = 'active' (nya eller återaktiverade annonser).

CREATE OR REPLACE FUNCTION public.check_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count int;
  max_limit int;
  is_company boolean;
BEGIN
  -- Hämta om användaren är företag
  SELECT (SELECT account_type FROM public.profiles WHERE id = NEW.user_id) = 'company'
  INTO is_company;

  max_limit := CASE WHEN is_company THEN 200 ELSE 20 END;

  -- Räkna nuvarande aktiva annonser för användaren
  SELECT count(*) INTO active_count
  FROM public.listings
  WHERE user_id = NEW.user_id AND status = 'active';

  -- Om den nya statusen INTE är 'active' (t.ex. 'sold', 'draft', 'deleted') så
  -- är vi på väg att minska eller behålla antalet aktiva – begränsningen ska inte gälla.
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Vid UPDATE av befintlig aktiv rad som förblir aktiv: räkna inte den två gånger.
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    active_count := active_count - 1;
  END IF;

  -- Om vi redan är vid/på gränsen och försöker skapa/återaktivera ytterligare en aktiv annons → blockera.
  IF active_count >= max_limit THEN
    RAISE EXCEPTION 'MAX_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_listing_limit() IS
  'Begränsar antal aktiva annonser: 20 för privat, 200 för företag. Uppdatering till icke-aktiva statusar (t.ex. sold/draft) påverkas inte.';

