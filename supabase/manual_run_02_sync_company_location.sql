-- Skript 2: Location-synk för företag
-- Kopiera HELA filens innehåll (Ctrl+A) och klistra in i Supabase SQL Editor. Inga ``` eller annan text.

CREATE OR REPLACE FUNCTION public.sync_company_location_to_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.account_type = 'company' THEN
    NEW.location := COALESCE(
      NULLIF(trim(COALESCE(NEW.zip_code, '') || ' ' || COALESCE(NEW.city, '')), ''),
      NEW.city,
      NEW.address
    );
  END IF;
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.sync_company_location_to_location() IS
  'Sätter profiles.location från zip_code/city/address när account_type = company, så sök på ort fungerar.';

CREATE TRIGGER trigger_sync_company_location
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.account_type = 'company')
  EXECUTE PROCEDURE sync_company_location_to_location();
