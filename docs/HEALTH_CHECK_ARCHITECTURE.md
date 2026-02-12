# Health Check & Arkitektur-analys

*Rapport för extern arkitekt. Genererad utifrån kodgenomsökning av Auth, Create Listing, listing-service och databas/Supabase.*

---

## 1. Projektstruktur

```
app/
├── api/                    # API-routes (listings, delete-account)
├── components/             # UI-komponenter (CreateListingForm, Header, LocationFilter, …)
├── dashboard/              # Skyddad area (create, edit/[id], favorites, messages, settings)
├── login/                  # Inloggning (LoginPageContent, verify)
├── reset-password/
├── annons/[id]/            # Offentlig annonsdetalj
├── page.tsx, HomePageClient.tsx
lib/
├── features/
│   ├── listings/           # listing-service (getListings, getListingById), price-utils
│   └── location/           # location-service (getLocationStats)
├── supabase/               # client.ts (browser), server.ts (cookies), admin.ts (service role)
├── categories.ts, swedish-locations.ts, …
components/
├── ui/                     # shadcn (button, command, popover, …)
└── listings/filters/       # PriceInput m.m.
supabase/
├── migrations/             # get_location_stats, …
├── setup_*.sql             # Tabeller + RLS (listings, profiles, favorites, …)
middleware.ts               # Route protection, session refresh
```

---

## 2. Auth-flöde

### Hur hanteras inloggning?
- **Custom form**, inte Supabase Auth UI.  
- **Filer:** `app/login/page.tsx` → `app/login/LoginPageContent.tsx` (client).  
- Inloggning: `supabase.auth.signInWithPassword({ email, password })`.  
- Registrering: `supabase.auth.signUp({ email, password })` med e-postbekräftelse; användaren skickas till `/login/verify` för OTP.  
- Lösenordsåterställning: `app/reset-password/page.tsx` med `supabase.auth.updateUser({ password })` (efter t.ex. magic link).  
- Tvingat lösenordsbyte: middleware läser `profiles.force_password_change` och redirectar till `/reset-password` om satt.  
- **UX:** På `/reset-password` visas header som utloggad (Header.tsx: `showAsLoggedOut`), så användaren inte upplevs som inloggad under lösenordsåterställning.
- **Chatt:** Inbox visar "Annonsrubrik – med (namn)"; tre-punkts-menyn med "Radera chatt" (soft delete via `user_hidden_conversations`).

### Använder vi Middleware för att skydda rutter?
- **Ja.** `middleware.ts` använder `@supabase/ssr` `createServerClient` med request/response-cookies.  
- **Skyddade prefix:** `pathname.startsWith('/dashboard')` och `pathname.startsWith('/fav')`.  
- Vid **fel** från `supabase.auth.getUser()` på skyddad rutt → redirect till `/login`.  
- Inloggad användare på `/login` → redirect till `/dashboard`.  
- Oinloggade användare som försöker nå skyddade rutter omdirigeras till `/login` (`isProtected && (error || !user)`).

### Var sparas användarens session?
- **Supabase Auth** med **cookies** (hanteras av `@supabase/ssr`).  
- Middleware och `lib/supabase/server.ts` använder `cookies()` / `request.cookies` för att läsa/skriva session.  
- Klienten använder `createBrowserClient` från `@/lib/supabase/client` (samma cookies).

---

## 3. Skapa Annons-flöde

### Vilka filer är inblandade?
- **Sida:** `app/dashboard/create/page.tsx` (client) – renderar bara `CreateListingForm` + Header.  
- **Formulär:** `app/components/CreateListingForm.tsx` (client).  
- **Server Actions:** `app/actions/listing-actions.ts` – `createListingAction(data)` och `updateListingAction(data)`; validerar med Zod, kräver inloggad användare, anropar listing-service och returnerar `{ success, data?: { id }, error?, fieldErrors? }`.  
- **Validering:** `lib/validators/listing-schema.ts` – `insertListingSchema` och `updateListingSchema` (Zod) med svenska felmeddelanden; pris ≥ 0, titel 3–100 tecken, beskrivning 10–5000, kategori och plats min 1 tecken; `images` och `attributes` valfria.  
- **Service:** `lib/features/listings/listing-service.ts` – `createListing(data, userId)` och `updateListing(data, userId)` med server-Supabase; returnerar `ServiceResult<{ id: string }>`.  
- **Dataflöde:** Klienten bygger payload (inkl. bilduppladdning till Storage på klienten), anropar create/update Server Action; insert/update mot `listings` sker på servern.  
- Redigering: `app/dashboard/edit/[id]/page.tsx` hämtar annonsen (client `createClient`) och skickar `initialData` till `CreateListingForm`.

### Hur valideras datan?
- **Zod** i `lib/validators/listing-schema.ts`: titel (min 3, max 100), beskrivning (min 10, max 5000), pris (coerce, min 0), kategori och plats (min 1 tecken); images och attributes valfria.  
- **Klient:** CreateListingForm har state `errors`; vid submit anropas create/update Server Action; vid `!result.success` sätts `setErrors({ ...result.fieldErrors, _form: [result.error] })` så att röd ram och feltext visas per fält. För bilar krävs även märke, modell, bränsle, växellåda, årsmodell och miltal (klientvalidering + visuell feedback).  
- **Skick (condition)** är **valfritt** för icke-fordon; **Växellåda** är obligatoriskt för bilar och placerat under Drivmedel.  
- **Servern** validerar all create/update-data med Zod innan anrop till listing-service; RLS kräver `auth.uid() = user_id`.

### Hur hanteras bilduppladdning?
- **Klient:** `browser-image-compression` (max 1 MB, max 1920 px) innan upload.  
- Filer laddas upp till Supabase Storage **från klienten**: `supabase.storage.from('listing-images').upload(filePath, file)` med path `{user.id}/{timestamp}-{random}.{ext}`.  
- Public URL hämtas med `getPublicUrl(filePath)`; URL:er sparas i `listings.images` (array).  
- Storage skyddas av RLS (setup_listing_images.sql): autentiserade användare får ladda upp, alla får läsa.

---

## 4. Listing-service och databas-typer

- **`lib/features/listings/listing-service.ts`** (märkt `'use server'`):  
  - `getListings(filters)` – använder **server-Supabase** (`createClient()` från `@/lib/supabase/server`), bygger query med filter (kategori, pris, plats, bilattribut, sortering, paginering).  
  - `getListingById(id)` – samma server-klient, en rad.  
  - `getFavoriteListings(userId)` – hämtar användarens sparade annonser (full `Listing[]`) för Dashboard-fliken "Sparade annonser".  
  - `getFavoriteIds(userId)` – returnerar bara favorit-`listing_id` (används på startsidan för att undvika N+1).  
  - `toggleFavorite(userId, listingId)` – lägger till eller tar bort rad i `favorites`; anropas från Server Action.  
- **Favoriter – Server Action:** `app/actions/favorite-actions.ts` – `toggleFavoriteAction(listingId)`; kräver inloggning, anropar `toggleFavorite`, därefter `revalidatePath('/dashboard')` och `revalidatePath('/')`. Dashboard hämtar favoritlistan på servern; startsidan hämtar `favoriteIds` en gång och skickar till klienten så att varje kort kan visa "är jag favorit?" utan extra anrop.  
- **Typer:** `app/types/index.ts` – `Listing` (id, title, description, price, location, category, attributes, images, user_id, status, …). Ingen generering från DB-schema; typer är manuella.

---

## 5. Säkerhetskoll

### RLS (Row Level Security)
- **Ja.** RLS är aktiverat och används konsekvent i setup-filer:  
  - **listings:** `enable row level security`; policies: public read för `status = 'active'`, insert med `auth.uid() = user_id`, update/delete endast för ägare.  
  - **profiles, favorites, conversations, messages, deletion_logs:** egna policies (läsa/skriva egen data).  
  - **Storage (listing-images, avatars):** policies för publik läsning och autentiserad upload/delete av egen data.

### Är API-anrop / Server Actions skyddade?
- **POST /api/listings:** Ingen auth-koll. Tar bara emot `body.filters` och anropar `getListings(filters)`. Det är **läsning av publika (aktiva) annonser** – acceptabelt att vara öppen, men om ni sen lägger till känslig data i svaret bör auth övervägas.  
- **POST /api/delete-account:** **Skyddad.** Kontrollerar `supabase.auth.getUser()` och returnerar 401 om ingen användare; använder sedan server-klient eller `supabaseAdmin.auth.admin.deleteUser`.  
- **Create/Update listing:** Sker via klientens Supabase-klient (cookies = användarens session). RLS säkerställer att endast `auth.uid() = user_id` får insert/update – så **skyddat på DB-nivå**, inte via en egen API-route eller Server Action.

---

## 6. Förbättringspotential

1. **Typer från databasen**  
   Överweeg att generera TypeScript-typer från Supabase (t.ex. `supabase gen types`) och använda dem i `app/types` och listing-service så att schema och kod hålls i synk.

2. **Bilduppladdning: storlek/typ på servern**  
   Idag valideras storlek och typ främst på klienten. För extra säkerhet kan en Server Action eller API-route godkänna upload-URL:er (t.ex. signed upload) eller validera filer på servern innan de sparas, så att begränsningar inte kan kringgås från klienten.

---

*Slutsats: Projektet har tydlig struktur, RLS används konsekvent och auth bygger på Supabase med cookies. Middleware skickar oinloggade användare på skyddade rutter till `/login`. Listing-åtkomst är samlad i `lib/features/listings/listing-service.ts`. Kvarvarande förbättringar: typer från databasen och eventuell server-side validering av bilduppladdning.*
