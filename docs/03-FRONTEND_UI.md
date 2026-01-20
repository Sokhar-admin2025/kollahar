# 🎨 Frontend & UI - Sokhar Marketplace

Detta dokument är för **Frontend-utvecklare & Designers** och beskriver designsystemet, komponentstrukturen och siduppbyggnaden.

## 🎨 Designsystem

### Tailwind CSS Setup

Sokhar använder **Tailwind CSS v4** med standardkonfiguration. Alla styles är utility-baserade, inga custom CSS-filer (förutom `globals.css` för base styles).

### Färgpalett

```css
/* Primärfärger */
--blue-600: #2563eb    /* Primär CTA, länkar */
--blue-700: #1d4ed8    /* Hover-states */
--gray-50: #f9fafb     /* Bakgrund */
--gray-100: #f3f4f6    /* Ljus bakgrund */
--gray-200: #e5e7eb    /* Borders */
--gray-500: #6b7280    /* Sekundär text */
--gray-900: #111827    /* Primär text */
--red-600: #dc2626     /* Favoriter, danger */
--green-100: #dcfce7   /* Success-states */
```

### Typografi

- **Font Family**: System fonts (sans-serif stack)
- **Headings**: `font-bold`, `font-extrabold`
- **Body**: `font-medium`, `font-semibold`
- **Sizes**: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`

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
app/components/
├── atoms/              # Små, återanvändbara komponenter
│   └── Button.tsx
├── FavoriteButton.tsx  # Molecule (atom + logik)
├── ListingCard.tsx     # Molecule (flera atoms)
└── organisms/          # Större komponenter
    └── Footer.tsx
```

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
1. **Mina Annonser** (`active`): Lista över aktiva annonser med edit/delete-knappar
2. **Sparade annonser** (`favorites`): Grid med favoriter (ListingCard)
   - Visar alla sparade favoriter i ett responsivt grid
   - Använder `ListingCard`-komponenten för konsistent utseende
   - Tomt tillstånd med länk till startsidan när inga favoriter finns
   - Hjälte-ikon (`Heart`) i fliknamnet för visuell tydlighet
3. **Mina sålda prylar** (`history`): Tabell med sålda annonser

**State Management:**
- `activeTab`: 'active' | 'favorites' | 'history'
- `activeAds`: Array av aktiva annonser
- `favoriteAds`: Array av favoriter
- `soldAds`: Array av sålda annonser

**URL Parameters:**
- `?tab=active`: Visa aktiva annonser
- `?tab=favorites`: Visa favoriter
- `?tab=history`: Visa historik

### Create Listing (`/dashboard/create`)

**Struktur:**
```
┌─────────────────────────────────────┐
│  Header                             │
│  "Skapa ny annons"  [← Tillbaka]   │
├─────────────────────────────────────┤
│  Form                               │
│  - Rubrik (text)                    │
│  - Kategori (select)                │
│  - Pris (number)                    │
│  - Plats (text)                     │
│  - Beskrivning (textarea)           │
│  - Bilder (file upload, max 5)      │
│  - [Publicera annons]               │
└─────────────────────────────────────┘
```

**Bildhantering:**
- Preview av uppladdade bilder
- Ta bort bilder (X-knapp)
- Max 5 bilder
- Max 2MB per bild
- Validering på client-side

**Submit Flow:**
1. Validera formulär
2. Ladda upp bilder till Storage
3. Hämta public URLs
4. Insert i `listings`-tabellen
5. Redirect till Dashboard

### Edit Listing (`/dashboard/edit/[id]`)

Samma struktur som Create, men:
- Formuläret är förfyllt med befintlig data
- Använder `UPDATE` istället för `INSERT`
- Validerar att användaren äger annonsen

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
- Hemsida (från `profiles.website`)
- Visas bara om profil finns

**Kontaktknapp:**
- Skapar konversation via `messageService`
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
