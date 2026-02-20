# Flöden: Företagsregistrering & Upgrade (steg för steg)

Detta dokument beskriver exakt vad som händer i koden och i systemet för de två företagsflödena.

---

## 1. Företagsregistrering (nytt konto som företag)

**Var:** `/login` → flik "Skapa konto" → underflik "Företag"

### Steg 1: Användaren fyller i formuläret

- **Företagsnamn** (obligatoriskt)
- **Organisationsnummer** (obligatoriskt)
- **Webbplats** (obligatoriskt, t.ex. `foretag.se` eller `www.foretag.se`)
- **E-post** (måste ha samma domän som webbplatsen, t.ex. `info@foretag.se`)
- **Lösenord** (minst 8 tecken)
- **Jag godkänner villkoren** (checkbox, obligatorisk)

### Steg 2: Validering innan submit

- Alla fält ifyllda?
- E-post format giltigt? (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Lösenord ≥ `AUTH_CONFIG.MIN_PASSWORD_LENGTH` (8)?
- **Domänmatchning:** `validateDomainMatch(email, companyWebsite)`  
  - Webbplats normaliseras (bort med `https://`, `http://`, `www.`, ev. path)  
  - E-postens domän (del efter `@`) jämförs med webbplatsens domän (case-insensitive)  
  - Vid fel: feltext "E-postens domän måste matcha webbplatsens domän" och submit-knappen är disabled
- Villkor godkända?

Om något fel → meddelande visas, ingen anrop till backend.

### Steg 3: Submit → `handleCompanySignUp`

1. **SignOut** (rensar eventuell session).
2. **signUp** anropas:
   - `email`: trimmat e-post
   - `password`: användarens lösenord
   - `options.data`:
     - `full_name`: företagsnamn (trimmat)
     - `org_number`: orgnummer (trimmat)
     - `website`: normaliserad webbplats (utan protokoll/www, endast domän)
     - `account_type`: `'company'`
3. Om **signUp** ger fel (t.ex. e-post redan registrerad, för svagt lösenord) → felmeddelande visas, `setLoading(false)`, return.
4. **SignOut igen** (användaren ska inte vara inloggad före e-postverifiering).
5. **signInWithOtp** anropas:
   - `email`: samma e-post
   - `options.shouldCreateUser: false` (användaren finns redan från signUp)
   - Skickar 6-siffrig kod till e-posten.
6. Om OTP-sändning misslyckas (t.ex. rate limit) → felmeddelande, return.
7. **Redirect:**  
   `router.push(\`/login/verify?email=${encodeURIComponent(cleanEmail)}&type=signup\`)`

### Steg 4: Bakom kulisserna (Supabase)

- **auth.users:** Ny rad skapas med `email`, `encrypted_password`, `raw_user_meta_data` = `{ full_name, org_number, website, account_type }`.  
  E-post är **inte** bekräftad förrän användaren verifierar.
- **Trigger `handle_new_user`:** Vid INSERT i `auth.users` körs trigger som INSERT:ar i **public.profiles** med:
  - `id` = `new.id`
  - `full_name` = `raw_user_meta_data->>'full_name'`
  - `account_type` = `COALESCE(raw_user_meta_data->>'account_type', 'private')`
  - `website` = `raw_user_meta_data->>'website'`
  - `org_number` = `raw_user_meta_data->>'org_number'`

Så profilen får rätt status (`account_type = 'company'`) och företagsnamn direkt.

### Steg 5: Användaren på `/login/verify`

- E-post och `type=signup` kommer från URL.
- Användaren anger 6-siffrig kod från e-post.
- **verifyOtp** anropas → vid lyckad verifiering är e-posten bekräftad och användaren kan logga in med e-post + lösenord (samma som vid registrering).

---

## 2. Upgrade: Privat konto → Företagskonto

**Var:** `/dashboard/settings` (endast när `account_type !== 'company'`)

### Steg 1: Användaren ser kortet "Vill du sälja som företag?"

Fält (obligatoriska):

- **Företagsnamn**
- **Organisationsnummer**
- **Webbplats (domän)**
- **Ny företags-e-post** (måste matcha webbplatsens domän)

Fält (valfria):

- **Postnummer**, **Ort** – för slug och sök på plats (kan fyllas i senare i Inställningar)

### Steg 2: Validering

- Alla fyra fält ifyllda?
- **Domänmatchning:** `validateDomainMatch(upgradeEmail, upgradeWebsite)`  
  Vid fel: text "E-postens domän måste matcha webbplatsens domän." under e-postfältet.

### Steg 3: Submit → `handleUpgradeToCompany`

1. **supabase.auth.updateUser** anropas:
   - `email`: ny företags-e-post (trimmat)
   - `data`: `{ full_name, org_number, website, account_type: 'company' }`  
     (website normaliserat: utan protokoll/www, endast domän)
2. Om **updateUser** ger fel → felmeddelande, `setUpgradeSaving(false)`, return.
3. **profiles-uppdatering:**
   - `supabase.from('profiles').update({ full_name, org_number, website, account_type: 'company', otp_verified: false, updated_at }).eq('id', userId)`
   - **Triggrar:** `trigger_sync_profile_to_listings_seller_type` sätter `listings.seller_type = 'company'` för alla användarens annonser. `trigger_generate_profile_slug` genererar slug för företagsprofilen.
4. **signInWithOtp** – skickar 6-siffrig kod till ny e-post (`shouldCreateUser: false`).
5. **signOut()** – användaren loggas ut.
6. **Redirect:** `router.push('/login/verify?email=...&type=signup&from=upgrade')`

### Steg 4: På verifieringssidan

- Användaren anger 6-siffrig kod från e-post.
- **verifyOtp** validerar → vid lyckad verifiering sätts session (användaren loggas in automatiskt).
- **profiles.otp_verified** sätts till `true`.
- **Redirect:** `window.location.href = '/dashboard'`

Efter inloggning har användaren `account_type === 'company'`, listings har `seller_type = 'company'`, och inställningssidan visar **State B** (låsta org_number/website, redigerbara adress/postnummer/ort/bio).

**Databas-synk vid upgrade:**
- `trigger_sync_profile_to_listings_seller_type`: Uppdaterar `listings.seller_type` till `'company'` för alla annonser där `user_id` = den uppgraderade användaren. Säljarkort, filter och sortering använder denna kolumn.
- `trigger_generate_profile_slug`: Genererar `profiles.slug` från full_name + city för företagsprofiler (SEO/vänliga URL:er).

---

## 3. Inställningssidan efter upgrade (State B: Företag)

- **Skrivskyddade (gråa):** Företagsnamn, Organisationsnummer, Webbplats.
- **Redigerbara:** Adress, Postnummer, Ort, Bio.
- **Spara-knapp:** Text "Spara adress & bio"; uppdaterar `address`, `zip_code`, `city`, `bio`, **`location`** (och `updated_at`) i `profiles`.
  - **Location-synk:** Appen sätter `location` = `zip_code + ' ' + city` (eller bara `city` eller `address`) i samma update, så sök/filter på ort fungerar direkt. Dessutom kör triggern `trigger_sync_company_location` vid varje UPDATE på företagsprofil och fyller i `location` om någon uppdaterar raden på annat sätt.
- Consent-sektion (marknadsföring/analytics) visas inte för företag.
- Byt lösenord och Radera konto finns kvar.

---

## 4. Snabbreferens: viktiga filer

| Flöde              | Fil / plats |
|--------------------|-------------|
| Företagsregistrering | `app/login/LoginPageContent.tsx` → `handleCompanySignUp`, subflikar, domänvalidering, villkor-checkbox |
| Verifiering (OTP)  | `app/login/verify/VerifyPageContent.tsx` |
| Upgrade            | `app/dashboard/settings/page.tsx` → `handleUpgradeToCompany`, kort "Vill du sälja som företag?" |
| Domänvalidering    | `lib/utils.ts` → `validateDomainMatch` |
| Profil vid ny användare | `supabase/migrations/20260208100000_profiles_company_address_and_trigger.sql` → `handle_new_user()` |
| Meddelande efter upgrade | `app/login/LoginPageContent.tsx` → `searchParams.get('upgrade') === 'email_sent'` |
| Synk av företags ort till `location` (sök) | `supabase/migrations/20260209100000_sync_company_location.sql` → trigger + inställningssidan sätter `location` vid sparning |

---

## 5. Kör migrationer

Så att allt fungerar (företagsnamn i profil + location-synk för sök):

```bash
supabase db push
```

Eller kör manuellt i ordning:

1. `20260208100000_profiles_company_address_and_trigger.sql` – kolumner + `handle_new_user` (full_name, account_type, website, org_number).
2. `20260209100000_sync_company_location.sql` – trigger som sätter `location` från zip_code/city/address vid UPDATE på företagsprofil.
