# Recent Activity ("Pulsen") – Spec & Jobbeskrivning

**Status:** Ej byggd. Spec finns för att enkelt kunna slå på funktionen vid behov (feedback-insamling eller betalfeature).

**Syfte:** En aktivitetslogg i LeadOS som fungerar som säljarens "loggbok" – ger bekräftelse på viktiga händelser (ny lead, import lyckad, annons såld) och en enkel tidslinje. Håll loggningen till högvärdiga händelser så att feeden inte blir brus.

---

## 1. Var det ska synas

- **Primärt:** Mission Control (`/dashboard` för företagskonton), längst ner under "Pipeline-översikt".
- **Placeholder i UI (när ni bygger den):** Låst sektion med dummy-data och tooltip **"What to expect"** – för att ta in feedback eller visa som kommande/betal feature. Hänglås = stängd funktion; dummy-status som exempel.
- **Frivilligt senare:** Samma feed kan återanvändas på Dealer Command Center (`/dashboard/dealer`) eller Seller Mode (`/dashboard/seller`) om ni vill ha "pulsen" där också.

Privatkonton ser inte Mission Control och ser därmed inte aktivitetsloggen.

---

## 2. Databas (Supabase)

- **Tabell:** `activity_log`
  - `id` uuid PK, default `gen_random_uuid()`
  - `created_at` timestamptz default `now()`
  - `organization_id` uuid NOT NULL, FK till `organizations(id)` ON DELETE CASCADE
  - `type` text NOT NULL
  - `message` text NOT NULL
  - `metadata` jsonb default `'{}'`
- **Index:** `(organization_id, created_at DESC)` för snabb hämtning.
- **RLS:** Aktivera RLS. SELECT: användare får endast läsa rader där `organization_id` = deras org (t.ex. `current_user_organization_id()`). INSERT: endast via server (service role), så att guest-lead och API-routes kan skriva.

---

## 3. Activity Service (server-side)

- **Funktion:** `logActivity({ organizationId, type, message, metadata? })` – server-only, använder service role för insert så den fungerar från både Server Actions och API-routes (t.ex. guest-lead).
- **Händelsetyper (håll endast dessa):**
  - **Leads:** `lead_new`, `lead_status`, `lead_sla_missed`, `lead_sla_warning`
  - **Lager:** `inventory_created`, `inventory_updated`, `inventory_sold`, `inventory_deleted`
  - **Sync:** `sync_import_success`, `sync_import_error`
- **Integrationspunkter:**
  - `submitLeadCardAction` → `lead_new`
  - `/api/public/guest-lead` efter lyckad lead-skapelse → `lead_new`
  - `updateLeadStatusAction` → `lead_status`
  - SLA-check (cron) vid missad/varning → `lead_sla_missed` / `lead_sla_warning`
  - `createListingAction` → `inventory_created`
  - `updateListingAction` → `inventory_updated`
  - `markAsSoldAction` → `inventory_sold`
  - `deleteListingAction` → `inventory_deleted`
  - `/api/import-smistabil` efter import → `sync_import_success` / `sync_import_error`
- Anrop ska vara fire-and-forget; logga fel på servern om insert misslyckas.

---

## 4. UI (när ni bygger)

- **Komponent:** Feed som visar senaste 5–10 aktiviteterna för nuvarande organisation. Data hämtas **server-side** vid första laddning av dashboard (ingen client-fetch för feeden).
- **Layout:** Vertikal tidslinje med ikoner per typ (t.ex. User för lead_*, Car/Package för inventory_*, RefreshCw/AlertCircle för sync_*). Relativ tid ("2 min sedan") via `Intl.RelativeTimeFormat` eller date-fns.
- **Placeholder-variant (för feedback/betal):** Låst sektion med hänglås-ikon, dummy-rader med exempeltyper, och tooltip **"What to expect"** som förklarar att det är en kommande funktion. Ingen riktig data eller `logActivity`-anrop behövs för placeholder.
- **Tillgänglighet (EAA):** Semantisk markup, aria-label/visad text för ikoner, tillräcklig kontrast, mobilanpassad.

---

## 5. Referenser i kodbasen

- Mission Control: `app/dashboard/page.tsx` (företag → `MissionControlClient`), `app/dashboard/MissionControlClient.tsx`.
- Lead-actions: `app/actions/lead-actions.ts` (submitLeadCardAction, updateLeadStatusAction).
- Guest-lead: `app/api/public/guest-lead/route.ts`.
- Listing-actions: `app/actions/listing-actions.ts` (create, update, markAsSold, delete).
- Import: `app/api/import-smistabil/route.ts`.
- SLA-check: `app/api/cron/check-sla/route.ts`, `lib/features/leados/leados-sla-check`.
- Organisation: `organization_id` på profiles, listings, leads; `current_user_organization_id()` i DB.

---

## 6. Prompt: Bygg Recent Activity UI (placeholder)

Kopiera prompten nedan och använd i Cursor (eller annat verktyg) för att bygga **endast UI:en** – låst sektion med dummy-data och tooltip. Ingen backend, ingen `activity_log`, inga Server Actions.

```
Läs docs/RECENT_ACTIVITY_SPEC.md sektion 1 och 4. Bygg en placeholder för "Recent Activity" (Pulsen) i Mission Control.

Krav:
1. Placering
   - Lägg till en ny sektion längst ner i app/dashboard/MissionControlClient.tsx, under den befintliga "Pipeline-översikt"-sektionen (den med TrendingUp och Missade/Nya/Aktiva).

2. Sektionens utseende
   - En tydlig rubrikrad: "Senaste aktivitet" med en hänglås-ikon (Lock från lucide-react) som signalerar att funktionen är stängd/kommande.
   - En tooltip eller info-knapp med texten "What to expect" som vid hover/click visar: "Här kommer du att se en tidslinje med viktiga händelser – nya leads, annonser sålda, import lyckad – så du får en snabb puls på vad som hänt. Funktionen är ett tillägg."
   - Använd samma mönster som övriga sektioner i MissionControlClient: rounded-xl, border, bg-white, dark-mode (dark:bg-gray-900, dark:border-gray-700), padding p-4.

3. Dummy-data (hårdkodad lista)
   - Visa 5–6 exempelrader som visar hur feeden kommer se ut. Använd en array med objekt med t.ex. type, message, relativeTime.
   - Exempel på rader:
     - type: lead_new    → ikon User,    message: "Ny lead: Anna K. – Volvo XC60",           relativeTime: "2 min sedan"
     - type: inventory_sold → ikon Package/Car, message: "Annons såld: BMW 320d",           relativeTime: "1 timme sedan"
     - type: sync_import_success → ikon RefreshCw, message: "Import lyckades: 12 annonser",   relativeTime: "igår"
     - type: lead_status → ikon User,    message: "Lead kontaktad: Erik S. – Tesla Model 3", relativeTime: "igår"
     - type: inventory_created → ikon Package, message: "Ny annons: Audi A4",                 relativeTime: "2 dagar sedan"
     - type: lead_sla_missed → ikon AlertCircle, message: "SLA missad för lead – VW Golf",  relativeTime: "3 dagar sedan"
   - Varje rad: liten ikon till vänster (beroende på type), sedan message, sedan relativ tid till höger. Vertikal tidslinje-känsla (eventuellt en vertikal linje mellan ikonerna om det ser snyggt ut).

4. Ikoner (lucide-react)
   - lead_new / lead_status → Users eller User
   - inventory_* → Package eller Car
   - sync_import_* → RefreshCw eller CheckCircle
   - lead_sla_* → AlertCircle eller AlertTriangle
   Använd samma ikonstorlek som andra hjälpikoner i Mission Control (t.ex. h-4 w-4).

5. Tillgänglighet
   - Rubriken med Lock: aria-label som beskriver att det är en kommande funktion.
   - Tooltip/info-knappen: aria-label "Vad du kan förvänta dig" eller liknande.
   - Listan: semantisk markup (ul/li eller nav/ol) så att skärmläsare förstår att det är en tidslinje/lista.

6. Språk och stil
   - All text på svenska. Följ befintlig ton och Tailwind-klasser i MissionControlClient (text-brand-text, text-sm, text-xs för tid, dark:...).
   - Mobilanpassad: sektion ska inte bryta layouten på små skärmar; wrappa eller stapla vid behov.

Implementera endast UI; ingen fetch, ingen ny API, ingen activity_log. Dummy-datan är hårdkodad i komponenten eller i en konstant i samma fil.
```

---

## 7. Full implementation prompt (backend + riktig UI)

När ni ska bygga den riktiga funktionen (tabell + service + integrationspunkter + riktig UI) använd den utarbetade prompten som finns i konversationshistoriken (Recent Activity – databas, logActivity, integrationspunkter, UI med tidslinje och riktig data). Denna doc är sammanfattning och "jobbet" så att ni enkelt kan slå på det.
