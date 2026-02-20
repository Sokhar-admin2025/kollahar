-- Kör i Supabase SQL Editor
-- 1. Hitta namnet på din befintliga limit-trigger:
--    SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.listings'::regclass;
-- 2. Droppa den (ersätt TRIGGER_NAMN med det du hittade):
--    DROP TRIGGER IF EXISTS TRIGGER_NAMN ON public.listings;
-- 3. Kör resten nedan

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

  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'active' THEN
    active_count := active_count - 1;
  END IF;

  IF active_count >= max_limit THEN
    RAISE EXCEPTION 'MAX_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_listing_limit_trigger ON public.listings;
DROP TRIGGER IF EXISTS trigger_check_listing_limit ON public.listings;
DROP TRIGGER IF EXISTS listings_max_limit ON public.listings;

CREATE TRIGGER check_listing_limit_trigger
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE PROCEDURE public.check_listing_limit();
