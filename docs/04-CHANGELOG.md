# 📝 Changelog - Kollahär Marketplace

Alla betydande ändringar i projektet dokumenteras här.

Formatet är baserat på [Keep a Changelog](https://keepachangelog.com/sv/1.0.0/), och projektet följer [Semantic Versioning](https://semver.org/lang/sv/).

## [Unreleased] (Local Development)

### ✨ Tillagt

#### Platsval med autocomplete och dropdown
- **LocationInput-komponent**: Ny komponent för platsval när användare skapar annonser
  - Autocomplete med sökfunktion (primär metod) - sök bland svenska kommuner medan du skriver
  - Dropdown med län → kommun (alternativ metod) - strukturerad val via två dropdowns
  - Validering: Endast svenska kommuner accepteras
  - Formatering: Sparas som "Kommun, Län" (t.ex. "Stockholm, Stockholms län")
  - ~290 svenska kommuner och 21 län inkluderade
  - UX: Autocomplete stängs när dropdown öppnas och vice versa

#### Testdata och konfiguration
- **Seed-data**: Korrekt seed-fil (`supabase/seed_dummy_data.sql`) med 63 testannonser
  - Använder korrekt kolumnnamn `images` (ARRAY) istället för `image_url`
  - Använder exakt angivna Unsplash-URL:er per kategori (Möbler, Fordon, Elektronik, Kläder, Övrigt)
  - Dollar quoting ($$) för title och description för att hantera specialtecken
  - 15 Möbler + 15 Fordon + 15 Elektronik + 10 Kläder + 8 Övrigt
- **Delete-script**: `supabase/delete_dummy_data.sql` för att ta bort testdata
  - Tar bort i korrekt ordning (messages → conversations → listings) för att respektera foreign keys

### 🔄 Ändrat

#### Rebranding
- **Namnbyte**: Applikationen har bytt namn från "Sokhar" till "Kollahär"
  - Alla synliga texter i UI uppdaterade (metadata, footer, alt-texter)
  - Alla dokumentationsfiler uppdaterade
  - Tekniska identifierare (package.json name) behåller "sokhar" för kompatibilitet

#### UI/UX-förbättringar
- **Hero-sektion**: Minskat spacing med 50% (`py-12 md:py-20` → `py-6 md:py-10`)
  - Logo margin, titel margin och sök-sektion spacing minskat
- **Annonslistning**: Optimerad för mobil
  - Grid: 2 kolumner på mobil istället för 1 (`grid-cols-2`)
  - ListingCard: Minskat padding på mobil (`p-4` → `p-2 md:p-4`)
  - Typografi: Mindre textstorlekar på mobil (titel `text-sm`, pris `text-sm`, plats `text-xs`)
  - Spacing: Tätare layout (`space-y-2` → `space-y-1`, `gap-6` → `gap-3`)
  - Resultat: Tätare, Pinterest/Tise-liknande vy på mobil
- **ListingCard förbättringar**:
  - Streck mellan pris och plats borttaget
  - Plats högerställd om priset på samma rad
  - Förbättrad skärpa: Ökat kontrast, större ikoner, `antialiased` på text
  - Bildkvalitet: `quality={90}` och `sizes`-prop för optimal rendering
- **Header**: Brand-text "Kolla här!" större (`text-xl` → `text-2xl md:text-3xl`) och närmare sökfältet
- **Metadata**: Uppdaterad title och description
  - Title: "Kollahär! - En marknadsplats för trygg handel"
  - Description: "Köp och sälj enkelt i en trygg marknadsplats. Var med och bygg framtiden tillsammans!"

#### EAA-kompatibilitet (Tillgänglighet)
- **Sökfunktion**: EAA-kompatibel sökfunktion med explicit sök-knapp
  - Sök-knapp inkorporerad i sökfältets högra kant (både desktop och mobil)
  - Form-submit funktionalitet: Enter-tangent fungerar för att söka
  - Real-time filtering: Resultaten uppdateras automatiskt medan användaren skriver
  - ARIA-live region: Feedback till skärmläsare när resultaten uppdateras
  - Rensningskryss: Egen kryss-knapp i temat (webbläsarens inbyggda dold via CSS)
  - Tydlig feedback: Antal träffar visas och meddelas via ARIA

#### Konfiguration
- **Next.js Image**: Lagt till `images.unsplash.com` i `next.config.ts` remotePatterns
  - Tillåter externa bilder från Unsplash för testdata
  - Fixar "hostname not configured"-fel vid rendering av seed-data bilder

---

## [1.1.0] - 2025-01-17

### ✨ Tillagt

#### User Menu & Navigation
- **UserMenu-komponent** (`app/components/UserMenu.tsx`): Ny användarmeny med avatar och dropdown
  - Hämtar användarens profil (namn, avatar) från `profiles`-tabellen
  - Visar avatar-bild om tillgänglig, annars initialer eller User-ikon
  - Dropdown-meny med länkar till Dashboard, Inställningar och Logga ut
  - Stängs vid klick utanför (click-outside detection)
  - Fullt EAA-anpassad med ARIA-attribut och tangentbordsnavigation
  - Responsiv design för både mobil och desktop
- **Header-uppdatering**: Startsidan använder nu UserMenu för inloggade användare
  - Desktop: Sökfält i mitten av headern, UserMenu till höger
  - Mobil: Sökfält dolt i header, finns kvar i Hero-sektionen
  - Ej inloggade: Visar "Logga in"-länk istället för UserMenu

#### Header & Hero Layout-optimering
- **Desktop Header**: Sökfält flyttat från Hero till mitten av headern (mellan logga och navigation)
- **Mobil Header**: Sökfält dolt, endast logga + hamburgermeny
- **Hero-sektion**: 
  - Hero-logotyp (`hero-logo.png`) dold på mobil (`hidden md:block`)
  - Undertext "Sveriges tryggaste marknadsplats..." borttagen
  - Padding reducerad (`py-12 md:py-20`) för att få annonser högre upp ("above the fold")
  - Sökfält endast synligt på mobil i Hero-sektionen
- **Kategorier**: 
  - Flyttade under Hero-texten
  - Pill-shape design (rundade knappar)
  - Minst 44px höjd för touch-vänlighet (EAA-krav)
  - Inaktiv: Vit bakgrund, grå border
  - Aktiv/Hover: `bg-brand-green` med vit text
  - Fokus-stilar för tangentbordsnavigation

#### Designsystem - Kollahär Theme
- **Typsnitt**: Implementerat Knewave för rubriker (display) och DM Sans för brödtext
  - Knewave laddas via `next/font/google` med variabel `--font-knewave`
  - DM Sans laddas via `next/font/google` med variabel `--font-dm-sans`
  - DM Sans är standard-typsnitt på `<body>` via `font-body`
- **Brand Colors**: Lagt till i Tailwind theme (via `globals.css`):
  - `brand-green: #2C4638` (från logotypen)
  - `brand-beige: #F4F3F0` (varm bakgrundsfärg)
  - `brand-text: #1A1A1A` (primär textfärg)
- **Border Radius**: Standard 12px (`rounded-xl`) för konsistent design
- **Typografi-optimering**: 
  - Knewave har justerat letter-spacing (0.0425em för normala rubriker, 0.068em för större)
  - Förbättrad line-height (1.3 för normala, 1.25 för större rubriker)
  - Font-smoothing för bättre rendering
- **Brand Identity**: Uppdaterat brand-text till "Kolla här!" (kundvagn-emoji borttagen)

#### Designsystem applicerat på hela applikationen
- **Global bakgrund**: Alla sidor använder nu `bg-brand-beige` istället för `bg-gray-50/100`
- **Innehållskort**: Alla formulär, listor och detaljvyer har `bg-white` med `rounded-xl` och `shadow-md`
- **Rubriker**: H1-rubriker använder `font-display` (Knewave) och `text-brand-green`
- **Knappar**: Primära knappar använder `bg-brand-green` med `rounded-xl` och `shadow-lg`
- **Länkar**: Sekundära länkar använder `text-brand-green` istället för blå
- **Uppdaterade sidor**:
  - Startsidan (`app/page.tsx`) - Hero, bakgrund, knappar
  - Annons-detaljsida (`app/annons/[id]/page.tsx`) - Färger, typografi, knappar
  - Login-sida (`app/login/page.tsx`) - Formulär, knappar, bakgrund
  - Dashboard (`app/dashboard/page.tsx`) - Alla flikar, modaler, tabbar
  - Create/Edit formulär (`app/components/CreateListingForm.tsx`) - Inputs, knappar
  - Settings (`app/dashboard/settings/page.tsx`) - Formulär, checkboxes
  - Messages (`app/dashboard/messages/page.tsx`) - Chat, meddelanden
  - Footer (`app/components/organisms/Footer.tsx`) - Brand-green bakgrund
  - ListingCard (`app/components/ListingCard.tsx`) - Färger, typografi
  - Button-komponent (`app/components/atoms/Button.tsx`) - Primary variant uppdaterad

### 🔧 Ändrat

#### Typografi
- **Knewave-justeringar**: 
  - Letter-spacing reducerat med 15% för tätare text
  - Line-height optimerad för bättre läsbarhet
  - Font-smoothing aktiverat för skarpare rendering
- **Rubrik-hierarki**: H1-rubriker använder Knewave, annonsrubriker använder DM Sans (bättre läsbarhet)

#### Färgschema
- **Primära actions**: Ändrat från blå (`blue-600`) till brand-green (`brand-green`)
- **Bakgrundsfärger**: Konsistent beige-bakgrund genom hela applikationen
- **Brand-beige justerad**: Uppdaterat från `#F4F3F0` till `#f2eeec` för matchning med hero-logotyp
- **Textfärger**: Brand-text används konsekvent istället för grå nyanser

#### UI-förbättringar
- **Prisvisning**: Borttaget "/mån"-suffix från `ListingCard`-komponenten
- **Hero-rubrik**: Storlek justerad för bättre visuell hierarki
- **State-synkning**: Sökfält i header och Hero använder samma `searchQuery` state

### ✨ Tillagt

#### Annonsdetaljer & Profiler
- **Listing Details (`/annons/[id]`)**: Visar nu säljarprofil via `profiles`-tabellen (namn, avatar, hemsida)
- **Profiles-tabell**: SQL-setup med trigger från `auth.users` och RLS (public read, endast ägaren får uppdatera)

#### Meddelanden & Inbox UX
- **Conversations/Messages**: SQL-setup för `public.conversations` och `public.messages` med RLS-policys
- **Inbox-layout**: Mobilanpassad chattvy där inbox och chatt delar skärm (slide-animation på små skärmar, kryss för att stänga chatt)
- **Olästa meddelanden**: 
  - Olästa konversationer markeras med blå punkt i inbox-listan
  - Konversationer sorteras så att olästa kommer överst, därefter senaste interaktion
  - Meddelanden markeras som lästa när användaren öppnar konversationen
- **Dashboard-indikator**: Blå punkt på chattikonen i dashboard-headern när användaren har olästa meddelanden

#### Dashboard & Login UX
- **Dashboard-tabs**: Flikarna `Mina Annonser`, `Sparade annonser` och `Mina sålda prylar` visar konsekvent antal i parentes (även 0)
- **Dashboard-navigering**: Länk `← Till alla annonser` ovanför flikarna för snabb återgång till startsidan
- **Login-sida**: Ny `← Tillbaka`-länk ovanför login-kortet som tar användaren till föregående sida, med fallback till startsidan

#### Redigering av Annonser
- **CreateListingForm-komponent**: Återanvändbar form-komponent för både skapande och redigering
  - Accepterar optional `initialData` prop för redigeringsläge
  - Förfyller automatiskt formulär med befintlig data när `initialData` finns
  - Dynamisk knapptext: "Publicera annons" (create) vs "Spara ändringar" (edit)
  - Smart bilduppladdning: Hanterar både befintliga bilder (kan tas bort) och nya bilder
  - Kombinerar befintliga och nya bilder vid sparning
- **Edit-sida** (`/dashboard/edit/[id]`):
  - Hämtar annons baserat på `params.id`
  - **Säkerhetskontroll**: Verifierar att användaren äger annonsen (dubbel verifiering)
  - Visar felmeddelande om annons inte hittas eller användaren saknar behörighet
  - "Tillbaka"-knapp för enkel navigering
- **Prisvalidering**: Validerar att pris är ett positivt heltal
- **Memory leak-fix**: Rensar preview-URLs korrekt vid unmount
- **Förbättrad error handling**: Tydliga felmeddelanden vid bilduppladdningsfel

#### Hero-sektion med integrerat sök
- **Modern Hero-design**: Sökfält och kategorifilter integrerade direkt i Hero-sektionen
- **Förbättrad UX**: Sökfältet är nu huvudfokus på startsidan, inspirerat av Airbnb/Blocket
- **Semi-transparenta kategoriknappar**: `bg-white/10` med `hover:bg-white/20` för elegant utseende mot mörk bakgrund
- **Stort vitt sökfält**: Stort, vitt sökfält med rundade hörn (`rounded-xl`) och skugga för tydlighet
- **CTA-knapp borttagen**: Den stora "Sälj"-knappen i Hero-sektionen är borttagen (knappen i navigation finns kvar)

#### Dashboard-flikar för Favoriter
- **Favoriter-flik**: Ny flik i Dashboard för att visa sparade favoriter
- **Grid-layout**: Favoriter visas i grid med `ListingCard`-komponenter
- **Tomt tillstånd**: Tydligt meddelande när inga favoriter finns sparade
- **URL-synkning**: Flik-state synkas med URL-parametrar (`?tab=favorites`)

### Planerat
- [ ] Server-side search med Supabase Full-Text Search
- [ ] Filter på pris, plats, datum
- [ ] Sortering (pris, datum, relevans)
- [ ] Email-notifikationer för nya meddelanden
- [ ] Push-notifikationer (PWA)
- [ ] Bildkomprimering på servern
- [ ] Analytics-integration (med GDPR-samtycke)

### 📚 Dokumentation
- **Roadmap & Go-Live Checklist** (`docs/05-ROADMAP.md`): Ny roadmap-fil som samlar alla planerade features, tekniska förbättringar och go-live-krav
  - Go-Live Checklist med status för varje område
  - Planerade features prioriterade (Hög/Medel/Låg)
  - Design & UI backlog (Chatt-styling, Footer, UserMenu, Favicon, SEO Metadata, Om oss-sida)
  - Tekniska förbättringar och rekommenderad prioritering
  - Status-sammanfattning med antal klara/planerade features
- **Start-guide uppdaterad** (`docs/00-START_HERE.md`): Länk till roadmap-filen tillagd i dokumentationsindexet

### 🔧 Ändrat

#### Dokumentation
- **Roadmap-fil**: Skapad `docs/05-ROADMAP.md` med komplett roadmap och go-live checklist
- **Start-guide**: Uppdaterad med länkar till roadmap-filen

---

## [1.0.0] - 2025-01-16

### ✨ Tillagt

#### Dashboard Tabs
- **Mina Annonser-tab**: Lista över aktiva annonser med edit/delete-knappar
- **Favoriter-tab**: Grid med sparade favoriter (ListingCard)
- **Historia-tab**: Tabell med sålda annonser (datum, titel, pris, såld-datum)
- Tab-navigation med URL-parametrar (`?tab=active`, `?tab=favorites`, `?tab=history`)
- Tab-state synkas med URL för bookmarking

#### Favorites System
- **Favorites-tabell**: Junction-tabell för användares favoriter
- **FavoriteButton-komponent**: Toggle-knapp för att spara/ta bort favoriter
- **Optimistic updates**: Omedelbar UI-feedback vid favorit-toggle
- **RLS Policies**: Säkerhet för favorites (användare kan bara se/ändra sina egna)
- **Migration**: `20260116090000_create_favorites.sql` skapad

#### Image Upload
- **Bilduppladdning**: Stöd för upp till 5 bilder per annons
- **Storage Bucket**: `listing-images` bucket konfigurerad
- **Bildvalidering**: Max 2MB per bild, JPEG/PNG/WebP
- **Bildförhandsvisning**: Preview av uppladdade bilder innan publicering
- **Bildgalleri**: Huvudbild + thumbnails på detaljsidan
- **Bildoptimering**: Automatisk komprimering via `lib/image-utils.ts`

#### Settings Page
- **Profilhantering**: Uppdatera namn, hemsida, avatar
- **Avatar Upload**: Ladda upp profilbild till `avatars` bucket
- **GDPR-samtycken**: Checkboxes för marknadsföring och analytics
- **Profil-tabell**: `profiles`-tabell med GDPR-fält

#### Messages System
- **Konversationer**: Skapa konversationer mellan köpare och säljare
- **Meddelanden**: Skicka och ta emot meddelanden
- **MessageService**: Abstraktioner för meddelandehantering
- **Inbox**: Lista över alla konversationer
- **Chat**: Meddelandevisning med realtidsuppdatering

#### Delete Modal
- **Radera Annons**: Modal med anledning för radering
- **Anledningar**: 
  - "Såld här" (markerar som `sold`, sätter `deleted_at`)
  - "Såld någon annanstans" (raderar helt)
  - "Vill bara ta bort den" (raderar helt)
- **Deletion Logs**: Loggning av raderade annonser för analytics

### 🔧 Ändrat

#### Create Listing Page
- **Refaktorering**: Extrakterad formulärlogik till återanvändbar `CreateListingForm`-komponent
- **Förenklad struktur**: Create-sidan är nu enkel wrapper som renderar `CreateListingForm`
- **Konsistens**: Samma komponent används för både create och edit, säkerställer konsistent UX

#### Supabase Client Setup
- **SSR Package**: Migrerat till `@supabase/ssr` för korrekt cookie-hantering
- **Client Components**: Använder `createBrowserClient` från `@supabase/ssr`
- **Server Components**: Använder `createServerClient` från `@supabase/ssr`
- **Middleware**: Uppdaterad för att hantera cookies korrekt

#### Dashboard Struktur
- **Centralisering**: Alla användarspecifika funktioner samlade i `/dashboard`
- **Tab-navigation**: Istället för separata sidor
- **URL-synkning**: Tab-state synkas med URL-parametrar

#### ListingCard Komponent
- **FavoriteButton**: Integrerad i ListingCard (visas bara om inte ägare)
- **Bildhantering**: Använder Next.js Image-komponent
- **Responsive**: Grid-layout med breakpoints

### 🐛 Fixat

#### Auth Issues
- **Multiple GoTrueClient**: Fixat genom att instansiera klienter utanför komponenter
- **Cookie Handling**: Korrekt cookie-hantering via `@supabase/ssr`
- **Session Persistence**: Sessioner persisteras korrekt mellan sidladdningar

#### Image Upload
- **File Size Validation**: Validering av filstorlek på client-side
- **File Type Validation**: Endast JPEG/PNG/WebP tillåts
- **Error Handling**: Tydliga felmeddelanden vid uppladdningsfel

### 🔒 Säkerhet

#### RLS Policies
- **Listings**: Public read för aktiva annonser, auth krävs för create/update/delete
- **Favorites**: Användare kan bara se/ändra sina egna favoriter
- **Profiles**: Public read, endast ägare kan uppdatera
- **Conversations**: Användare kan bara se sina egna konversationer
- **Messages**: Användare kan bara läsa meddelanden i sina konversationer

#### Input Validation
- **Client-side**: Formulärvalidering i React
- **Server-side**: RLS Policies i Supabase
- **Type Safety**: TypeScript-typer för alla API-anrop

### 📚 Dokumentation

#### Dokumentationsstruktur
- **00-START_HERE.md**: Onboarding-guide för nya utvecklare
- **01-SYSTEM_ARCHITECT.md**: Systemarkitektur med Mermaid-diagram
- **02-BACKEND_DATABASE.md**: Backend och databasdokumentation
- **03-FRONTEND_UI.md**: Frontend och UI-dokumentation
- **04-CHANGELOG.md**: Versionshistorik (denna fil)

## [0.1.0] - 2025-01-01 (Initial Release)

### ✨ Tillagt

#### Grundläggande Funktioner
- **Autentisering**: Email/password via Supabase Auth
- **Listings**: Skapa, läsa, uppdatera, radera annonser
- **HomePage**: Startsida med sök och filter
- **Dashboard**: Grundläggande dashboard för användare
- **Listing Details**: Detaljsida för annonser

#### Tech Stack
- **Next.js 16**: App Router
- **TypeScript**: Typ-säkerhet
- **Supabase**: Backend (Auth, Database, Storage)
- **Tailwind CSS**: Styling
- **Lucide React**: Ikoner

#### Komponenter
- **Button**: Återanvändbar knapp-komponent
- **ListingCard**: Kort för att visa annonser
- **Navigation**: Header med navigation

---

## Versionsformat

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): Nya features (bakåtkompatibla)
- **Patch** (0.0.X): Bugfixes (bakåtkompatibla)

## Kategorier

- **✨ Tillagt**: Nya features
- **🔧 Ändrat**: Ändringar i befintlig funktionalitet
- **🐛 Fixat**: Bugfixes
- **🔒 Säkerhet**: Säkerhetsrelaterade ändringar
- **📚 Dokumentation**: Dokumentationsuppdateringar
- **🗑️ Borttaget**: Borttagna features

---

**Senast uppdaterad**: 2025-01-17 (Designsystem implementerat)
