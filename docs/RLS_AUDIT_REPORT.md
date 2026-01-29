# 🔒 RLS-Audit Rapport - Sokhar Marketplace

**Datum:** 2026-01-28  
**Syfte:** Säkerhetsgranskning av Row Level Security (RLS) på alla känsliga tabeller

---

## ✅ Tabeller med RLS Aktiverat

### 1. `public.profiles` ✅
**Fil:** `supabase/setup_profiles.sql`

- ✅ RLS är **aktiverat** (`alter table public.profiles enable row level security`)
- ✅ Update-policy: Endast ägare kan uppdatera (`auth.uid() = id`)
- ⚠️ **VARNING:** Select-policy tillåter **publikt läsning** (`using (true)`)
  - Alla kan läsa alla profiler
  - **Kontrollera:** Innehåller profiler känslig data (email, telefon)?
  - **Aktuella kolumner:** `id`, `full_name`, `location`, `avatar_url`, `consent_marketing`, `consent_analytics`, `otp_verified`, `updated_at`
  - **Rekommendation:** Om email/telefon inte exponeras är detta OK för marketplace (användare behöver se säljare)

### 2. `public.favorites` ✅
**Fil:** `supabase/migrations/20260116090000_create_favorites.sql`

- ✅ RLS är **aktiverat**
- ✅ Select: Endast ägare kan se sina favoriter (`auth.uid() = user_id`)
- ✅ Insert: Endast ägare kan skapa favoriter (`auth.uid() = user_id`)
- ✅ Delete: Endast ägare kan ta bort favoriter (`auth.uid() = user_id`)
- ✅ **Säker:** Inga säkerhetsproblem

### 3. `public.conversations` ✅
**Fil:** `supabase/setup_conversations_messages.sql`

- ✅ RLS är **aktiverat**
- ✅ Select: Endast buyer eller seller kan läsa (`auth.uid() = buyer_id OR auth.uid() = seller_id`)
- ✅ Insert: Endast buyer kan skapa konversationer (`auth.uid() = buyer_id`)
- ✅ **Säker:** Inga säkerhetsproblem

### 4. `public.messages` ✅
**Fil:** `supabase/setup_conversations_messages.sql`

- ✅ RLS är **aktiverat**
- ✅ Select: Endast deltagare i konversationen kan läsa
- ✅ Insert: Endast deltagare kan skicka meddelanden (`sender_id = auth.uid()`)
- ✅ Update: Endast deltagare kan uppdatera (markera som läst)
- ✅ **Säker:** Inga säkerhetsproblem

---

## ❌ KRITISKA SÄKERHETSPROBLEM

### 1. `public.listings` ❌ **SAKNAS HELT**

**Status:** Tabellen är **INTE** definierad i någon SQL-fil!

**Problem:**
- Tabellen refereras i:
  - `favorites` (foreign key: `listing_id`)
  - `conversations` (foreign key: `listing_id`)
  - Dokumentation (`docs/02-BACKEND_DATABASE.md`)
  - Applikationskod (används överallt)
- **RLS är INTE aktiverat** (tabellen finns troligen i databasen men saknar RLS)
- **Konsekvens:** Allmänheten kan potentiellt:
  - Läsa alla annonser (inklusive `deleted` och `sold`)
  - Se känslig data om den finns i tabellen
  - Modifiera annonser om inga policies finns

**Åtgärd krävs:**
1. Skapa `supabase/setup_listings.sql` med:
   - Tabelldefinition
   - RLS aktiverat
   - Policies enligt dokumentation:
     - Public read: Endast `status = 'active'`
     - Insert: Endast autentiserade (`auth.uid() = user_id`)
     - Update: Endast ägare (`auth.uid() = user_id`)
     - Delete: Endast ägare (`auth.uid() = user_id`)

### 2. `public.deletion_logs` ❌ **SAKNAS HELT**

**Status:** Tabellen är **INTE** definierad i någon SQL-fil!

**Problem:**
- Tabellen används i `app/dashboard/page.tsx` (rad 142)
- Dokumenterad i `docs/02-BACKEND_DATABASE.md`
- **RLS är INTE aktiverat**
- **Konsekvens:** Allmänheten kan potentiellt:
  - Läsa alla raderingsloggar
  - Se användar-ID, anledningar, annonstitlar
  - Exponera användarbeteende och analytics-data

**Åtgärd krävs:**
1. Skapa `supabase/setup_deletion_logs.sql` med:
   - Tabelldefinition
   - RLS aktiverat
   - Policies:
     - Select: Endast ägare (`auth.uid() = user_id`)
     - Insert: Endast ägare (`auth.uid() = user_id`)
     - Update: Ingen (loggar ska inte ändras)
     - Delete: Ingen eller endast admin

### 3. `listing-images` Storage Bucket ❌ **SAKNAS**

**Status:** Bucketen är **INTE** definierad i någon SQL-fil!

**Problem:**
- Bucketen används i `app/components/CreateListingForm.tsx`
- Dokumenterad i `docs/02-BACKEND_DATABASE.md`
- **RLS-policies saknas**
- **Konsekvens:** 
  - Alla kan potentiellt ladda upp bilder (om bucket är public)
  - Alla kan potentiellt radera bilder
  - Ingen kontroll över vem som laddar upp vad

**Åtgärd krävs:**
1. Skapa `supabase/setup_listing_images.sql` med:
   - Bucket-definition
   - RLS-policies för storage.objects:
     - Select: Publikt (alla kan läsa)
     - Insert: Endast autentiserade användare
     - Delete: Endast ägare (baserat på path som innehåller user_id)

---

## 📋 Sammanfattning

| Tabell | RLS Aktiverat | Policies | Status |
|--------|---------------|----------|--------|
| `profiles` | ✅ | ⚠️ Publikt läsning | ⚠️ Granska |
| `favorites` | ✅ | ✅ Komplett | ✅ Säker |
| `conversations` | ✅ | ✅ Komplett | ✅ Säker |
| `messages` | ✅ | ✅ Komplett | ✅ Säker |
| `listings` | ❌ | ❌ Saknas | 🔴 **KRITISKT** |
| `deletion_logs` | ❌ | ❌ Saknas | 🔴 **KRITISKT** |

### Storage Buckets

| Bucket | RLS Aktiverat | Policies | Status |
|--------|---------------|----------|--------|
| `avatars` | ✅ | ✅ Komplett | ✅ Säker |
| `listing-images` | ❌ | ❌ Saknas | 🔴 **KRITISKT** |

---

## 🚨 Prioriterade Åtgärder

### Prioritet 1: KRITISKT (Innan lansering)
1. ✅ Skapa `supabase/setup_listings.sql` med RLS
2. ✅ Skapa `supabase/setup_deletion_logs.sql` med RLS
3. ✅ Skapa `supabase/setup_listing_images.sql` med RLS
4. ✅ Verifiera att RLS är aktiverat på alla tabeller i produktionsdatabasen

### Prioritet 2: Granska
1. ⚠️ Granska `profiles` public read policy
   - Kontrollera om känslig data exponeras
   - Överväg att begränsa till endast visningsnamn + location för publika profiler

---

## 📝 Nästa Steg

1. Skapa de saknade setup-filerna
2. Kör migrationerna i produktionsdatabasen
3. Verifiera RLS i Supabase Dashboard
4. Testa att policies fungerar korrekt
