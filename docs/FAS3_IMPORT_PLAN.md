# Fas 3: Import-plan – Smistabil CSV → Demo

**Syfte:** Importera bilannonser från `smistabil-se-2026-02-20.csv` till Kollahär med dummy-profil, för att visa upp plattformen.

**Status:** ✅ Implementerat (API-route + UI)

---

## 1. Förutsättningar

| Komponent | Status |
|-----------|--------|
| `createListing` (listing-service) | ✅ Finns |
| `insertListingSchema` (Zod) | ✅ Finns |
| `listings`-tabell (title, description, price, location, category, images, attributes) | ✅ Finns |
| `external_id`, `contact_email`, `contact_name` i DB | ✅ Finns (ej i service/schema idag) |
| Dummy-profil (user + profile) | ❌ Skapas |
| Import-script/API | ❌ Byggs |

---

## 2. Steg i ordning

### Steg 1: Dummy-profil

- Skapa användare i Supabase Auth (eller använd befintlig testanvändare)
- Skapa/uppdatera `profiles` med t.ex.:
  - `display_name`: "Demo Bilhandel"
  - `seller_type`: "company" (om ni har det)
- Spara `user_id` – används som ägare för alla importerade listings

### Steg 2: CSV-parser och transformation

Skapa `lib/import/smistabil-csv-parser.ts` (eller liknande):

**Parsing:**
- Läsa CSV (t.ex. med `csv-parse` eller Node `fs` + split)
- Mappa kolumner: `name`, `price`, `description`, `Car_Make`, `Car_Model`, `Year`, `Mileage`, `Fuel`, `Gearbox`, `Color`, `Registration_Number`, `image`, `image_2`–`image_5`, `item_page_link`

**Transformation per rad:**
- **Pris:** `"194 800 kr"` → `194800` (ta bort mellanslag, "kr", ev. "exkl. moms")
- **Miltal:** `"7 757 mil"` → `7757` (ta bort mellanslag, "mil")
- **Växellåda:** `"Automatisk"` → `"Automat"`
- **Drivmedel:** `"Hybrid el/bensin"` → `"Hybrid"`, `"Hybrid el/diesel"` → `"Hybrid"`
- **Plats:** Fast `"Upplands Väsby"`
- **Kategori:** `"cars"`
- **Bilder:** Samla `image`, `image_2`–`image_5` till `string[]`, filtrera tomma
- **Smistabil-referenser:** Ersätt i description, contact_name m.m. med generiska värden (t.ex. "Demo Bilhandel", "demo@example.com")

**Output:** `InsertListingInput[]` (+ ev. `external_id` per rad)

### Steg 3: Utöka schema och service (valfritt för MVP)

Om ni vill spara `external_id`, `contact_email`, `contact_name`:

- Lägg till i `insertListingSchema` som optional
- Lägg till i `createListing` insertPayload

*Kan skippas i MVP – då använder vi bara title, description, price, location, category, images, attributes.*

### Steg 4: Import-script

Skapa `scripts/import-smistabil-demo.ts` (eller `app/api/import-demo/route.ts`):

1. Läs CSV-fil (sökväg som env eller arg)
2. Anropa parsern → `InsertListingInput[]`
3. För varje rad:
   - Validera med `insertListingSchema.safeParse`
   - Vid OK: `createListing(row, dummyUserId)`
   - Vid fel: logga och hoppa över (eller samla fel)
4. Skriv ut sammanfattning (antal lyckade, misslyckade)

**Körning:** `npx tsx scripts/import-smistabil-demo.ts` (eller via API med auth)

### Steg 5: Kör import

1. Placera CSV i projektet (t.ex. `data/smistabil-se-2026-02-20.csv`)
2. Sätt `DUMMY_USER_ID` (eller hämta från env)
3. Kör scriptet
4. Verifiera att listings syns på sidan

---

## 3. Kolumn-mappning (referens)

| CSV | Kollahär | Transformation |
|-----|----------|----------------|
| name | title | Direkt (ev. trim) |
| description / Car_Description | description | Min 10 tecken; använd längre om kort |
| price | price | Parse "194 800 kr" → 194800 |
| Car_Make | attributes.make | Direkt |
| Car_Model | attributes.model | Direkt |
| Year | attributes.year | Parse till number |
| Mileage | attributes.mileage | Parse "7 757 mil" → 7757 |
| Fuel | attributes.fuel | Mappa Hybrid-varianter → "Hybrid" |
| Gearbox | attributes.gearbox | "Automatisk" → "Automat" |
| Color | attributes.color | Direkt |
| Registration_Number | attributes.reg_nr | Direkt |
| image, image_2–5 | images | Array, filtrera tomma |
| – | location | "Upplands Väsby" (fast) |
| – | category | "cars" |
| item_page_link | external_id (valfritt) | Extrahera ID från URL (#/objekt/18967842) |
| Contact_Information_-_Email, Seller_Name | contact_email, contact_name | Ersätt med generiska (demo@example.com, Demo Bilhandel) |

---

## 4. Beslut att ta

1. **Dummy user:** Skapa ny i Supabase Auth, eller använd befintlig?
2. **Import-script vs API:** Script för enstaka körning, eller API-route som kräver auth?
3. **external_id m.m.:** Inkludera i MVP eller vänta tills self-service-verktyget?

---

## 5. Så använder du importen

1. Logga in som MNG Productions (eller annat företagskonto)
2. Gå till **Dashboard** → klicka **Importera CSV**
3. Välj CSV-filen (Smistabil-format)
4. Klicka **Importera**
5. Annonserna skapas under ditt konto med generiska kontaktuppgifter (Demo Bilhandel, demo@example.com)

---

## 6. Uppskattad tid

| Steg | Tid |
|------|-----|
| Dummy-profil | 15 min |
| CSV-parser + transformation | 1–2 h |
| Schema/service-utökning (valfritt) | 30 min |
| Import-script | 1 h |
| Test + justeringar | 30 min |
| **Totalt** | **~3–4 h** |
