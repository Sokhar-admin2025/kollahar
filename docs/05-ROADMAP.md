# 🗺️ Roadmap & Go-Live Checklist - Sokhar Marketplace

Detta dokument samlar alla planerade features, tekniska förbättringar och go-live-krav för Sokhar.

**Status-ikoner:**
- ✅ **Klart** - Implementerat och testat
- 🚧 **Pågående** - Under utveckling
- 📋 **Planerat** - Planerat men inte påbörjat
- ⚠️ **Varning** - Kräver uppmärksamhet innan go-live

---

## 📋 Go-Live Checklist (Inför Publik Lansering)

### 🔐 Säkerhet & Autentisering
- ✅ **RLS Policies** - Alla tabeller har Row Level Security
- ✅ **Auth Checks** - Skyddade routes kontrollerar autentisering
- ✅ **Input Validation** - Client + server-side validering
- ✅ **GDPR-samtycken** - Profil-sida med consent-checkboxes

### 💬 Meddelanden & Kommunikation
- ✅ **Chatt-system** - Conversations + Messages med RLS
- ✅ **Olästa indikatorer** - Blå prick i inbox + dashboard
- ✅ **Mobil-chatt** - Slide-animation för små skärmar
- 📋 **Email-notifikationer** - Se "Planerade Features" nedan
- 📋 **Push-notifikationer (PWA)** - Se "Planerade Features" nedan

### 🎨 UI/UX & Design
- ✅ **Designsystem** - Knewave + DM Sans, brand-färger, konsistent styling
- ✅ **Responsive design** - Mobile-first, alla breakpoints
- ✅ **Dashboard-tabs** - Konsekvent antal-visning, navigering
- ✅ **Login UX** - Tillbaka-länk med router.back()
- ✅ **Säljarprofiler** - Visas på annonsdetaljer

### 🗄️ Databas & Backend
- ✅ **Profiles-tabell** - Med trigger från auth.users
- ✅ **Conversations/Messages** - Fullständig setup med RLS
- ✅ **Favorites** - Junction-tabell med RLS
- ✅ **Storage buckets** - listing-images + avatars med RLS
- ✅ **SQL-setup skript** - Alla migrations dokumenterade

### 🔍 Sök & Filter
- ✅ **Client-side sök** - Söker i titel + beskrivning
- ✅ **Kategorifilter** - Fungerar client-side
- 📋 **Server-side search** - Se "Planerade Features" nedan
- 📋 **Filter på pris/plats/datum** - Se "Planerade Features" nedan
- 📋 **Sortering** - Se "Planerade Features" nedan

### 🖼️ Bildhantering
- ✅ **Bilduppladdning** - Max 5 bilder, 2MB, validering
- ✅ **Client-side komprimering** - Via `lib/image-utils.ts` (max 1920px, JPEG 0.8)
- 📋 **Server-side komprimering** - Se "Tekniska Förbättringar" nedan

### 📱 Prestanda & Optimering
- ✅ **Next.js Image** - Optimerad bildhantering
- ✅ **Server Components** - Där det är möjligt
- ✅ **Code Splitting** - Automatisk via App Router
- 📋 **Analytics-integration** - Se "Planerade Features" nedan

---

## 🚀 Planerade Features (Prioriterat)

### 🔴 Hög prioritet (Inför Go-Live)

#### 1. Email-notifikationer för nya meddelanden
**Status:** 📋 Planerat  
**Beskrivning:**  
- Skicka e-post när användare får nytt meddelande i en konversation
- Användare ska kunna slå av/på notiser i Settings (`/dashboard/settings`)
- Implementera via Supabase Edge Functions eller tredjepartstjänst (t.ex. Resend, SendGrid)

**Tekniska krav:**
- Ny kolumn i `profiles`: `email_notifications_enabled` (boolean, default true)
- Edge Function eller API Route som triggas när nytt meddelande skapas
- Email-template med länk till konversationen
- Inställning i Settings-sidan för att styra notiser

**Relaterade filer:**
- `app/dashboard/settings/page.tsx` - Lägg till checkbox för email-notiser
- `supabase/setup_profiles.sql` - Lägg till kolumn (eller ny migration)
- Ny fil: `supabase/functions/send-message-notification/index.ts` (eller API Route)

**Anteckningar:**
- Dokumenterat i `.notebooks/dev-notes.ipynb`
- Listat i `docs/04-CHANGELOG.md` → Planerat

---

#### 2. Migrera från `middleware.ts` till `proxy.ts` (Next.js 16)
**Status:** ⚠️ Varning  
**Beskrivning:**  
- Next.js 16 varnar: `The "middleware" file convention is deprecated. Please use "proxy" instead.`
- Byt namn på `middleware.ts` → `proxy.ts` och uppdatera export-struktur

**Tekniska krav:**
- Byta filnamn: `middleware.ts` → `proxy.ts`
- Uppdatera export enligt Next.js 16 proxy-konvention
- Testa att auth-redirects fortfarande fungerar

**Relaterade filer:**
- `middleware.ts` - Byt namn och uppdatera
- `docs/01-SYSTEM_ARCHITECT.md` - Uppdatera dokumentation

**Anteckningar:**
- Varning visas i build-logg men blockerar inte deployment
- Bör fixas innan större Next.js-uppgradering

---

### 🟡 Medel prioritet (Efter Go-Live)

#### 3. Server-side search med Supabase Full-Text Search
**Status:** 📋 Planerat  
**Beskrivning:**  
- Förbättra sökfunktionen med Supabase Full-Text Search
- Sök i `title`, `description`, `category`, `location`
- Stöd för fuzzy matching och relevans-sortering

**Tekniska krav:**
- Skapa Full-Text Search index på `listings`-tabellen
- Uppdatera `app/page.tsx` eller skapa API Route för sökning
- Implementera relevans-scoring

**Relaterade filer:**
- `app/page.tsx` - Uppdatera söklogik eller flytta till API Route
- Ny SQL-migration för Full-Text Search index

**Anteckningar:**
- Listat i `docs/04-CHANGELOG.md` → Planerat
- Dokumenterat i `docs/01-SYSTEM_ARCHITECT.md` → Framtida Förbättringar

---

#### 4. Filter på pris, plats, datum
**Status:** 📋 Planerat  
**Beskrivning:**  
- Lägg till filter för prisintervall (min/max)
- Filter på plats (städer, områden)
- Filter på datum (nyaste först, äldsta först, etc.)

**Tekniska krav:**
- UI-komponenter för filter (dropdowns, sliders)
- Uppdatera söklogik i `app/page.tsx` eller API Route
- Validering av filter-input

**Relaterade filer:**
- `app/page.tsx` - Lägg till filter-UI och logik

**Anteckningar:**
- Listat i `docs/04-CHANGELOG.md` → Planerat

---

#### 5. Sortering (pris, datum, relevans)
**Status:** 📋 Planerat  
**Beskrivning:**  
- Möjlighet att sortera annonser på:
  - Pris (lägst/högst)
  - Datum (nyaste/äldsta)
  - Relevans (vid sökning)

**Tekniska krav:**
- UI-komponent för sorterings-dropdown
- Uppdatera query-logik i `app/page.tsx` eller API Route

**Relaterade filer:**
- `app/page.tsx` - Lägg till sorterings-UI och logik

**Anteckningar:**
- Listat i `docs/04-CHANGELOG.md` → Planerat

---

#### 6. Push-notifikationer (PWA)
**Status:** 📋 Planerat  
**Beskrivning:**  
- Konvertera appen till Progressive Web App (PWA)
- Push-notifikationer för nya meddelanden (med användarens tillstånd)
- Offline-stöd för grundläggande funktioner

**Tekniska krav:**
- PWA-manifest (`manifest.json`)
- Service Worker för offline-stöd
- Push API-integration med Supabase eller tredjepartstjänst
- Notisinställningar i Settings

**Relaterade filer:**
- Ny fil: `public/manifest.json`
- Ny fil: `public/sw.js` (Service Worker)
- `app/dashboard/settings/page.tsx` - Lägg till push-notisinställningar

**Anteckningar:**
- Listat i `docs/04-CHANGELOG.md` → Planerat

---

### 🟢 Låg prioritet (Nice to Have)

#### 7. Server-side bildkomprimering
**Status:** 📋 Planerat  
**Beskrivning:**  
- Flytta bildkomprimering från client till server (Edge Function eller API Route)
- Automatisk komprimering vid upload till Supabase Storage

**Tekniska krav:**
- Edge Function eller API Route som hanterar bildkomprimering
- Uppdatera `app/components/CreateListingForm.tsx` för att använda server-side processing

**Relaterade filer:**
- `lib/image-utils.ts` - Flytta logik till server eller Edge Function
- `app/components/CreateListingForm.tsx` - Uppdatera upload-flöde

**Anteckningar:**
- Client-side komprimering fungerar redan via `lib/image-utils.ts`
- Server-side skulle ge bättre prestanda för stora bilder

---

#### 8. Analytics-integration (med GDPR-samtycke)
**Status:** 📋 Planerat  
**Beskrivning:**  
- Integrera analytics (t.ex. Google Analytics, Plausible, eller Supabase Analytics)
- Respektera GDPR-samtycke (`consent_analytics` i `profiles`)

**Tekniska krav:**
- Välj analytics-provider
- Implementera tracking endast om `consent_analytics = true`
- Cookie-banner eller inställningar i Settings

**Relaterade filer:**
- `app/dashboard/settings/page.tsx` - Analytics-consent redan implementerat
- Ny fil: `app/lib/analytics.ts` - Analytics-wrapper

**Anteckningar:**
- Listat i `docs/04-CHANGELOG.md` → Planerat
- GDPR-consent redan implementerat i Settings

---

## 🔧 Tekniska Förbättringar

### Next.js & TypeScript
- ⚠️ **Middleware → Proxy** - Migrera till Next.js 16 proxy-konvention (se punkt 2 ovan)
- 📋 **TypeScript strict mode** - Aktivera strict mode för bättre type safety
- 📋 **Error boundaries** - Lägg till React Error Boundaries för bättre felhantering

### Prestanda
- 📋 **Image optimization** - Ytterligare optimering av bildhantering
- 📋 **Caching-strategier** - Implementera caching för statiska resurser
- 📋 **Bundle size** - Analysera och optimera bundle-storlek

### Säkerhet
- ✅ **RLS Policies** - Alla tabeller skyddade
- 📋 **Rate limiting** - Implementera rate limiting för API-anrop
- 📋 **CSP Headers** - Content Security Policy headers

### Testing
- 📋 **Unit tests** - Lägg till unit tests för kritiska funktioner
- 📋 **E2E tests** - End-to-end tester för användarflöden
- 📋 **Accessibility testing** - Verifiera EAA-kompatibilitet

---

## 📊 Status-sammanfattning

**Klart (✅):** 15+ features  
**Pågående (🚧):** 0 features  
**Planerat (📋):** 8 features  
**Varning (⚠️):** 1 teknisk skuld (middleware → proxy)

---

## 🎯 Rekommenderad Prioritering Inför Go-Live

### Fase 1: Kritiskt (Innan Publik Lansering)
1. ⚠️ Migrera `middleware.ts` → `proxy.ts` (Next.js 16-kompatibilitet)
2. 📋 Email-notifikationer för nya meddelanden + inställningar

### Fase 2: Viktigt (Efter Initial Lansering)
3. 📋 Server-side search med Full-Text Search
4. 📋 Filter på pris/plats/datum
5. 📋 Sortering

### Fase 3: Nice to Have
6. 📋 Push-notifikationer (PWA)
7. 📋 Server-side bildkomprimering
8. 📋 Analytics-integration

---

**Senast uppdaterad:** 2025-01-17  
**Nästa granskning:** Vid go-live-planering
