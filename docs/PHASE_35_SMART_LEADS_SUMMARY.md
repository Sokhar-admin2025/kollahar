# Phase 3.5: Smart Leads & Multi-User – Implementationssammanfattning

**Status:** Implementerad  
**Datum:** 2025-02-04

---

## Översikt

Phase 3.5 lägger till smarta lead-notiser, multi-user-stöd för dealers och förbättrad onboarding för säljare utan konto.

---

## 1. DATABAS (SQL)

**Fil:** `supabase/manual_run_phase35_smart_leads.sql`

**Ändringar:**
- **listings:** Nya kolumner `contact_email` (text) och `contact_name` (text)
- **profiles:** Nya kolumner `is_admin` (boolean, default false) och `parent_organization_id` (uuid, FK till profiles.id)

**Åtgärd:** Kör SQL-filen manuellt i Supabase SQL Editor.

---

## 2. SMART NOTIFICATION ENGINE

### 2.1 E-postmall (`lib/email/lead-notification.ts`)
- Resend SDK, FROM: `noreply@send.kollahar.se`
- Länk till chatten: `/dashboard/messages?conv=[conversationId]`
- "Skapa konto"-länk när `contact_email` används (för mottagare utan konto)

### 2.2 Trigger-logik (`app/actions/lead-notification-action.ts`)
- **När:** Vid nytt lead-kort OCH vid första meddelandet i en konversation
- **Mottagare:** `contact_email` om satt, annars ägarens e-post (via `supabase.auth.admin.getUserById`)
- **CC:** Ägarens e-post om `contact_email` används och skiljer sig
- **Claim Account URL:** `/login?tab=signup&email=[email]&org=[ownerId]`

### 2.3 Integration
- **Lead-kort:** `app/actions/lead-actions.ts` → `triggerLeadNotification` med `type: 'lead_card'`
- **Första meddelande:** `app/actions/message-actions.ts` → kontrollerar `getMessages().length === 0`, endast för `account_type === 'company'` → `triggerLeadNotification` med `type: 'first_message'`

---

## 3. DEALER DASHBOARD – ADMIN VS SELLER

### 3.1 Analytics-service (`lib/features/dealer/dealer-analytics-service.ts`)
- Nytt interface `DealerDashboardOptions`: `orgOwnerId`, `isAdmin`, `userEmail`
- **Admin (is_admin === true):** Alla listningar där `user_id = orgOwnerId`
- **Seller (is_admin === false):** Endast listningar där `user_id = orgOwnerId` AND `contact_email = userEmail`
- Total Views och Hot Leads räknas endast för filtrerade listningar

### 3.2 Dealer-sida (`app/dashboard/dealer/page.tsx`)
- Hämtar `is_admin`, `parent_organization_id` från profil
- `orgOwnerId = parent_organization_id ?? user.id`
- Skickar `orgOwnerId`, `isAdmin`, `userEmail` till `getDealerDashboardData`
- Endast `account_type === 'company'` får åtkomst

---

## 4. USER ONBOARDING

### 4.1 Login-sida (`app/login/LoginPageContent.tsx`)
- Läser `email` från URL (`?email=xxx`) och pre-fyller e-postfältet
- Vid `/login?tab=signup&email=xxx&org=yyy` visas signup-fliken med e-post ifylld

### 4.2 Meddelanden – direktlänk till konversation
- **Sida:** `app/dashboard/messages/page.tsx` – läser `?conv=[id]` från URL
- **InboxClient:** Ny prop `initialConvId` – vid mount väljs konversationen automatiskt om den finns i listan

---

## 5. TYPER

- **app/types/index.ts:** `Listing` har `contact_email`, `contact_name`
- **lib/types.ts:** `Profile` har `is_admin`, `parent_organization_id`

---

## 6. FILER SOM ÄNDRATS/SKAPATS

| Fil | Ändring |
|-----|---------|
| `supabase/manual_run_phase35_smart_leads.sql` | Ny – kör manuellt |
| `lib/email/lead-notification.ts` | E-postmall med Resend |
| `app/actions/lead-notification-action.ts` | Mottagare, CC, Claim URL |
| `app/actions/lead-actions.ts` | Anropar `triggerLeadNotification` vid lead-kort |
| `app/actions/message-actions.ts` | Anropar `triggerLeadNotification` vid första meddelande |
| `lib/features/dealer/dealer-analytics-service.ts` | Admin/Seller-filtrering |
| `app/dashboard/dealer/page.tsx` | Hämtar is_admin, userEmail, skickar options |
| `app/dashboard/messages/page.tsx` | Läser `?conv=` och skickar `initialConvId` |
| `app/components/InboxClient.tsx` | Prop `initialConvId`, auto-välj konversation |
| `app/login/LoginPageContent.tsx` | Pre-fyll e-post från `?email=` |
| `app/types/index.ts` | contact_email, contact_name på Listing |
| `lib/types.ts` | is_admin, parent_organization_id på Profile |

---

## 7. UPPDATERINGAR (View Tracker, Leads, supabaseAdmin)

- **listing_views:** Ny tabell för sidvisningar. Klient loggar via `logListingViewAction` vid `/annons/[id]`. Både inloggade och anonyma användare räknas. `sessionStorage` (30 min) förhindrar dubbelräkning i samma flik/session.
- **Dealer-analytics:** Använder `supabaseAdmin` för leads, listings, listing_views (bypassar RLS). Total Views från `listing_views`.
- **Inventory Health:** Health = (views > 0) AND (>= 3 bilder) AND (beskrivning > 100 tecken).
- **Leads Realtime:** Subscription på `leads` för live-uppdatering av Hot Leads-räknaren.
- **SUPABASE_SERVICE_ROLE_KEY:** Krävs för dealer-dashboard (leads, listings, listing_views). Se `docs/02-BACKEND_DATABASE.md` för detaljer.

## 8. SAKNADE / FRAMTIDA UPPGIFTER

- **UI för contact_email/contact_name:** CreateListingForm och listing-actions har ännu inte fält för att sätta dessa.
- **org-param vid signup:** `?org=[id]` skickas med i Claim-länken men används inte ännu för att automatiskt koppla ny användare till organisationen (`parent_organization_id`).

## 9. MILJÖVARIABLER

---

## 9. MILJÖVARIABLER

- `RESEND_API_KEY` – krävs för att skicka lead-notiser
- `SUPABASE_SERVICE_ROLE_KEY` – krävs för dealer-dashboard (leads, listings, listing_views)
- `NEXT_PUBLIC_APP_URL` (eller default kollahar.se) – för korrekta länkar i e-post. Använd ALDRIG VERCEL_URL.
