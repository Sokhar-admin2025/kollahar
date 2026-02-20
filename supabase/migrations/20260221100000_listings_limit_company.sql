-- Höj annonsgräns för företagskonton (bilhandlare behöver fler än 20)
-- Privat: 20 aktiva | Företag: 200 aktiva

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
  SELECT (SELECT account_type FROM public.profiles WHERE id = NEW.user_id) = 'company'
  INTO is_company;

  max_limit := CASE WHEN is_company THEN 200 ELSE 20 END;

  SELECT count(*) INTO active_count
  FROM public.listings
  WHERE user_id = NEW.user_id AND status = 'active';

  -- Vid UPDATE av befintlig aktiv rad: räkna inte den (vi ersätter, lägger inte till)
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'active' THEN
    active_count := active_count - 1;
  END IF;

  -- Vid UPDATE från sold/deleted till active: räkna som ny aktiv
  IF active_count >= max_limit THEN
    RAISE EXCEPTION 'MAX_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;

-- Ta bort alla triggers på listings som anropar funktioner med MAX_LIMIT_REACHED
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'public.listings'::regclass
      AND p.prosrc LIKE '%MAX_LIMIT_REACHED%'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.listings', r.tgname);
  END LOOP;
END $$;

CREATE TRIGGER check_listing_limit_trigger
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE PROCEDURE public.check_listing_limit();

COMMENT ON FUNCTION public.check_listing_limit() IS
  'Begränsar antal aktiva annonser: 20 för privat, 200 för företag';
