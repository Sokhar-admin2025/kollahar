# Så kör du migrationerna (företag + location-synk)

Välj **ett** av sätten nedan.

---

## Alternativ A: Supabase CLI (rekommenderat)

I terminalen, från projektets rot (mappen där `supabase/` ligger):

```bash
supabase db push
```

Detta applicerar alla migrationer som ännu inte körts mot din länkade Supabase-projekt. Inget behöver kopieras manuellt.

---

## Alternativ B: Köra SQL manuellt i Supabase

Om du **inte** använder CLI: öppna **Supabase Dashboard** → ditt projekt → **SQL Editor**. Kör sedan **två** skript i ordning.

**Viktigt:** Kopiera **bara** SQL-koden – **inte** raderna med \`\`\` (tre backticks). Enklast är att använda de färdiga filerna:
- **Skript 1:** Öppna `supabase/manual_run_01_profiles_company.sql` → Markera allt (Ctrl+A / Cmd+A) → Kopiera → Klistra in i SQL Editor → Run.
- **Skript 2:** Öppna `supabase/manual_run_02_sync_company_location.sql` → samma sak.

### 1. Första skriptet (profiles-kolumner + handle_new_user)

Eller kopiera blocket nedan – **exkludera** raden \`\`\`sql och sista raden \`\`\` – klicka **Run**.

```sql
-- Adress och bio för profiler (företag och privat)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zip_code text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.profiles.address IS 'Gatuadress (valfritt)';
COMMENT ON COLUMN public.profiles.zip_code IS 'Postnummer';
COMMENT ON COLUMN public.profiles.city IS 'Ort';
COMMENT ON COLUMN public.profiles.bio IS 'Kort beskrivning (t.ex. företagsbio)';

-- Uppdatera handle_new_user så att full_name, account_type, website, org_number kopieras från auth.users.raw_user_meta_data vid registrering
-- (Använder $fn$ istället för $$ så att Supabase SQL Editor inte tolkar dollar-quote fel.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    account_type,
    website,
    org_number
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'account_type', 'private'),
    new.raw_user_meta_data->>'website',
    new.raw_user_meta_data->>'org_number'
  );
  RETURN new;
END;
$fn$;
```

### 2. Andra skriptet (location-synk för företag)

Öppna **igen** SQL Editor (eller ny query), kopiera och klistra in nedan, klicka **Run**.

```sql
-- Synka företagets adress (zip_code, city, address) till location vid UPDATE
-- (Använder $fn$ så att Supabase SQL Editor inte tolkar dollar-quote fel.)
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
```

---

## Kontroll

- Efter **första** skriptet: tabellen `public.profiles` har kolumnerna `address`, `zip_code`, `city`, `bio`, och funktionen `handle_new_user` sätter `full_name`, `account_type`, `website`, `org_number` vid ny användare.
- Efter **andra** skriptet: vid UPDATE på en företagsprofil fylls `location` automatiskt från `zip_code`/`city`/`address`.

Du behöver **inte** köra någon annan migration manuellt för företagsflödena om du kör dessa två.

**Valfritt (inställningar företag):** För fältet "Kontaktperson" i Inställningar behövs kolumnen `contact_person` på `profiles`. Kör i SQL Editor:

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_person text;
COMMENT ON COLUMN public.profiles.contact_person IS 'Kontaktperson (t.ex. för företagskonto).';
```
