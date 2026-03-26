# ARCHITECTURE.md — Sokhar / kollahar.se

> **Denna fil finns i `docs/ARCHITECTURE.md`** — den primära platsen för all projektdokumentation.
> Roten innehåller en tunn pekare som refererar hit.

## 🧱 Arkitektur & Kodstandard – Kollahär

Detta dokument är **lagtexten** för hur vi bygger systemet framåt. Nya features och refaktoriseringar ska följa dessa regler. Avvikelser ska vara explicit motiverade i kodreview.

---

## 1. Arkitektur – Separation of Concerns

- **UI-komponenter**
  - UI-komponenter (React Components i `app/` och `app/components/`) får:
    - Hantera **presentation, layout och interaktion** (state, events, formulär).
    - Ta emot data via **props** och anropa **typsäkra tjänster/funktioner**.
  - UI-komponenter får **inte**:
    - Anropa Supabase direkt (`createClient`, `supabase.from(...)`, `.rpc(...)` osv.).
    - Innehålla affärslogik för filtrering/sortering som kan delas mellan views – den ska bo i feature-/service-lager.

- **Dataåtkomst & affärslogik**
  - All logik som pratar med databasen eller Supabase API ska ligga i:
    - `lib/features/<feature>/<feature>-service.ts` – feature-specifika tjänster.
    - `app/(server)/...` server actions när vi explicit behöver server-only logik.
  - Regler:
    - En **service-funktion** kapslar in ett helt use-case (t.ex. `getLocationStats`, `getActiveListings`, `markConversationAsRead`).
    - UI anropar **endast** dessa tjänster (direkt eller via hooks).

- **Server vs Client**
  - **Server-first**: När möjligt ska datat hämtas i Server Components / server actions.
  - **Client** används när:
    - Vi behöver realtidsinteraktion, local state eller browser-API:er.
    - Vi gradvis migrerar gammal klientlogik – då ska ny kod ändå följa service-mönstret.

---

## 2. Modularity – Feature-based struktur

- **Feature-moduler**
  - Varje större domänområde ska ha en egen modul under `lib/features`:
    - `lib/features/location/`
    - `lib/features/listings/`
    - `lib/features/search/`
    - `lib/features/messages/`
  - En typisk feature-mapp:
    - `lib/features/location/location-service.ts` – all dataloggik & domänregler för plats.
    - `lib/features/location/location-types.ts` – delade typer för platsdomänen.

- **App-lager**
  - `app/`:
    - Router, pages, layouts, route-specifika server actions.
    - Binder ihop features (komposition), men äger inte domänreglerna.
  - `app/components/`:
    - Återanvändbara UI-bitar utan direkt koppling till Supabase eller I/O.
    - Får anropa feature-services, men **inte** direkt databas-klienter.

- **Lib-lager**
  - `lib/`:
    - Delade utiler (`image-utils`, `categories`, `swedish-locations`).
    - Supabase-klienter (`lib/supabase/client`, `lib/supabase/server`).
    - Feature-lager (`lib/features/...`).

---

## 3. Kodkvalitet – Typer, felhantering & namngivning

### 3.1 Typer

- **Förbjudet**
  - `any` är **inte tillåtet** i ny kod.
  - Vid refaktor av befintlig kod ska `any` fasas ut när det är praktiskt möjligt.
- **Rekommenderat**
  - Använd specifika typer eller `unknown` + explicit parse/guard.
  - Återanvänd domän-typer (t.ex. `Listing`, `LocationStatsRow`) istället för lösa objekt.
  - Exportera gemensamma typer från:
    - `app/types/` (existerande projekt-typer).
    - `lib/features/<feature>/<feature>-types.ts` för feature-specifik typning.

### 3.2 Felhantering

- Service-funktioner ska:
  - Antingen:
    - Kasta ett fel med tydlig kontext (`throw new Error('getLocationStats failed: ...')`), **eller**
    - Returnera en typsäker resultat-typ:
      - `type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }`
  - Inte svälja fel tyst. Minst `console.error` + fallback-strategi.
- UI-komponenter ska:
  - Visa användarvänliga felmeddelanden eller failsafe-UI (tom state, skeleton etc.).

### 3.3 Namngivning

- **Filer**
  - React-komponenter: `PascalCase.tsx` (t.ex. `LocationFilter.tsx`).
  - Services: `kebab-case-service.ts` (t.ex. `location-service.ts`).
  - Types: `kebab-case-types.ts` (t.ex. `location-types.ts`).

- **Funktioner**
  - Datahämtning: `getXxx`, `listXxx` (t.ex. `getLocationStats`, `listUserListings`).
  - Mutationer: `createXxx`, `updateXxx`, `deleteXxx`, `markXxx`.
  - Boolean: `isXxx`, `hasXxx`, `shouldXxx`.

- **Variabler & props**
  - Beskrivande, inga förkortningar med oklar betydelse.
  - Svenska/engelska:
    - Domänbegrepp kan vara på svenska (`location`, `kommun` är ok i värden).
    - Kod (funktioner, typer, variabler) ska i huvudsak vara engelska.

---

## 4. Skalbarhet – Lägga till nya features

När du bygger en ny feature:

1. **Skapa feature-modul**
   - Lägg till mapp under `lib/features/<feature>/`.
   - Skapa minst:
     - `<feature>-service.ts` – datalager + domänlogik.
     - `<feature>-types.ts` – exponerade typer.

2. **Bygg UI ovanpå service**
   - Pages/komponenter i `app/` anropar endast service-funktioner.
   - Filtrerings-/sorteringslogik som kan återanvändas mellan views hamnar i featuren, inte i en specifik page.

3. **Skydda core-logik**
   - Core-moduler (`lib/supabase/*`, centrala domäner som listings/messages) får inte ändras direkt av features utan tydlig motivation.
   - Nya features ska i första hand **komponeras ovanpå** befintliga tjänster.

4. **Iterativ refaktor**
   - Gammal logik får ligga kvar tillfälligt, men:
     - Ny kod ska följa detta dokument.
     - När vi rör en modul i samband med en feature, passar vi på att lyfta ut datalogik till `lib/features/*` där det är rimligt.

---

## 5. Specifikt: Location & Filters

- All logik kring:
  - `get_location_stats` (Supabase RPC),
  - location-aggregation,
  - mapping mot `LOCATION_TREE`,
  ska bo i `lib/features/location/`.

- UI-komponenter (`LocationFilter`, `LocationInput`, headers osv.) får endast:
  - Ta emot färdiga strukturer (t.ex. `LocationCounty[]` med counts),
  - Eller anropa en **typsäker** service-funktion (t.ex. `getLocationStats`) som kapslar supabase-anropen.
