# 🗄️ Backend & Databas - Kollahär Marketplace

Detta dokument är för **Backend-utvecklare** och beskriver Server Actions, Supabase Schema, RLS Policies och databasstrukturen.

## 📡 Server Actions & Datahämtning

### Client vs Server Components

Kollahär använder en **hybrid-approach** för datahämtning:

#### Client Components (Datahämtning i useEffect)

**Används när:**
- Komponenten behöver interaktivitet (state, events)
- Data behöver uppdateras i realtid (favoriter, meddelanden)
- Optimistic updates krävs

**Exempel:**
```typescript
// app/page.tsx (HomePage)
'use client'

useEffect(() => {
  const fetchAds = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    setAds(data || [])
  }
  fetchAds()
}, [])
```

#### Server Components (Datahämtning direkt)

**Används när:**
- Komponenten är statisk eller behöver SEO
- Data hämtas en gång vid render
- Inga interaktiva features krävs

**Exempel:**
```typescript
// app/dashboard/favorites/page.tsx
import { createClient } from '../../../lib/supabase/server'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: favorites } = await supabase
    .from('favorites')
    .select('*, listing:listings(*)')
    .eq('user_id', user.id)
  
  return <div>...</div>
}
```

### Supabase Client Setup

#### Browser Client (Client Components)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Användning:**
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

#### Server Client (Server Components)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options })
          })
        }
      }
    }
  )
}
```

**Användning:**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

### Session & step-up policy (v1)

- **Primär session:** Hanteras av Supabase Auth via cookies (`@supabase/ssr`).
- **Ingen aggressiv idle-logout i UI:** Vanliga flöden hålls friktionsfria.
- **Känsliga åtgärder kräver färsk inloggning (15 min):**
  - byta lösenord
  - radera konto
  - byta e-post/kontotyp i settings (privat -> företag)
- **Teknisk kontroll:** `hasRecentSignIn(user.last_sign_in_at)` i både klientflöden och server-API (`/api/delete-account`) för defense-in-depth.
- **Reauth-redirect:** `/login?reason=reauth_required&next=...` med användarvänlig banner i login-vyn.

## 🗃️ Supabase Schema

### Tabeller

#### 1. `auth.users` (Supabase Auth)

Hanteras automatiskt av Supabase Auth. Innehåller:
- `id` (uuid, PK)
- `email` (string)
- `created_at` (timestamp)

#### 2. `public.profiles`

Användarprofiler med GDPR-samtycken.

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  location text,
  phone text,
  avatar_url text,
  consent_marketing boolean DEFAULT false,
  consent_analytics boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
```

**Kolumner:**
- `id`: Kopplad till `auth.users.id`
- `full_name`: Visningsnamn eller företagsnamn
- `location`: Valfri hemvist / plats (t.ex. "Huddinge, Stockholm")
- `phone`: Valfritt telefonnummer för kontaktkanaler (används endast när säljaren aktivt väljer "Visa telefon")
- `avatar_url`: URL till profilbild (från `avatars` bucket)
- `consent_marketing`: GDPR-samtycke för marknadsföring
- `consent_analytics`: GDPR-samtycke för analytics
- `created_at`: När profilen skapades (används för "Medlem sedan" på publika profiler)
- `account_type`: `'private'` (standard) eller `'company'` – styr om profilsidan kräver inloggning
- `website`: Företagswebb (valfritt)
- `is_company_verified`: Verifieringsbricka för företag (BadgeCheck)
- `org_number`: Organisationsnummer (valfritt)
- `phone`: Valfritt profiltelefonnummer (används som prefill för privata annonsers opt-in kontaktkanaler)

**Publika säljprofiler:** Se `lib/features/profiles/profile-service.ts` (`getPublicProfile`, `getProfileStats`) och sidan `/profil/[id]`.

#### 3. `public.listings`

Huvudtabell för annonser.

```sql
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  price bigint NOT NULL,
  location text NOT NULL,
  category text NOT NULL,
  make text,
  model text,
  year integer,
  mileage integer,
  engine_hours integer,
  fuel_type text,
  transmission text,
  engine_power integer,
  length_cm integer,
  contact_via_chat boolean NOT NULL DEFAULT true,
  show_phone boolean NOT NULL DEFAULT false,
  show_email boolean NOT NULL DEFAULT false,
  contact_phone text,
  images text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'deleted', 'draft')),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

**Kolumnbeskrivning:**
- `id`: Unikt ID (UUID)
- `user_id`: Ägare av annonsen (FK till `auth.users`)
- `title`: Annonsrubrik
- `description`: Detaljerad beskrivning
- `price`: Pris i SEK (`bigint`) – dedikerad kolumn för snabb sortering/filter
- `location`: Plats (t.ex. "Stockholm, Södermalm")
- `category`: Kategori-id (t.ex. `cars`, `boats`, `mc`)
- `make`, `model`, `year`: Märke/modell/årsmodell för fordon och andra produktkategorier där relevant
- `mileage`: Mätarställning/mil (primärt bilar)
- `engine_hours`: Gångtimmar (primärt båtar)
- `fuel_type`, `transmission`, `engine_power`: Drivmedel, växellåda/drivtyp, motoreffekt
- `length_cm`: Längd i cm (viktig för båt/släp)
- `contact_via_chat`: Om befintlig chatt via plattformen får användas för annonsen
- `show_phone`, `show_email`: Explicit opt-in för publika kontaktkanaler på annonsnivå
- `contact_phone`: Annons-specifikt telefonnummer (lagras endast när telefon är aktiverad)
- `images`: Array av bild-URLs (från `listing-images` bucket)
- `status`: Status (`'active'`, `'sold'`, `'deleted'`, `'draft'`) – draft = gömd, endast ägare ser
- `created_at`: Skapad datum
- `deleted_at`: Borttagen datum (sätts inte vid `'sold'`; sålda annonser visas för alla med banner "Såld")

#### 4. `public.favorites`

Junction-tabell för användares favoriter.

```sql
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
```

**Kolumnbeskrivning:**
- `user_id`: Användare som sparar favoriten
- `listing_id`: Annons som sparas
- `created_at`: När favoriten sparades

**Migration:** Se `supabase/migrations/20260116090000_create_favorites.sql`

#### 5. `public.conversations`

Chattkonversationer mellan köpare och säljare.

```sql
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Kolumnbeskrivning:**
- `id`: Unikt ID
- `listing_id`: Annonsen som konversationen handlar om
- `buyer_id`: Köparen
- `seller_id`: Säljaren
- `created_at`: När konversationen startades
- `updated_at`: Uppdateras när nytt meddelande skickas

#### 6. `public.messages`

Meddelanden i konversationer.

```sql
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Kolumnbeskrivning:**
- `id`: Unikt ID
- `conversation_id`: Konversationen meddelandet tillhör
- `sender_id`: Avsändare
- `content`: Meddelandetext
- `is_read`: Läst-status
- `created_at`: När meddelandet skickades

#### 7. `public.deletion_logs`

Logg för borttagna annonser (analytics).

```sql
CREATE TABLE public.deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  ad_title text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Kolumnbeskrivning:**
- `id`: Unikt ID
- `user_id`: Användare som raderade annonsen
- `reason`: Anledning (`'sold_here'`, `'sold_elsewhere'`, `'just_delete'`)
- `ad_title`: Annonsrubrik (för analytics)
- `created_at`: När raderingen skedde

### Storage Buckets

#### `listing-images` (Public Access)

- **Syfte**: Lagrar bilder för annonser
- **Struktur**: `{user_id}/{timestamp}-{random}.{ext}`
- **Max bilder per annons**: 5
- **Max filstorlek**: 2MB
- **Tillåtna format**: JPEG, PNG, WebP

**RLS Policy:**
- Alla kan läsa (public bucket)
- Endast autentiserade användare kan ladda upp
- Användare kan bara ta bort sina egna bilder

#### `avatars` (Public Access)

- **Syfte**: Lagrar profilbilder
- **Struktur**: `{random}.{ext}`
- **Max filstorlek**: 2MB
- **Tillåtna format**: JPEG, PNG, WebP
  
**Setup:**
- Se `supabase/setup_avatars.sql` för att skapa bucketen och RLS-policys.

## 🔒 Row Level Security (RLS) Policies

### `public.listings`

```sql
-- Public read active ads
CREATE POLICY "Public read active ads"
  ON public.listings
  FOR SELECT
  USING (status = 'active');

-- Public read sold listings (så att besökare kan se annonssidan som "Såld" utan 404)
CREATE POLICY "Public read sold listings"
  ON public.listings
  FOR SELECT
  USING (status = 'sold');

-- Auth users create ads
CREATE POLICY "Auth users create ads"
  ON public.listings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners update/delete own ads
CREATE POLICY "Owners update own ads"
  ON public.listings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners delete own ads"
  ON public.listings
  FOR DELETE
  USING (auth.uid() = user_id);
```

### `public.favorites`

```sql
-- Favorites are viewable by owner
CREATE POLICY "Favorites are viewable by owner"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Favorites are insertable by owner
CREATE POLICY "Favorites are insertable by owner"
  ON public.favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Favorites are deletable by owner
CREATE POLICY "Favorites are deletable by owner"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);
```

### `public.profiles`

```sql
-- Public read profiles
CREATE POLICY "Public read profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Users can update own profile
CREATE POLICY "Users update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

### `public.conversations`

```sql
-- Users can read own conversations
CREATE POLICY "Users read own conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Users can create conversations
CREATE POLICY "Users create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);
```

### `public.messages`

```sql
-- Users can read messages in own conversations
CREATE POLICY "Users read own messages"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

-- Users can send messages in own conversations
CREATE POLICY "Users send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );
```

## 🔧 Service Layer

### Listing-service (`lib/features/listings/listing-service.ts`)

All listing-relaterad datahämtning och mutation sker via denna server-baserade service (Supabase med cookie-session). Exempel: `getListings(filters)`, `getListingById(id)`, `getUserListings(userId)`, `createListing`, `updateListing`, `toggleFavorite`, `getFavoriteListings`, `getFavoriteIds`.

**Användning (Server Components / Server Actions):**
```typescript
import { getListings, getListingById } from '@/lib/features/listings/listing-service'
const result = await getListings({ category: 'cars', limit: 24 })
```

### Message-service (`lib/features/messages/message-service.ts`)

Meddelande- och konversationslogik med server-Supabase: `getMyConversations(userId)`, `getUnreadConversationIds(userId)`, `getMessages(conversationId)`, `markConversationAsRead(conversationId, userId)`, `sendMessage(conversationId, senderId, content)`, `createConversation(listingId, buyerId, sellerId)`. Anropas från Server Components eller via `app/actions/message-actions.ts` (sendMessageAction, markAsReadAction, getMessagesAction, createConversationAction).

## 🛡️ Säkerhetsbestämmelser

### Validering

1. **Client-side**: Formulärvalidering i React
2. **Server-side**: RLS Policies i Supabase
3. **Type Safety**: TypeScript-typer för alla API-anrop

### Auth Checks

Alla skyddade routes kontrollerar autentisering:

```typescript
// Exempel från dashboard/page.tsx
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  router.push('/login')
  return
}
```

### Input Sanitization

- Alla textfält valideras på client-side
- Supabase hanterar SQL-injection automatiskt
- Bildfiler valideras (typ, storlek) innan upload

## 📊 Indexering

### Rekommenderade Indexes

```sql
-- För snabb sökning på status
CREATE INDEX idx_listings_status ON public.listings(status);

-- För sortering på datum
CREATE INDEX idx_listings_created_at ON public.listings(created_at DESC);

-- För användarens annonser
CREATE INDEX idx_listings_user_id ON public.listings(user_id);

-- För favoriter
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_listing_id ON public.favorites(listing_id);

-- För konversationer
CREATE INDEX idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX idx_conversations_listing_id ON public.conversations(listing_id);
```

## 🔄 Migrations

Migrations ligger i `supabase/migrations/`:

- `20260116090000_create_favorites.sql`: Skapar favorites-tabellen och RLS policies
- `20260205100000_listings_own_select_policy.sql`: Lägger till RLS-policy "Users can view all own listings" på `listings` så att inloggade användare kan se alla egna annonser (aktiva + sålda) i Dashboard.
- `20260206100000_public_read_sold_listings.sql`: Lägger till RLS-policy "Public read sold listings" på `listings` så att besökare kan läsa sålda annonser (visas som "Såld" på annonssidan).
- `20260207100000_profiles_public_seller_fields.sql`: Lägger till kolumner på `profiles`: `created_at`, `account_type`, `website`, `is_company_verified`, `org_number` (för publika säljprofiler).
- `20260212100000_user_hidden_conversations.sql`: Skapar `user_hidden_conversations` för soft delete av chattar (användare kan dölja konversationer för sig själva).
- `20260220100000_leads_seller_buyer_ids.sql`: Lägger till `seller_id` och `buyer_id` på `leads`.
- `20260221100000_profiles_email_notifications.sql`: Lägger till `email_notifications` (boolean) på `profiles`.
- `20260221200000_leads_rls_seller_id.sql`: RLS-policy så säljare kan läsa leads där `seller_id = auth.uid()`.
- `20260222100000_leads_realtime.sql`: Lägger till `leads` i `supabase_realtime`-publikationen för live-uppdatering.
- `20260223100000_listing_views.sql`: Skapar `listing_views` för view-tracker (Total Views i Dealer Command Center).
- `20260228000000_listing_views_listing_set_null.sql`: `listing_views.listing_id` nullable + ON DELETE SET NULL – Total Views behålls när annons raderas.
- `20260229000000_listings_seller_type.sql`: `listings.seller_type` – private/company för filter och sortering; backfill från profiles.account_type; triggers för INSERT och profiluppgradering.
- `20260302100000_listings_vehicle_agnostic_columns.sql`: Lägger till dedikerade vehicle-agnostiska filterkolumner på `listings`, backfill från `attributes` och B-tree-index på `category`, `make`, `model`, `year`, `price`.
- `20260303100000_leads_action_center_status.sql`: Uppdaterar lead-statusflöde (`new/contacted/qualified/sold/archived`), lägger till `buyer_email`-kolumn, index för org+status, samt policy för org-baserad statusuppdatering.
- `20260305120000_leads_remove_auto_buyer_email.sql`: GDPR-hotfix som nollar historiska `buyer_email`-värden i leads och tydliggör att e-post endast får sparas vid uttryckligt samtycke i lead-formulär.
- `20260305140000_listings_contact_channel_controls.sql`: Lägger till privacy-first kontaktkanaler per annons (`contact_via_chat`, `show_phone`, `show_email`, `contact_phone`) och constraint för minst en aktiv kanal.
- `20260305153000_profiles_add_phone_for_contact_channels.sql`: Lägger till valfritt `profiles.phone` för dataminimerad prefill av privat säljares telefon i annonsformulär.
- `20260305153000_profiles_add_phone_for_contact_channels.sql`: Lägger till valfritt `profiles.phone` för privat annonsörs telefonkanal (opt-in i annonsformulär).
- `20260306100000_leados_seller_mode_fields.sql`: Lägger till `assigned_to` och `first_response_at` på `leads` + index på `(organization_id, assigned_to, status, created_at)` som bas för LeadOS Seller Mode och 15-minuters SLA.
- `20260306105000_leads_guest_flags.sql`: Lägger till `is_guest` (boolean) och `source` (text) på `leads` för att kunna särskilja gästleads (skapade utan konto) och teknisk leadkälla (t.ex. `guest_form`, `lead_card`).
 - `20260306111000_leads_internal_note.sql`: Lägger till `internal_note` och `internal_note_updated_at` på `leads` för intern säljaranteckning i Lead Detail-vyn (endast intern, ej synlig för köpare).

### Legacy image backfill (engångskörning)

- **Route:** `POST /api/admin/backfill-images`
- **Syfte:** Migrera befintliga externa bild-URL:er i `listings.images` till interna URL:er i Supabase-bucket (`listing-images`).
- **Batchlimit:** Körs i mindre batchar (default 10) för att minska timeout-risk.
- **Dedupe:** Återanvänder hash-baserad filpath från `lib/import/image-fetcher.ts` så samma käll-URL inte laddas upp dubbelt.
- **Felhantering:** Enskilda bildfel stoppar inte hela batchen. `HTTP 404/410` tas bort från `images` så trasiga länkar inte tar plats i UI.
- **Säkerhet:** Kräver inloggad företagsadmin (temporär bypass ska vara avstängd i normal drift).

### LeadOS SLA-check (cron)

- **Route:** `GET/POST /api/cron/check-sla`
- **Syfte:** Skicka e-postvarningar till säljare för leads som är på väg att missa 15-minuters-SLA:t (LeadOS Seller Mode).
- **Fönster:** Varnar för leads med `status = 'new'`, `assigned_to IS NOT NULL`, `first_response_at IS NULL` och `created_at` inom 10–15 minuter bakåt i tiden.
- **Implementation:** `lib/features/leados/leados-sla-check.ts` anropar `triggerLeadNotification(type: 'sla_warning', ...)` som i sin tur använder `sendLeadSlaWarningEmail` (Resend).
- **Säkerhet:** Kräver `CRON_SECRET`. Cron-klient måste skicka `Authorization: Bearer <CRON_SECRET>` eller header `x-cron-secret: <CRON_SECRET>`. Ingen user-auth används.

### Production-notering (PostgREST schema cache)

Efter manuella SQL-ändringar i production (t.ex. ny kolumn) kan API:t tillfälligt svara att kolumnen saknas i schema cache.

Kör då:

```sql
NOTIFY pgrst, 'reload schema';
```

Exempel vid leads-utrullning: om `buyer_email` lagts till manuellt och klienten fortfarande får "column not found".

## ✅ Guardrail-checklista (Privat vs Företag)

Använd denna checklista vid alla ändringar kring multi-tenancy (`organization_id`) så att privatflödet aldrig bryts:

1. **Privat annons** ska kunna skapas med `organization_id = NULL`.
2. **Företagsannons** ska få `organization_id` automatiskt via profil/trigger.
3. **FK-säkerhet:** Om `organization_id` sätts måste motsvarande rad finnas i `public.organizations` (auto-create i trigger är OK).
4. **RLS-scope:** org-baserade queries/policies får endast användas för företagsflöden; privat ska ha säker fallback utan org-krav.
5. **Lead/View arv:** `leads` och `listing_views` ska ärva `organization_id` från listing när det finns; privat kan vara `NULL`.
6. **Migrationstest:** verifiera både privat användare och företagsanvändare i staging innan production.

### Expert Technical Review Gate (obligatorisk vid kritiska ändringar)

Aktivera denna gate när en PR innehåller något av följande:
- Ändringar i `supabase/migrations/*` som berör `organization_id`, RLS, FK, triggers eller auth-kopplad access.
- Ändringar i serverlogik som påverkar ägarskap/tenant-isolering (`listing-service`, dealer-analytics, lead-flöden).

**Krav före merge:**
1. **App/Marketplace-arkitekt sign-off**  
   - Bekräftar privat vs företag-regeln (`organization_id` endast där det ska användas).
2. **Security sign-off**  
   - Bekräftar RLS, accesskontroll och att inga nya tenant-läckor introducerats.
3. **Data/SQL sign-off**  
   - Bekräftar migrationens ordning/idempotens och att FK/trigger-beteende är säkert i production.
4. **Staging-bevis (obligatoriskt)**  
   - Testfall körda för både privat och företag (create/update/read), inklusive lead/view-paths.

### Bulk-import policy (CSV/XML)

- Bulk-import (`/dashboard/import`, `/api/import-smistabil`) är **endast för företagskonton**.
- `profiles.account_type` måste vara `company`.
- Privata konton ska:
  - inte se importknappen i dashboard,
  - redirectas bort från import-sidan,
  - och få `403` från API om endpointen anropas direkt.

Utöver migrations finns även manuella setup-skript:

- `supabase/setup_profiles.sql`: Skapar `public.profiles` + trigger från `auth.users` + RLS
- `supabase/setup_listings.sql`: Skapar `public.listings` + RLS policies
- `supabase/setup_deletion_logs.sql`: Skapar `public.deletion_logs` + RLS policies
- `supabase/setup_conversations_messages.sql`: Skapar `public.conversations` och `public.messages` + RLS
- `supabase/setup_avatars.sql`: Skapar `avatars`-bucket i Storage + RLS-policys
- `supabase/setup_listing_images.sql`: Skapar `listing-images`-bucket i Storage + RLS-policys

### Skapa Ny Migration

```bash
# I Supabase Dashboard eller via CLI
supabase migration new migration_name
```

## 🔐 Admin-åtkomst & Service Role (SUPABASE_SERVICE_ROLE_KEY)

Vissa operationer kräver **admin-nivå** behörighet mot Supabase – både för `auth.admin`-operationer och för att bypassa RLS vid behov.

### Service Role-nyckeln

- `SUPABASE_SERVICE_ROLE_KEY` är **endast konfigurerad i server-miljöer**:
  - Lokalt i `.env.local` (utan `NEXT_PUBLIC_`-prefix)
  - I Vercel Environment Variables (Production / ev. Preview)
- Den får **aldrig** användas i klientkod.

### Var den används

- `lib/supabase/admin.ts`
  - Skapar en admin-klient (`supabaseAdmin`) **endast på serversidan**.
  - Har skydd mot användning i browser (`if (typeof window !== 'undefined') throw ...`).
  - Om nyckeln saknas blir `supabaseAdmin` `null`; tjänster faller tillbaka till vanlig Supabase-klient (RLS gäller då).
- `app/api/delete-account/route.ts`
  - Använder `supabaseAdmin?.auth.admin.deleteUser(user.id)` för att ta bort från `auth.users`.
- **Dealer-analytics** – leads, listings, listing_views, favorites:
  - `lib/features/dealer/dealer-analytics-service.ts` använder `supabaseAdmin` för att läsa `leads`, `listings`, `listing_views` och `favorites` (antal sparade per annons i inventarietabellen).
  - Orsak: RLS på dessa tabeller kan blockera även korrekt data (t.ex. cookie-/session-problem). Sidan har redan verifierat att användaren är dealer; vi filtrerar strikt på `user_id`/`seller_id` = orgOwnerId.
- **Lead-notiser** (`app/actions/lead-notification-action.ts`): `supabaseAdmin.auth.admin.getUserById` för att hämta mottagarens e-post.
- **Meddelandenotiser** (`app/actions/new-message-notification-action.ts`): samma mönster för e-postuppslag.
- **Radera annons** (`lib/features/listings/listing-service.ts`): `deleteListing` **kräver** `supabaseAdmin` – returnerar tydligt fel om nyckeln saknas. Se `docs/TROUBLESHOOTING_DELETE_LISTING.md` vid problem.

### Leads & Views med supabaseAdmin

| Tabell         | Användning                         | Varför supabaseAdmin?                         |
|----------------|------------------------------------|-----------------------------------------------|
| `leads`        | Hot Leads-räknare i Dealer Dashboard | RLS kan blockera även när `seller_id = auth.uid()` |
| `listings`     | Inventariefråga för dealer          | Samma – sidan har redan verifierat dealer     |
| `listing_views`| Total Views för dealer              | Inga RLS-läsproblem; konsekvent med övrigt    |
| `listings`     | Radera annons (deleteListing)       | RLS/session kan blockera i production          |

**Säkerhet:** Alla dessa frågor filtrerar strikt på `user_id`/`seller_id` = `orgOwnerId`. Dealern har redan godkänts via `account_type = 'company'`. Ingen annan dealers data läcks.

### Listing_views – View Tracker

Tabellen `listing_views` loggar sidvisningar för annonser (`/annons/[id]`):

- **Kolumner:** `listing_id` (nullable – NULL om annons raderats), `seller_id` (listings.user_id), `viewer_id` (nullable), `created_at`
- **Persistent:** `listing_id` har ON DELETE SET NULL – Total Views försvinner inte när en annons raderas (samma mönster som leads).
- **Loggning:** Klient-effekt i `app/annons/[id]/page.tsx` anropar `logListingViewAction` (server action).
- **Inloggade och anonyma:** Båda räknas. `viewer_id` sätts till användar-id vid inloggning, annars `null`.
- **Dubbelräkning:** `sessionStorage` med nyckel `listing_view_{id}` och 30 minuters intervall – samma flik/session inom 30 min = 1 visning (refresh räknas inte som ny).
- **RLS:** Endast INSERT (alla får logga). Läses via `supabaseAdmin` i dealer-analytics.

### Säkerhetsprinciper

1. **Ingen klientåtkomst**: Inga `NEXT_PUBLIC_`-prefix på service-role-nyckeln.
2. **Strikt filtrering**: Alla admin-frågor filtrerar på verifierad användare/org.
3. **RLS som backup**: Vid saknad service role faller tjänster tillbaka till vanlig klient; RLS gäller då.

---

**Nästa steg**: Läs [Frontend & UI](./03-FRONTEND_UI.md) för att förstå komponentstrukturen och designsystemet.
