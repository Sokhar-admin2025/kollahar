# 🎨 Frontend & UI - Kollahär Marketplace

Detta dokument är för **Frontend-utvecklare & Designers** och beskriver designsystemet, komponentstrukturen och siduppbyggnaden.

## 🎨 Designsystem

### Tailwind CSS Setup

Kollahär använder **Tailwind CSS v4** med standardkonfiguration. Alla styles är utility-baserade, inga custom CSS-filer (förutom `globals.css` för base styles).

### Färgpalett (Kollahär Brand Colors)

```css
/* Brand Colors - Definierade i globals.css */
--color-brand-green: #2C4638    /* Primär accent, knappar, länkar */
--color-brand-beige: #F4F3F0     /* Bakgrundsfärg, varm och mjuk */
--color-brand-text: #1A1A1A      /* Primär textfärg */

/* Användning i Tailwind */
bg-brand-green      /* Grön bakgrund */
text-brand-green    /* Grön text */
bg-brand-beige      /* Beige bakgrund */
text-brand-text     /* Primär text */
```

### Typografi

- **Display Font (Rubriker)**: **Knewave** - Lekfull, handskriven stil för H1-rubriker
  - Används via `font-display` class
  - Letter-spacing: 0.0425em (normal), 0.068em (stora rubriker)
  - Line-height: 1.3 (normal), 1.25 (stora rubriker)
  - Font-smoothing aktiverat för bättre rendering
- **Body Font**: **DM Sans** - Modern, läsbar sans-serif för brödtext
  - Används via `font-body` class (standard på `<body>`)
  - Laddas via `next/font/google`
- **Font Sizes**: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`

### Spacing

Använder Tailwind's standard spacing scale:
- `p-2`, `p-4`, `p-6`, `p-8` för padding
- `gap-2`, `gap-4`, `gap-6` för gaps
- `mb-4`, `mb-6`, `mb-8` för margins

### Border Radius

- `rounded`: 4px (små element)
- `rounded-lg`: 8px (kort, formulär)
- `rounded-xl`: 12px (stora kort)
- `rounded-full`: 50% (knappar, avatars)

### Shadows

- `shadow-sm`: Subtila skuggor
- `shadow-md`: Medelstora skuggor
- `shadow-lg`: Stora skuggor
- `shadow-xl`: Extra stora skuggor

## 🧩 Komponenter

### Atomic Design Struktur

Komponenter är organiserade enligt Atomic Design:

```
app/
├── context/
│   └── HeaderOptionsContext.tsx   # Context för header-sök (startsidan)
├── components/
│   ├── atoms/
│   │   └── Button.tsx
│   ├── layout/
│   │   ├── CookieConsent.tsx
│   │   └── LayoutWithHeader.tsx  # Wrapper: Header + HeaderOptionsProvider + children
│   ├── FavoriteButton.tsx
│   ├── InboxClient.tsx           # Meddelanden/inkorg (Realtime-prenumeration)
│   ├── ListingCard.tsx
│   └── organisms/
│       ├── Footer.tsx
│       └── Header.tsx            # Får initialUserId/initialIsVerified från layout (server)
└── ...
```

**Header & auth:** Header renderas i rot-layouten via `LayoutWithHeader`. Användaren hämtas på servern (`app/layout.tsx`) och skickas som `initialUserId`/`initialIsVerified` så att det inte flimrar mellan "Logga in" och profil. Sökfältet i headern styrs via `HeaderOptionsContext` när användaren är på startsidan.

**Publika säljprofiler:** Sidan `/profil/[id]` (`app/profil/[id]/page.tsx`) visar säljarens profil (avatar/namn, BadgeCheck vid verifierat företag, "Medlem sedan", webbplats, statistik, aktiva annonser). Företagsprofiler är öppna för alla; privata kräver inloggning och redirectar till `/login?reason=private_profile&next=/profil/[id]`. Efter inloggning skickas användaren tillbaka till `next`. På annonssidan är säljarkortet en länk till `/profil/[user_id]` och verifierade företag får BadgeCheck bredvid namnet.

### Button Component

**Plats:** `app/components/atoms/Button.tsx`

**Variants:**
- `primary`: Blå bakgrund, vit text (standard)
- `secondary`: Svart bakgrund, vit text
- `danger`: Röd bakgrund, vit text
- `ghost`: Grå bakgrund, mörk text
- `icon`: Minimal, för ikoner
- `link`: Understruken text, ingen bakgrund

**Användning:**
```typescript
import Button from '@/app/components/atoms/Button'

<Button variant="primary" onClick={handleClick}>
  Klicka här
</Button>

<Button variant="icon" title="Radera">
  <TrashIcon />
</Button>
```

**Props:**
```typescript
interface ButtonProps {
  children: ReactNode
  onClick?: (e: any) => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'link'
  disabled?: boolean
  className?: string
  title?: string
  type?: 'button' | 'submit'
}
```

**Accessibility:**
- `focus:ring-2` för tangentbordsnavigation
- `focus:outline-none` för custom focus-styling
- `aria-label` via `title` prop för ikoner

### ListingCard Component

**Plats:** `app/components/ListingCard.tsx`

**Syfte:** Visar en annons i kortformat (används på startsidan och i favoriter).

**Props:**
```typescript
interface ListingCardProps {
  listing: Listing
  currentUserId?: string | null
}
```

**Funktionalitet:**
- Visar första bilden från `listing.images`
- Formaterar pris med svenska format (`new Intl.NumberFormat('sv-SE')`)
- Visar kategori-badge
- Visar plats med ikon
- Inkluderar FavoriteButton (om inte ägare)
- Länkar till `/annons/[id]`

**Layout:**
```
┌─────────────────────┐
│  [Bild]  [Kategori] │
│                     │
│  [FavoriteButton]   │
├─────────────────────┤
│  Titel              │
│  Pris / mån        │
│  📍 Plats          │
└─────────────────────┘
```

**Responsive:**
- Mobile: Full bredd
- Tablet: 2 kolumner (`md:grid-cols-2`)
- Desktop: 3-4 kolumner (`lg:grid-cols-4`)

### FavoriteButton Component

**Plats:** `app/components/FavoriteButton.tsx`

**Syfte:** Toggle-knapp för att spara/ta bort favoriter.

**Funktionalitet:**
- Optimistic update (byt färg direkt)
- Kollar favorit-status vid mount
- Toggle favorit i Supabase
- Rollback vid fel

**Styling:**
- Vit bakgrund med backdrop-blur
- Röd fylld när favorit, grå när inte
- Hover-effekt: scale och färgändring

**Accessibility:**
- `aria-label="Spara som favorit"`
- `preventDefault()` för att stoppa navigation

### CookieConsent Component

**Plats:** `app/components/layout/CookieConsent.tsx`

**Syfte:** Global cookie consent-banner som visas för användare utan samtycke.

**Funktionalitet:**
- Kontrollerar `localStorage.getItem('cookie_consent')` vid mount
- Visar bannern endast om consent saknas
- Vid "OK"-klick: Sparar `'true'` i localStorage och döljer bannern
- Komponenten renderar `null` om consent redan finns (visas inte igen)

**Design:**
- Fixed bottom med `z-50` (ligger ovanpå allt innehåll)
- Mörkgrön bakgrund (`#1a2e26`)
- Vit text, responsiv layout
- Desktop: flex-row (text vänster, knappar höger)
- Mobil: flex-column (text överst, knappar under)
- OK-knapp: Grön bakgrund (`bg-brand-green`), vit text
- "Läs mer": Understruken länk till `/cookies`

**Accessibility:**
- `role="banner"` och `aria-label="Cookie consent"`
- Focus states på knappen för tangentbordsnavigation
- Hover-effekter för bättre UX

**Integration:**
- Integrerad globalt i `app/layout.tsx`
- Visas på alla sidor för nya besökare
- Försvinner permanent efter att användaren klickat "OK"

## 📄 Sidstruktur

### Dashboard (`/dashboard`)

Dashboard är **centralhubben** för användaren. Alla användarspecifika funktioner finns här.

**Struktur:**
```
┌─────────────────────────────────────┐
│  Header                             │
│  - Välkommen + Email                │
│  - Meddelanden (ikon)               │
│  - Inställningar (ikon)             │
│  - Logga ut                         │
├─────────────────────────────────────┤
│  CTA Card                           │
│  "Har du något nytt på gång?"      │
│  [+ Sälj något]                     │
├─────────────────────────────────────┤
│  Tabs                               │
│  [Mina Annonser] [Favoriter] [Hist]│
├─────────────────────────────────────┤
│  Content Area (Tab-specific)         │
│  - Active: Lista med edit/delete    │
│  - Favorites: Grid med ListingCard  │
│  - History: Tabell med sålda        │
└─────────────────────────────────────┘
```

**Tabs:**
1. **Mina Annonser** (`active`): Lista över aktiva annonser med edit/delete-knappar (visar antal i parentes)
2. **Sparade annonser** (`favorites`): Grid med favoriter (ListingCard)
   - Visar alla sparade favoriter i ett responsivt grid
   - Använder `ListingCard`-komponenten för konsistent utseende
   - Tomt tillstånd med länk till startsidan när inga favoriter finns
   - Fliktext: `Sparade annonser` + antal i parentes (även när det är 0)
3. **Mina sålda prylar** (`history`): Tabell med sålda annonser
   - Fliktext: `Mina sålda prylar` + antal i parentes (även när det är 0)
   - Datum för publicering och såld-datum visas i tabell

**Navigering från Dashboard:**
- Liten länk uppe till höger ovanför flikarna: `← Till alla annonser` som leder till startsidan (`/`).

**State Management:**
- `activeTab`: 'active' | 'favorites' | 'history'
- `activeAds`: Array av aktiva annonser
- `favoriteAds`: Array av favoriter
- `soldAds`: Array av sålda annonser

**URL Parameters:**
- `?tab=active`: Visa aktiva annonser
- `?tab=favorites`: Visa favoriter
- `?tab=history`: Visa historik

### CreateListingForm Component

**Plats:** `app/components/CreateListingForm.tsx`

**Syfte:** Återanvändbar form-komponent för både att skapa och redigera annonser.

**Props:**
```typescript
interface CreateListingFormProps {
  initialData?: Listing  // Optional - om den finns är det edit-läge
  onSuccess?: () => void // Optional callback vid lyckad sparning
}
```

**Funktionalitet:**
- **Dual Mode**: Identifierar automatiskt om det är create eller edit mode baserat på `initialData`
- **Auto-fill**: Förfyller formulär med `initialData` när det finns
- **Dynamisk knapptext**: "Publicera annons" (create) eller "Spara ändringar" (edit)
- **Bildhantering**:
  - **Create mode**: Lägger till nya bilder med preview
  - **Edit mode**: Visar befintliga bilder + kan lägga till nya / ta bort gamla
  - Kombinerar befintliga och nya bilder vid sparning
- **Validering**: 
  - Pris måste vara positivt heltal
  - Max 5 bilder totalt (befintliga + nya)
  - Max 2MB per bild
- **Säkerhet**: Verifierar ägare vid redigering (dubbel kontroll)

**State Management:**
- `title`, `description`, `price`, `location`, `category`: Formulärfält
- `imageFiles`: Array av nya filer att ladda upp
- `imagePreviews`: Preview-URLs för nya bilder
- `existingImageUrls`: URL:er för befintliga bilder (edit mode)
- `uploading`: Loading-state för bilduppladdning
- `loading`: Loading-state för form submission

**Memory Management:**
- Rensar preview-URLs korrekt vid unmount för att förhindra memory leaks

### Create Listing (`/dashboard/create`)

**Struktur:**
```
┌─────────────────────────────────────┐
│  Header                             │
│  "Skapa ny annons"  [← Tillbaka]   │
├─────────────────────────────────────┤
│  CreateListingForm                  │
│  (utan initialData)                 │
│  - Rubrik (text)                    │
│  - Kategori (select)                │
│  - Pris (number)                    │
│  - Plats (text)                     │
│  - Beskrivning (textarea)           │
│  - Bilder (file upload, max 5)      │
│  - [Publicera annons]               │
└─────────────────────────────────────┘
```

**Implementation:**
- Enkel wrapper som renderar `CreateListingForm` utan `initialData`
- All formulärlogik finns i `CreateListingForm`-komponenten

**Submit Flow:**
1. Validera formulär
2. Ladda upp bilder till Storage
3. Hämta public URLs
4. Insert i `listings`-tabellen
5. Redirect till Dashboard

### Edit Listing (`/dashboard/edit/[id]`)

**Struktur:**
```
┌─────────────────────────────────────┐
│  Header                             │
│  "Redigera annons"  [← Avbryt]     │
├─────────────────────────────────────┤
│  Loading / Error State              │
│  (hämtar annons, verifierar ägare)  │
├─────────────────────────────────────┤
│  CreateListingForm                  │
│  (med initialData={listing})        │
│  - Rubrik (pre-filled)              │
│  - Kategori (pre-filled)            │
│  - Pris (pre-filled)                │
│  - Plats (pre-filled)               │
│  - Beskrivning (pre-filled)         │
│  - Bilder (befintliga + nya)        │
│  - [Spara ändringar]                │
└─────────────────────────────────────┘
```

**Implementation:**
1. **Hämtning**: Hämtar annons baserat på `params.id`
2. **Säkerhetskontroll**: Verifierar att `listing.user_id === user.id`
3. **Render**: Renderar `CreateListingForm` med `initialData={listing}`
4. **Felhantering**: Visar tydliga felmeddelanden om:
   - Annonsen inte hittas
   - Användaren saknar behörighet
   - Ett oväntat fel uppstår

**Bildhantering i Edit Mode:**
- **Befintliga bilder**: Visas från `listing.images` (kan tas bort med X-knapp)
- **Nya bilder**: Kan läggas till med samma upload-funktionalitet
- **Kombinering**: Vid sparning kombineras `[...existingImageUrls, ...uploadedImageUrls]`
- **Ta bort**: När en befintlig bild tas bort, försvinner den från `existingImageUrls`

**Submit Flow:**
1. Validera formulär
2. Ladda upp nya bilder till Storage
3. Kombinera befintliga och nya bild-URLs
4. Update i `listings`-tabellen (med dubbel säkerhetskontroll)
5. Redirect till Dashboard

### Listing Details (`/annons/[id]`)

**Struktur:**
```
┌─────────────────────────────────────┐
│  [← Tillbaka till alla annonser]    │
├─────────────────────────────────────┤
│  [Bildgalleri]  │  [Info]           │
│                 │  - Titel          │
│                 │  - Pris           │
│                 │  - Plats          │
│                 │  - Beskrivning    │
│                 │  - Säljarkort     │
│                 │  - [Kontakta]     │
└─────────────────────────────────────┘
```

**Bildgalleri:**
- Stor huvudbild
- Thumbnails under (om fler än 1 bild)
- Klick på thumbnail ändrar huvudbild

**Säljarkort:**
- Avatar (från `profiles.avatar_url`)
- Namn (från `profiles.full_name`)
- Plats / Hemvist (från `profiles.location`)
- Visas bara om profil finns

**Kontaktknapp:**
- Skapar konversation via `createConversationAction` (message-actions)
- Redirectar till `/dashboard/messages`
- Disabled om annonsen är såld

### HomePage (`/`)

**Struktur:**
```
┌─────────────────────────────────────┐
│  Navigation                         │
│  [Brand]  [Min sida] [Sälj något]  │
├─────────────────────────────────────┤
│  Hero Section                       │
│  "Hitta fynd eller sälj..."        │
│  [Stort vitt sökfält]              │
│  [Kategoriknappar]                 │
├─────────────────────────────────────┤
│  Annons-Galleri                     │
│  [Grid med ListingCard]            │
└─────────────────────────────────────┘
```

**Hero Section:**
- **Bakgrundsbild med overlay**: Mörk bakgrundsbild (`bg-gray-900`) med gradient overlay
- **Integrerat sök**: Sökfältet är nu huvudfokus och ligger direkt i Hero-sektionen
- **Stort vitt sökfält**: 
  - Stor, vit bakgrund (`bg-white`) med rundade hörn (`rounded-xl`)
  - Sökikon till vänster (`pl-14`)
  - Stort padding (`py-5`) för tydlighet
  - Skugga (`shadow-lg`) för djup
- **Semi-transparenta kategoriknappar**:
  - `bg-white/10` för inaktivt tillstånd
  - `hover:bg-white/20` för hover
  - `bg-white/30` för aktiv kategori
  - `backdrop-blur-sm` för glasmorphism-effekt
  - Vit text (`text-white`) för kontrast mot mörk bakgrund
- **Responsive textstorlek**: `text-4xl md:text-6xl` för rubrik
- **Centrerad layout**: Allt är centrerat med `max-w-3xl mx-auto`
- **CTA-knapp borttagen**: Den stora "Sälj"-knappen är borttagen från Hero (finns kvar i navigation)

**Sök & Filter:**
- **Client-side filtering**: Filtrering sker direkt i webbläsaren
- **Söker i `title` och `description`**: Case-insensitive sökning
- **Filter på `category`**: Kategoriknappar för snabb filtrering
- **Realtidsuppdatering**: Resultat uppdateras direkt när användaren skriver eller väljer kategori
- **Integrerat i Hero**: Sök och filter är nu en del av Hero-sektionen för bättre UX

## 🎯 Accessibility (EAA)

### Tangentbordsnavigation

- Alla interaktiva element har `focus:ring-2`
- Tab-order är logisk
- Skip-links för huvudinnehåll

### Skärmläsare

- Semantiska HTML-element (`<nav>`, `<main>`, `<header>`)
- `aria-label` på ikoner
- Alt-text på bilder
- Formulärlabels kopplade till inputs

### Färgkontrast

- Text på bakgrund: Minst 4.5:1 kontrast
- Interaktiva element: Tydlig hover-state

### Formulär

- Alla inputs har labels
- Felmeddelanden är tydliga
- Validering sker både client och server-side

## 📱 Responsive Breakpoints

```css
/* Mobile First */
default: < 640px

/* Tablet */
sm: 640px
md: 768px

/* Desktop */
lg: 1024px
xl: 1280px
```

### Grid Layouts

**ListingCard Grid:**
- Mobile: `grid-cols-1`
- Tablet: `md:grid-cols-2`
- Desktop: `lg:grid-cols-4`

**Dashboard Content:**
- Mobile: Stacked
- Desktop: Side-by-side (bildgalleri + info)

## 🎨 Design Patterns

### Loading States

```typescript
{loading ? (
  <div className="text-center py-20 text-gray-400">
    Laddar annonser...
  </div>
) : (
  // Content
)}
```

### Empty States

```typescript
{items.length === 0 ? (
  <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
    <p className="text-gray-500 text-lg">Inga annonser hittades</p>
  </div>
) : (
  // Content
)}
```

### Error States

```typescript
{error && (
  <div className="bg-red-100 text-red-700 p-3 rounded text-sm text-center">
    {error.message}
  </div>
)}
```

## 🔤 Text-hantering

Alla texter centraliseras i `app/lib/content.ts`:

```typescript
export const DASHBOARD_TEXTS = {
  navigation: {
    brand: "🛒 Min Marknadsplats",
    myPage: "Min sida",
    sellBtn: "Sälj något"
  },
  // ...
}
```

**Användning:**
```typescript
import { DASHBOARD_TEXTS } from '@/app/lib/content'
const t = DASHBOARD_TEXTS

<h1>{t.header.title}</h1>
```

**Fördelar:**
- Enkel översättning (lägg till språk-nyckel)
- Konsistent text genom hela appen
- Enkel A/B-testing

## 🖼️ Bildhantering

### Next.js Image Component

Används i `ListingCard`:

```typescript
import Image from 'next/image'

<Image
  src={listing.images[0]}
  alt={listing.title}
  fill
  className="object-cover"
/>
```

**Fördelar:**
- Automatisk optimering
- Lazy loading
- Responsive sizing

### Bildoptimering

Bilder komprimeras via `lib/image-utils.ts`:
- Max dimension: 1920px
- Format: JPEG
- Kvalitet: 0.8

---

**Nästa steg**: Läs [Changelog](./04-CHANGELOG.md) för att se versionshistoriken.
