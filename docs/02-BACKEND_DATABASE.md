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
- `avatar_url`: URL till profilbild (från `avatars` bucket)
- `consent_marketing`: GDPR-samtycke för marknadsföring
- `consent_analytics`: GDPR-samtycke för analytics

#### 3. `public.listings`

Huvudtabell för annonser.

```sql
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL,
  location text NOT NULL,
  category text NOT NULL,
  images text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'deleted')),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

**Kolumnbeskrivning:**
- `id`: Unikt ID (UUID)
- `user_id`: Ägare av annonsen (FK till `auth.users`)
- `title`: Annonsrubrik
- `description`: Detaljerad beskrivning
- `price`: Pris i SEK (integer)
- `location`: Plats (t.ex. "Stockholm, Södermalm")
- `category`: Kategori (`'Fordon'`, `'Elektronik'`, `'Kläder'`, `'Möbler'`, `'Övrigt'`)
- `images`: Array av bild-URLs (från `listing-images` bucket)
- `status`: Status (`'active'`, `'sold'`, `'deleted'`)
- `created_at`: Skapad datum
- `deleted_at`: Borttagen datum (sätts när status ändras till `'sold'`)

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

### `listingService.ts`

Abstraktioner för listing-relaterade operationer.

```typescript
// app/services/listingService.ts
export const listingService = {
  getAllActive: async (): Promise<Listing[]> => {
    // Hämta alla aktiva annonser
  },
  
  getById: async (id: string): Promise<Listing | null> => {
    // Hämta specifik annons
  }
}
```

**Användning:**
```typescript
import { listingService } from '@/app/services/listingService'
const listings = await listingService.getAllActive()
```

### `messageService.ts`

Abstraktioner för meddelanden.

```typescript
// app/services/messageService.ts
export const messageService = {
  createConversation: async (listingId, buyerId, sellerId) => {
    // Skapa eller hämta befintlig konversation
  },
  
  getMyConversations: async (userId) => {
    // Hämta alla konversationer för användare
  },
  
  getMessages: async (conversationId) => {
    // Hämta meddelanden i konversation
  },
  
  sendMessage: async (conversationId, senderId, content) => {
    // Skicka meddelande
  }
}
```

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

Vissa operationer kräver **admin-nivå** behörighet mot Supabase (t.ex. att radera ett konto helt, inklusive raden i `auth.users`).

### Service Role-nyckeln

- `SUPABASE_SERVICE_ROLE_KEY` är **endast konfigurerad i server-miljöer**:
  - Lokalt i `.env.local` (utan `NEXT_PUBLIC_`-prefix)
  - I Vercel Environment Variables (Production / ev. Preview)
- Den får **aldrig** användas i klientkod.

### Var den används

- `lib/supabase/admin.ts`
  - Skapar en admin-klient (`supabaseAdmin`) **endast på serversidan**.
  - Har skydd mot användning i browser (`if (typeof window !== 'undefined') throw ...`).
- `app/api/delete-account/route.ts`
  - Använder `supabaseAdmin?.auth.admin.deleteUser(user.id)` för att:
    - Ta bort användaren från `auth.users`
    - Låta `ON DELETE CASCADE` i `profiles` och `listings` rensa relaterad data
  - Faller tillbaka till RLS-skyddad radering (favorites/listings/profiles) om service role saknas.

### Säkerhetsprinciper

1. **Ingen klientåtkomst**: Inga `NEXT_PUBLIC_`-prefix på service-role-nyckeln.
2. **Minsta möjliga yta**: Endast `delete-account`-flödet använder admin-klienten.
3. **RLS som backup**: Fallback-logik använder alltid `auth.uid()` + RLS vid radering av publika tabeller.

---

**Nästa steg**: Läs [Frontend & UI](./03-FRONTEND_UI.md) för att förstå komponentstrukturen och designsystemet.
