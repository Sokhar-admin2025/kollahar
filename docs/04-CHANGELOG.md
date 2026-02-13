# 📝 Changelog - Kollahär Marketplace

Alla betydande ändringar i projektet dokumenteras här.

Formatet är baserat på [Keep a Changelog](https://keepachangelog.com/sv/1.0.0/), och projektet följer [Semantic Versioning](https://semver.org/lang/sv/).

## [Unreleased]

### ✨ Tillagt

#### Prestandaoptimering: bildoptimering och bundle analyzer
- **Bildoptimering för bättre leverans:**
  - Hero-bild (`hero-logo.png`): Bytte från `<img>` till `next/image` med `priority` och `sizes="128px"` för snabbare LCP
  - Annonsdetalj huvudbild: Bytte från `<img>` till `next/image` med `priority` och responsiva `sizes`
  - Annonsdetalj thumbnails: Bytte från `<img>` till `next/image` med lazy loading (`sizes="80px"`)
  - ListingCard: Första 6 bilderna (ovanför fold) har nu `priority` för snabbare initial rendering
- **Hårdare komprimering av uppladdade bilder** (`lib/image-utils.ts`):
  - Maxdimension sänkt från 1920px → 1600px
  - JPEG-kvalitet sänkt från 0.8 → 0.75 för mindre filstorlek utan märkbar kvalitetsförlust
- **ListingCard bildkvalitet:** Tog bort explicit `quality={90}`, använder nu Next.js standard (~75) för bättre balans
- **Bundle analyzer:** Lagt till `@next/bundle-analyzer` med script `npm run analyze` för att identifiera stora bundles och optimeringsmöjligheter

### 🔧 Ändrat / Buggfixar

#### Mobil filter-drawer: "Visa resultat"-knappen alltid nårbar
- **Problem:** På mobil hamnade knappen bakom webbläsarens nedre fält; användare kunde inte scrolla ned eller nå den.
- **Åtgärd:** Drawer höjd minskad till 85dvh/85vh; extra padding-bottom (`calc(env(safe-area-inset-bottom)+5rem)`) på knappsektionen så den alltid ligger ovanför browser bar.
- **Viewport:** `viewportFit: 'cover'` i layout för att aktivera safe-area-inset på enheter med notch.

#### Mobil filter: ingen dubbel "Rensa filter"
- **Problem:** Två "Rensa filter"-knappar syntes i mobil drawern (en i filterFields, en i sticky bottom).
- **Åtgärd:** "Rensa filter" i filterFields dold på mobil (`hidden md:block`); endast drawerns sticky bottom har den på mobil. Desktop behåller den i filterFields.

### 📋 Planerat

- **Båt-specifika attribut:** Filter för längd i fot, båttyp m.m. (kategori Båtar)
- **Cookie-banner compliance:** Uppdatera för Sentry Tracking/Replay (explicit samtycke)
- **Städning:** Ta bort `/sentry-example-page` när Sentry-loggar är verifierade

---

## [1.3.0] - 2026-02-04

### ✨ Tillagt

#### Sentry fel- och prestandaövervakning
- **@sentry/nextjs** ^10.38.0: Felrapportering, performance tracing, session replay.
- **Konfiguration:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` + `next.config.ts` med `withSentryConfig`.
- **Tunnel:** `/monitoring` för att undvika ad-blockers på client-side rapportering.
- **instrumentation.ts:** Server/edge-registrering; `onRequestError` för request-fel.
- **app/global-error.tsx:** Fångar okända fel och skickar till Sentry.
- **Exempel:** `/sentry-example-page` och `/api/sentry-example-api` för att verifiera att Sentry fungerar.
- **.gitignore:** `.env.sentry-build-plugin` tillagd.

---

## [1.2.0] - 2026-02-04

### ✨ Tillagt

#### Favorit-toast för oinloggade
- **FavoriteButton:** När oinloggad användare klickar på hjärtat visas en toast med "Logga in för att spara favoriter." (amber-600, samma placering som Välkommen-toast).
- **FavoritLoginToastContext:** Nytt context med provider i LayoutWithHeader; FavoriteButton använder `showFavoritLoginToast()` vid klick utan inloggning.

#### Listvy-bar responsiv: Filter alltid synlig + Sortera-menyn
- **Filter-knapp:** Alltid synlig på alla skärmstorlekar. Vid tight viewport försvinner den inte längre.
- **En Filter-knapp:** Hero-Filter-knappen borttagen på mobil – endast baren ovanför listan har Filter.
- **Sortera-menyn (xl):** Vid viewport < 1280px visas en "Sortera"-knapp som öppnar en dropdown med: Sorteringsval (Senaste, Äldsta, Pris), Listvy (Av/På), Säljare (Alla/Privat/Företag).
- **Sortera-menyn position:** `left-0` + `max-w-[calc(100vw-2rem)]` så menyn inte flyger ut till vänster på smal viewport.
- **Vid xl+:** Full inline-layout med Listvy, Säljare, Sortera-dropdown och Filter.
- **Desktop-filter:** Visas från md (768px) istället för lg.

#### Säljartyp-toggle (Alla | Privat | Företag)
- **I listvy-baren:** 3-alternativs toggle bredvid Listvy och Sortera – Alla, Privat, Företag. Synlig på xl+. Inte i filterpanelen.
- **URL:** `?seller=private` | `?seller=company`
- **Filter-chip:** "Företag" eller "Privat" visas när aktivt, klickbar för att ta bort.
- **Listing-service:** `sellerType` i getListings filtrerar mot profiles.account_type.

#### Företag tydligare i listvy och detaljsida
- **ListingCard**: Visar "Företag i (location)" för företagsannonser istället för enbart plats. MapPin-ikon borttagen. Privat: endast plats.
- **Annonsdetalj header**: "Företag i (location)" för företag, utan plats-pin.
- **Säljarkort**: MapPin borttagen. Vid plats: "Företag i X" för företag. Utan plats: "Företag på Kolla här!" för företag, "Medlem på Kolla här!" för privat.
- **Listing-service**: getListings, getUserListings, getActiveListingsByUserId, getFavoriteListings hämtar nu seller_type (account_type) från profiles.

#### Lösenordssida för inloggade användare
- **`/dashboard/settings/password`**: Ny sida för lösenordshantering. Två sektioner: (1) **Glömt lösenord** – skicka återställningslänk till e-post (pre-fylld med inloggad e-post); (2) **Byt lösenord** – nuvarande + nytt + bekräfta. Skyddad av dashboard-middleware.
- **Inställningar**: Länk "Hantera lösenord" ersätter inline-formuläret.

#### Inbox: namn, tre-punkts-menyn, Radera chatt (soft delete)
- **Vänster lista + höger header:** Visar "Annonsrubrik – med (namn)" (motpartens namn från profiles).
- **Tre-punkts-menyn:** I höger panelens header; öppnar dropdown med "Radera chatt".
- **Radera chatt:** Soft delete – chatten döljs för användaren (andra personen ser den kvar). Bekräftelsedialog innan radering. Migration `20260212100000_user_hidden_conversations.sql` skapar tabellen `user_hidden_conversations`.

#### Miljöer: Dev / Preview / Production
- **`docs/ENVIRONMENTS.md`**: Guide för tre miljöer – Dev (local), Preview (Vercel PR), Production (live). Tabeller, steg-för-steg, Vercel env vars. Ny sektion "Deploy – hur och när" med git-flöde för Preview vs Production.
- **`.env.example`**: Mall med `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **`docs/GO_LIVE_CHECKLIST.md`**: Ny sektion "Miljöer" högst upp med checklista.
- **`README.md`**, **`docs/00-START_HERE.md`**: Referenser till `.env.example` och `docs/ENVIRONMENTS.md`.

#### Listvy + "Visar X av Y annonser"
- **Listvy-toggle**: Knappar "Av" | "På" till vänster om Sortera – växlar mellan kortvy och radvy.
- **ListingCard** (`layout="list"`): Kompakt radvy med bild, titel, specs, kategori, plats, datum, pris. Kolumnlayout (grid), alternerande radfärg, font-medium för läsbarhet.
- **Visar X av Y annonser**: `getListings` returnerar `totalCount` (Supabase `count: 'exact'`). Texten visas efter "Senaste annonserna". Vid flera platser: "Visar X annonser".

#### Felkod för användarrapportering
- **`lib/error-ref.ts`**: `createErrorRef()`, `withErrorRef()` – kort felkod (t.ex. E7K3M9) visas för användare, loggas för utvecklare.
- **Listing-service**, **CreateListingForm**: Användarfel inkluderar "(Felkod: XYZ)" så användare kan ange vid support.

#### Bortskänkes (gratisannonser)
- **Migration** (`supabase/migrations/20260211100000_add_bortskankes_to_listings.sql`): Ny kolumn `bortskankes boolean NOT NULL DEFAULT false` på `listings`. När true sparas pris som 0; i UI visas "Bortskänkes" istället för pris.
- **Skapa/redigera annons** (`CreateListingForm`): Checkbox "Bortskänkes" under Pris; vid ikryssad gråmarkeras prisfältet och inaktiveras (användaren kan ej fylla i pris). Validering: pris minst 1 kr när ej bortskänkes.
- **Visning**: ListingCard, annonsdetaljsida, Dashboard (aktiva + historik), Inbox (chattheader) visar "Bortskänkes" istället för pris när `bortskankes` är true.
- **Filter**: Checkbox "Visa endast bortskänkes" i filterpanelen; kombineras med kategori, plats och sök.
- **Sortering**: Vid pris lågt→högt hamnar bortskänkes (pris 0) först; vid högt→lågt sist.

---

### 🔧 Ändrat / Buggfixar (senaste)

#### Bilfilter Färg: dropdown istället för fritext
- **HomePageClient**: Färg-filtret använder nu samma lista som skapa annons – `CAR_COLORS` + "Annan" (dropdown).

#### Visa fler annonser: inga duplicerade nycklar
- **HomePageClient** (`handleLoadMore`): Deduplicerar nya annonser mot befintliga (`existingIds`) innan append, förhindrar React "duplicate key"-fel.

#### Listvy: pris/favorit överlappning + kolumnlayout
- **ListingCard** (list layout): Grid med fasta kolumner, pris och favorit i egna kolumner (ingen överlappning).
- **ListingCard**: Sekundär text (kategori, plats, datum, specs) har `font-medium` för bättre läsbarhet.

#### Reset-password: visas inte som inloggad
- **Header** (`app/components/organisms/Header.tsx`): På `/reset-password` visas header som utloggad (`showAsLoggedOut`), så användaren inte upplevs som inloggad under lösenordsåterställning. Knappar "Logga in" och "Sälj" navigerar till `/login`.

#### Favicon i produktion
- **`app/icon.png`**, **`app/apple-icon.png`** – Next.js file convention (KOLLA HÄR-logotypen). Ikoner genereras automatiskt av Next.js.
- **`public/favicon.png`** – backup; används som källa.

#### Chatt: inga dubbletter av meddelanden
- **InboxClient** (`app/components/InboxClient.tsx`): Optimistisk uppdatering vid skickat meddelande borttagen – meddelanden visas enbart när Realtime levererar dem. Åtgärdar bugg där egna meddelanden syntes två gånger (temp + Realtime). Vid send-fel återställs texten i fältet.

#### Företag: badge och företagsinformation
- **Profilsida** (`app/profil/[id]/page.tsx`): Badge (BadgeCheck) visas för alla företagskonton (`account_type === 'company'`). Ny sektion "Företagsinformation" för företag: org.nummer, adress, företagspresentation (bio).
- **Annonssida** (`app/annons/[id]/page.tsx`): Säljarkortet visar företags-badge för alla företag (ej endast vid `is_company_verified`).

#### Upgrade privat → företag: verifiering krävs
- **Inställningar** (`app/dashboard/settings/page.tsx`): Vid upgrade sätts `otp_verified: false` i profilen; OTP skickas till ny e-post (`signInWithOtp`); användaren redirectas till `/login/verify?email=...&from=upgrade`. Inloggning blockeras tills ny e-post verifierats.
- **Verify-sida** (`app/login/verify/VerifyPageContent.tsx`): Använder användar-id från `verifyOtp`-svaret så `otp_verified` alltid sätts; vid "Skicka ny kod" används `shouldCreateUser: false` när `from=upgrade`.
- **Header** (`app/components/organisms/Header.tsx`): Vid `otp_verified === false` görs en refetch efter 400 ms innan utloggning, så att race efter verify-sidan undviks.

#### Inställningar: e-post aldrig i Min plats
- **Inställningar** (`app/dashboard/settings/page.tsx`): Eget skrivskyddat fält "Användarnamn / e-post" för privatkonto. "Min plats" använder `LocationInput` med `autoComplete="off"` så webbläsaren inte fyller i e-post.
- **LocationInput** (`app/components/LocationInput.tsx`): Ny prop `autoComplete` (t.ex. `"off"` på inställningssidan).

#### Skapa/uppdatera annons: attributes inte null
- **Listing-service** (`lib/features/listings/listing-service.ts`): `createListing` och `updateListing` skickar `attributes: data.attributes ?? {}` istället för `null` så att NOT NULL-kolumnen i `listings` inte orsakar fel.

#### Verify efter inloggning: otp_verified sätts tillförlitligt
- **Verify-sida** (`app/login/verify/VerifyPageContent.tsx`): Användar-id hämtas från `verifyOtp`-svaret (`otpData?.user?.id`); vid misslyckad profiluppdatering visas fel och ingen redirect.

#### Build: TypeScript profil-sida
- **Profilsida** (`app/profil/[id]/page.tsx`): Non-null assertion på `profileResult.data` efter guard; `stats` sätts alltid till definierad (defaultStats vid misslyckad/undefined statsResult.data) så `stats.byCategory` är säker.

---

### ✨ Tillagt

#### Publika säljprofiler (/profil/[id])
- **Typer** (`lib/types.ts`): Ny `Profile` med `account_type`, `website`, `is_company_verified`, `org_number`, `created_at` (optional så att det fungerar innan migration).
- **Migration** (`supabase/migrations/20260207100000_profiles_public_seller_fields.sql`): Kolumner på `profiles`: `created_at`, `account_type` (default 'private'), `website`, `is_company_verified`, `org_number`.
- **Profile-service** (`lib/features/profiles/profile-service.ts`): `getPublicProfile(userId)` hämtar profildata; `getProfileStats(userId)` returnerar antal sålda och uppdelning per kategori (endast kategorier med count > 0).
- **Listing-service** (`lib/features/listings/listing-service.ts`): `getActiveListingsByUserId(userId)` hämtar användarens aktiva annonser för profilsidan.
- **Profilsida** (`app/profil/[id]/page.tsx`): Åtkomst: företagsprofil visas för alla; privat profil kräver inloggning – annars redirect till `/login?reason=private_profile&next=/profil/[id]`. UI: avatar (eller första bokstaven), namn, BadgeCheck vid verifierat företag, "Medlem sedan [år]" (från `created_at`), webbplatslänk, statistik (tidigare försäljningar + per kategori), grid med aktiva annonser (ListingCard).
- **Login** (`app/login/LoginPageContent.tsx`): Banner när `reason=private_profile`: "Du måste logga in för att se privata säljprofiler." Efter lyckad inloggning: om `next` finns och är säker (relativ sökväg) redirect till `next`, annars till startsida.
- **Annonssida** (`app/annons/[id]/page.tsx`): Säljarkortet (avatar + namn) är klickbart länk till `/profil/[user_id]`. BadgeCheck visas bredvid säljarens namn när `account_type === 'company'` och `is_company_verified`.

#### Header: server-side auth (ingen flimmer)
- **Layout** (`app/layout.tsx`): Rot-layouten är async och hämtar användaren med `createClient()` (server) + `auth.getUser()` samt `profile.otp_verified`. Skickar `initialUserId` och `initialIsVerified` till en klient-wrapper.
- **LayoutWithHeader** (`app/components/layout/LayoutWithHeader.tsx`): Klientkomponent som renderar Header (med server-user) och children; använder `HeaderOptionsProvider` så att startsidan kan styra sökfält via context.
- **Header** (`app/components/organisms/Header.tsx`): Tar emot `initialUserId` och `initialIsVerified` som props; använder dem som initial state (`useState(initialUserId)` etc.) så att första render visar rätt (Logga in vs profil) utan väntan på klient-auth. `onAuthStateChange` behålls för live-uppdatering vid in/utloggning. Sök på startsidan styrs via `useHeaderOptions()` (context).
- **HeaderOptionsContext** (`app/context/HeaderOptionsContext.tsx`): Context för `showSearch`, `searchQuery`, `onSearchChange`, `onSearchSubmit`, `onClearSearch`. HomePageClient sätter dessa när `pathname === '/'`.
- **Sidor**: Header är borttagen från alla undersidor; den renderas endast en gång i layouten.

#### Sålda annonser: visa som "Såld" istället för 404
- **Listing-service** (`lib/features/listings/listing-service.ts`): `getListingById` filtrerar redan inte på status. `updateListingStatus` sätter inte längre `deleted_at` vid status `'sold'` så att annonsen kan visas för alla.
- **RLS** (`supabase/migrations/20260206100000_public_read_sold_listings.sql`): Ny policy "Public read sold listings" (`status = 'sold'`) så att besökare kan läsa sålda annonser.
- **Annonssida** (`app/annons/[id]/page.tsx`): `isSold = listing.status === 'sold' || !!listing.deleted_at`. Vid såld: tydlig banner "Tyvärr, denna vara är såld", bilder med opacity-75, "Kontakta säljare"-knappen döljs (ersatt med "Denna vara är inte längre till salu").

#### Realtime-chatt (Supabase Realtime)
- **InboxClient** (`app/components/InboxClient.tsx`): I en `useEffect` som körs när `selectedConversation` ändras skapas en Supabase Realtime-channel mot tabellen `messages` med filter `conversation_id=eq.${id}` och event INSERT. Nya meddelanden från motparten läggs till i state (med deduplicering mot optimistiska egna meddelanden). Cleanup: `supabase.removeChannel(channel)` vid byte av konversation.

#### Chatt stängd när varan såld/borttagen
- **Message-service** (`lib/features/messages/message-service.ts`): `getMyConversations` hämtar nu `listing.status` och `listing.deleted_at` i join. Ny funktion `isConversationListingClosed(supabase, conversationId)`; `sendMessage` kastar om annonsen är såld/borttagen ("Chatten är stängd – varan är såld eller borttagen.").
- **Message-actions** (`app/actions/message-actions.ts`): `sendMessageAction` returnerar felmeddelandet vid stängd chatt.
- **Typer** (`app/types/index.ts`): `Conversation.listing` utökad med `status?` och `deleted_at?`.
- **InboxClient**: `isListingClosed(conv)` (status sold/deleted eller listing saknas). Konversationslistan visar badge "Såld" på stängda chattar. I chatten: notis "Varan är såld/borttagen. Chatten är stängd – du kan läsa föregående meddelanden men inte skicka nya."; skrivfältet ersatt med text "Du kan inte skicka nya meddelanden – chatten är stängd." Meddelandehistoriken visas fortfarande (read-only).

#### Städning inför MVP: enhetlig listing-service + middleware-säkerhet
- **Listing-service:** Den gamla `app/services/listingService.ts` (getAllActive, getById med env-baserad Supabase-klient) är borttagen. All listing-logik används nu enbart från `lib/features/listings/listing-service.ts` (getListings, getListingById, getUserListings, createListing, updateListing, toggleFavorite, getFavoriteListings, getFavoriteIds) med server-klient (cookies). Inga app-filer importerade den gamla modulen; dokumentation (00-START_HERE, 01-SYSTEM_ARCHITECT, 02-BACKEND_DATABASE, HEALTH_CHECK_ARCHITECTURE) uppdaterad.
- **Middleware:** Skyddade rutter (`/dashboard`, `/fav*`) redirectar nu till `/login` när användaren saknar session: villkoret är `isProtected && (error || !user)` så att både fel från `getUser()` och saknad användare ger redirect. Inga redirect-loopar (på `/login` redirectas endast inloggade användare till `/dashboard`).

#### Favoriter: Server Components + Server Action (wire-up)
- **Listing-service** (`lib/features/listings/listing-service.ts`): `getFavoriteListings(userId)` hämtar användarens sparade annonser som fulla `Listing[]`; `getFavoriteIds(userId)` returnerar bara favorit-IDs (undviker N+1); `toggleFavorite(userId, listingId)` lägger till eller tar bort favorit.
- **Server Action** (`app/actions/favorite-actions.ts`): `toggleFavoriteAction(listingId)` – kräver inloggning, anropar `toggleFavorite`, `revalidatePath('/dashboard')` och `revalidatePath('/')`.
- **Dashboard** (`app/dashboard/page.tsx`): Hämtar `getFavoriteListings(user.id)` på servern och skickar `favoriteListings` till DashboardClient; fliken "Sparade annonser" använder alltså serverdata (ingen klient-`useEffect`).
- **DashboardClient**: Tar emot `favoriteListings` som prop; vid borttagning av favorit anropas `router.refresh()` så att sidan får ny data.
- **FavoriteButton**: Använder `toggleFavoriteAction` istället för direkt Supabase; optional prop `isFavorited` (när satt ingen egen fetch). Om `isFavorited` ej skickas (t.ex. annonssida) görs en fetch i `useEffect` för det kortet.
- **Startsida** (`app/page.tsx`): Hämtar vid behov `getFavoriteIds(user.id)` på servern och skickar `favoriteIds` till HomePageClient; varje ListingCard får `isFavorited={favoriteIds.includes(ad.id)}` – inga N+1-anrop per kort.
- **ListingCard**: Ny prop `isFavorited?: boolean` som skickas till FavoriteButton.

#### Skapa/redigera annons: Server Actions + Zod
- **Validering** (`lib/validators/listing-schema.ts`): Zod-schema för create/update med svenska felmeddelanden (titel 3–100 tecken, beskrivning 10–5000, pris ≥ 0, kategori och plats min 1 tecken; images och attributes valfria).
- **Server Actions** (`app/actions/listing-actions.ts`): `createListingAction` och `updateListingAction` – safeParse, auth, anrop till listing-service, `revalidatePath`; vid fel returneras `fieldErrors` (plattade så att t.ex. `attributes.mileage` även finns under nyckeln `mileage` för enkel åtkomst i formuläret).
- **Listing-service** (`lib/features/listings/listing-service.ts`): `createListing` och `updateListing` med server-Supabase, returnerar `ServiceResult<{ id: string }>`.
- **CreateListingForm**: Använder actions för submit; fel från servern visas med röd ram och röd feltext (title, location, price, category, description, fordonsfält). Normaliserar `fieldErrors` från action så att alla fält får korrekt visning. **LocationInput** har prop `hasError` för röd ram vid platsfel.
- **Regler:** Pris kan vara 0 för alla annonser. Skick är **valfritt** (inte obligatoriskt). Växellåda är **obligatoriskt** för bilar och placerat under Drivmedel; klientvalidering kräver växellåda vid bilannons.

#### Dashboard refaktor: Server Component + listing-service
- **RLS** (`supabase/migrations/20260205100000_listings_own_select_policy.sql`): Ny policy "Users can view all own listings" (`auth.uid() = user_id`) så att användare kan se alla egna annonser (aktiva + sålda) i Historik-fliken.
- **Listing-service** (`lib/features/listings/listing-service.ts`): `getUserListings(userId)` hämtar alla annonser för användaren (sorterat `created_at` desc). `deleteListing(listingId, userId)` verifierar ägande och utför hård DELETE. `updateListingStatus(listingId, status, userId)` sätter status (t.ex. `'sold'`) och `deleted_at` vid såld.
- **Server Actions** (`app/actions/listing-actions.ts`): `deleteListingAction(listingId, logReason?, adTitle?)` och `markAsSoldAction(listingId, logReason?, adTitle?)`; båda loggar till `deletion_logs` vid behov och anropar `revalidatePath('/dashboard')`.
- **Dashboard-sida** (`app/dashboard/page.tsx`): Async Server Component – hämtar användare (redirect till `/login` om ej inloggad), anropar `getUserListings(user.id)` och skickar data till `<DashboardClient />`.
- **DashboardClient** (`app/components/DashboardClient.tsx`): Ny klientkomponent med flikar (Aktiva, Sparade, Historik), radlista för Aktiva (oförändrad UI), grid för Sparade, tabell med horisontell scroll för Historik. Ta bort/såld-modal anropar Server Actions och `router.refresh()` efter lyckat svar.

#### Listningsflöde: server-side filter, paginering och refetch
- **Listing-service** (`lib/features/listings/listing-service.ts`): `getListings(filters)` med `ListingSearchFilters` (query, category, location, min/max pris, år, mil, bilfilter, offset, limit, sort). `getListingById(id)` för annonsdetalj. Alla filter tillämpas i Supabase-query.
- **API-route** (`app/api/listings/route.ts`): POST `/api/listings` tar emot `{ filters }` och anropar `getListings` på servern. HomePageClient använder denna route för refetch vid filterändring och "Visa fler"-paginering (undviker att anropa Server Action direkt från klienten – fixar "getListings is not defined").
- **Startsida** (`app/page.tsx`, `app/HomePageClient.tsx`): Initial data från `getListings(searchParams)`; filter (inkl. plats county/mun) synkas till URL; filter-chips och sortering; vid filterändring refetch via `fetch('/api/listings', { method: 'POST', body: JSON.stringify({ filters: buildFilters(0) }) })`; "Visa fler" använder samma API med `offset: ads.length`. Vid flera valda platser (län/kommun) skickas ingen plats till servern; client-side `filteredAds` applicerar OR-logik så att alla valda platser visas (t.ex. Stockholms län + Östergötlands län ger 3+2 = 5 bilar).
- **Bilfilter på servern**: `ListingSearchFilters` och `getListings` utökade med fuel, gearbox, bodyType, driveWheel, color, horsepowerMin, horsepowerMax (attributes JSONB). `buildFilters()` i HomePageClient skickar alla bilfilter; client-side `filteredAds` används endast för flera platser (servern får en plats-term).
- **Annonsdetalj** (`app/annons/[id]/page.tsx`): Hämtar med `getListingById`; fel visas i toast med "Stäng"; tillbaka-länk med `backUrl` som bevarar alla filter-parametrar (county/mun).
- **Kategori-byte**: När användaren byter från Bilar till annan kategori rensas bilfilter (år, mil, bränsle, växellåda, kaross, drivhjul, färg, hk) via `resetCarFilters()` i `handleCategoryChange`.

#### Prisfilter: PriceInput med combobox och kontextberoende förslag
- **price-utils** (`lib/features/listings/price-utils.ts`): `STANDARD_PRICES` (50–20 000), `HIGH_VALUE_PRICES` (50 000–1 500 000); `getPriceOptions(category)` returnerar HIGH_VALUE för fordonskategorier (cars, mc, boats, etc.), annars STANDARD; `formatPrice(value)` (sv-SE med mellanslag); `parsePrice(value)` tar bort mellanslag och returnerar number eller null.
- **PriceInput** (`app/components/PriceInput.tsx`): Input med dropdown vid fokus; visar formaterat pris; användaren kan skriva fritt eller välja från listan; props: value, onChange, label, options, placeholder.
- **HomePageClient**: Min/Max-pris använder två PriceInput med `getPriceOptions(selectedCategory)`; validering: om min > max visas texten "Lägsta pris kan inte vara högre än högsta pris".

#### Platsfilter med riktiga counts (get_location_stats)
- **RPC** `get_location_stats(category_filter, search_query, min_price, max_price)` i `supabase/migrations/20260204100000_get_location_stats.sql`: Returnerar antal aktiva annonser per location. Alla parametrar är valfria; `COALESCE(..., '') = ''` för text; null för pris innebär ingen filtrering. Pris: `(min_price is null or price >= min_price)` och `(max_price is null or price <= max_price)` så att plats-siffrorna speglar valt prisintervall (t.ex. "Max 150 000 kr" minskar antalen per län/kommun).
- **Location-service** (`lib/features/location/location-service.ts`): `LocationStatsParams` och RPC-anrop utökade med `minPrice` och `maxPrice`.
- **Frontend**: LocationFilter tar emot `minPrice`/`maxPrice` från HomePageClient och skickar dem till `getLocationStats`; anropar RPC vid mount och när `selectedCategory`, `searchQuery`, `minPrice` eller `maxPrice` ändras. `mergeLocationCounts()` i `lib/swedish-locations.ts` slår ihop RPC-svar med LOCATION_TREE (län = summa kommuner). Siffrorna (N) bredvid län/kommun uppdateras enligt kategori, söktext och prisintervall.

#### Stabil main-layout och scrollbar-fix (inga krympande annonser)
- **Main-container**: Alltid `w-full max-w-7xl mx-auto px-4`; rubriken "Senaste annonserna" och annonsgridet ligger i samma bredd-begränsade container oavsett antal träffar eller om filter är öppet/stängt.
- **Tomt tillstånd ("Inga annonser")**: List-området har `w-full min-h-[50vh]` så containern inte krymper; tomt-meddelandet är centrerat inuti utan att påverka förälderns bredd.
- **Header**: Bredd uppdaterad till `max-w-7xl` så den linjerar med main.
- **Filter-knapp**: Flyttad från fast vänsterflik till samma rad som "Senaste annonserna" och "X träffar" (desktop), så annonserna inte påverkas av filter-öronen.
- **Scrollbar så att annonser inte krymper**: Ny komponent `ScrollbarGutter.tsx` mäter scrollbar-bredd och sätter `--scrollbar-width`; i `globals.css` får `html` alltid `padding-right: var(--scrollbar-width)` (alla viewports) så innehållets bredd inte hoppar när användaren skriver i sökfältet eller filtrerar – annonskorten behåller höjd.
- **LOCATION_TREE**: Byggs från befintliga `SWEDISH_LAN` + `SWEDISH_KOMMUNER` (alla 21 län och alla kommuner) i `lib/swedish-locations.ts`; platsfiltret använder denna lista med "Visa alla län" / "Visa fler kommuner (+X)".

#### Avancerad platsfilter (LocationFilter) och desktop-filter som overlay
- **LocationFilter-komponent** (`app/components/LocationFilter.tsx`): Checkbox-träd för län/kommun med sök, progressive disclosure och chips-vänlig state
  - Data från `LOCATION_TREE` i `lib/swedish-locations.ts` (label/value/count, sorterad efter befolkningsmängd)
  - Default: endast sökruta + knapp "Välj län i lista"; listan visas vid klick eller när användaren skriver
  - Knapp "Göm lista" när listan är synlig; "Visa alla län" / "Visa alla kommuner" under topp 8 län resp. 10 kommuner
  - State: `fullCounties` (hela länet valt) och `partialMunicipalities` (enskilda kommuner); chips enligt scenario A/B/C
- **Desktop-filter som fixed overlay**: Sidebaren är `fixed inset-y-0 left-0 z-50`, bredd 350px, glider in/ut med transition; annonserna påverkas inte
  - Backdrop (fixed, bg-black/40, z-40) vid öppet filter; klick utanför stänger panelen
  - Filter-tabben visas när panelen är stängt, döljs när panelen är öppen
- **Layout**: Annons-gallret och header använder `max-w-7xl mx-auto px-4`; filter-knappen ligger i rubrikraden ("Senaste annonserna").

#### ListingCard och detaljsida - UX-förbättringar
- **Pris-styling**: Priset är nu högerställt på egen rad i ListingCard för bättre visuell hierarki
- **Location-visning**: Endast kommun visas i annonskort och detaljsida (t.ex. "Täby" istället för "Täby, Stockholms län")
  - Om location innehåller komma, visas endast första delen (kommunen)
  - Om location saknar komma, visas hela strängen (region)
- **Bil-specifikationer i ListingCard**: Kompakt textsträng med bullet separator (•) för bilannonser
  - Format: `Modellår • Miltal • Växellåda • Drivmedel`
  - Visas endast för bilannonser (`category === 'cars'`)
- **Badge för extremt skick**: Visas endast för icke-fordon när skick är "Ny" eller "Defekt"
  - Grön badge för "Ny", orange badge för "Defekt"
- **Bildetaljer på detaljsidan**: Grid-system med ikoner för att visa alla bil-attribut
  - Ikoner för Modellår, Miltal, Växellåda, Drivmedel, Karosstyp, Färg, Hästkrafter, Drivhjul, Märke & Modell
  - Responsiv grid: 2 kolumner på mobil, 3 på desktop

#### Ta bort "Skick"-fält för fordon
- **CreateListingForm**: "Skick"-fältet döljs för alla fordon-kategorier (bilar, båtar, MC, husvagn, övrigt fordon)
  - "Skick" är endast obligatoriskt för icke-fordon
  - "Skick" sparas inte i `attributes` för fordon
- **ListingCard**: "Skick"-badge visas endast för icke-fordon
- **Detaljsidan**: "Skick"-visning döljs för alla fordon-kategorier
- **Defensiv kodning**: Kontrollerar alltid om kategorin tillhör fordon-gruppen innan "Skick" visas eller sparas

#### SQL-migration för dummy-data
- **Ny migration** (`supabase/migrations/20260131000000_update_dummy_data.sql`): Uppdaterar dummy-data för att fungera med ny struktur
  - Mappar om kategorier från gamla textvärden till nya ID:n
  - Genererar JSONB attributes för bilar med slumpad data (make, model, year, mileage, fuel, gearbox)
  - Genererar enkla attributes för övriga kategorier (condition)
  - Slumpat pris för bilar mellan 50 000 och 400 000 kr
  - Redo att köras i Supabase SQL Editor för testning av filter

### ✨ Tillagt

#### UX-renovering av sökfilter (startsidan)
- Ersatt sliders för pris, modellår och miltal med:
  - Två exakta nummerfält för pris (min/max).
  - Två dropdowns för modellår (från/till) med spann 1990–nuvarande år + 1.
  - En dropdown för max miltal med tydliga steg (1000, 3000, 5000, 10000, 15000, 20000+).
- Infört hierarkiskt platsfilter baserat på `SWEDISH_LOCATIONS`:
  - Fält 1: Län – multi-select där användaren kan välja flera län.
  - Fält 2: Kommun – multi-select som aktiveras först när minst ett län är valt och visar kommuner för valda län.
  - Filtreringen använder OR-logik mellan valda län och kommuner utan att skapa dubletter (en annons visas bara en gång även om både län och kommun matchar).
- Lagt till rad med aktiva filter-chip ovanför resultatlistan:
  - Visar valda kategori, län, kommuner, prisintervall och bilspecifika filter (år, miltal, drivmedel, växellåda, kaross, drivhjul, färg, effekt).
  - Chips går endast att rensa (inte redigera) – klick på X på ett chip tar bort just det filtret.
  - Att ta bort ett län-chip tar bort alla kommuner som hör till det länet, men lämnar kommuner från andra län orörda.
- Förbättrat mobilens filter-drawer:
  - Fullhöjdspanel med scrollbart filterinnehåll och en fast bottendel med en tydlig primärknapp: “Visa X resultat”.
  - Gör det enklare att använda filtret på iPhone/Android utan att tangentbordet döljer knappen.
- **Framtida skalningssteg (ej implementerat än)**:
  - När antalet annonser växer bör nuvarande klientside-filtrering flyttas till Supabase (pris/år/miltal/attribut via `gte`/`lte`-villkor).
  - Rekommendation: Extrahera filterstate till en hook (t.ex. `useSearchFilters`) och återanvänd den både i UI:t och i datalagerskiktet.

#### Bilannons-formulär med kategorispecifika fält och filter
- **Skick-fält**: Lagt till obligatoriskt "Skick"-fält i CreateListingForm
  - Dropdown med alternativ: Ny, Som ny, Bra, Använd, Defekt
  - Placerat efter "Kategori" i den obligatoriska sektionen
  - Valideras vid publicering för alla annonser
- **Drivhjul-fält**: Ändrat från "öron" tillbaka till "Drivhjul" med chips-UI
  - Samma design som "Växellåda" (klickbara chips/taggar)
  - Flyttat till position mellan "Växellåda" och "Kaross" i "Fler detaljer"-sektionen
  - Toggle-funktionalitet: klicka igen för att avmarkera
- **YearInput-komponent**: Label ändrat från "Årsmodell" till "Modellår"
  - Förbättrad tydlighet och konsistens i formuläret
- **Nya komponenter för bilannonser**:
  - `CarMakeModelFields.tsx`: Separata Make/Model-fält med smart autocomplete
    - Hierarkisk display: "Volvo, V70"
    - Model-fältet är disabled tills Make är valt
    - Indenterat med `ml-4` för visuell hierarki
    - Clear-knappar för båda fälten
  - `DualRangeSlider.tsx`: Återanvändbar komponent för range-selection
    - Två handtag för min/max-värden
    - Används för pris, år och mil-filter på startsidan
- **Filter-UI förbättringar** (`app/page.tsx`):
  - Dual range sliders för Pris, År och Mil (istället för min/max-inputs)
  - Chips-UI för Drivmedel och Växellåda (klickbara knappar)
  - Färgfilter med dot + text UI (samma som i create-formulär)
  - Förbättrad mobil-drawer (90-95% skärmbredd)
  - Sortering: Obligatoriska filter (Pris, År, Mil) överst, övriga i "Fler filter"-collapse

#### Kategori-system med migration och defensiv kodning
- **Kategori-struktur** (`lib/categories.ts`): Hierarkisk kategori-struktur med parent/child-relationer
  - Huvudkategorier: Fordon, Hem & Inredning, Elektronik, Kläder & Accessoarer, Fritid & Hobby, Övrigt
  - Underkategorier med ID:n (t.ex. `'cars'`, `'boats'`, `'furniture'`) och svenska labels (t.ex. `'Bilar'`, `'Båtar'`, `'Möbler'`)
  - Helper-funktioner: `getCategoryLabel()` och `getCategoryGroupLabel()` för att hämta svenska etiketter
- **Defensiv kodning för bakåtkompatibilitet**: `getCategoryLabel()` och `getCategoryGroupLabel()` hanterar både nya ID:n och gamla textvärden
  - Mapping från gamla textvärden (`'Bilar'`, `'Fordon'`) till nya ID:n (`'cars'`)
  - Fallback till ursprungstext om inget matchar (förhindrar krasch och konstiga värden)
  - Säkerställer att PROD visar svenska etiketter även under övergångsperioden
- **Datamigrering** (`supabase/migrations/20260130130000_migrate_category_text_to_ids.sql`): SQL-script för att konvertera alla befintliga annonser
  - Uppdaterar alla rader från gamla textvärden till nya ID:n
  - Mappar alla huvudkategorier och underkategorier korrekt
  - Inkluderar loggning för att visa antal uppdaterade rader
  - Idempotent (kan köras flera gånger utan problem)
- **Attributes-kolumn** (`supabase/migrations/20260130120000_add_attributes_to_listings.sql`): JSONB-kolumn för kategorispecifik data
  - Stöd för att spara specifika attribut per kategori (t.ex. bil-specifika fält)
  - Default-värde: `'{}'` (tom JSON-objekt)

#### Cookie Consent Banner
- **CookieConsent-komponent** (`app/components/layout/CookieConsent.tsx`): Ny global cookie consent-banner
  - Visas endast för användare utan `cookie_consent` i localStorage
  - Mörkgrön bakgrund (#1a2e26), vit text, grön OK-knapp
  - Responsiv design: kolumn på mobil, rad på desktop
  - "Läs mer"-länk till `/cookies`-sidan
  - EAA-kompatibel med ARIA-labels och focus states
  - Integrerad globalt i `app/layout.tsx`
  - Banner försvinner permanent efter att användaren klickat "OK"

#### RLS Säkerhetsaudit och Setup-filer
- **RLS Audit Rapport** (`docs/RLS_AUDIT_REPORT.md`): Komplett säkerhetsgranskning av alla tabeller
  - Identifierade kritiska säkerhetsproblem: `listings` och `deletion_logs` saknade RLS
  - Identifierade saknad RLS på `listing-images` storage bucket
  - Granskning av alla befintliga RLS-policies
  - Prioriterade åtgärder dokumenterade
- **setup_listings.sql**: Ny setup-fil för listings-tabellen med RLS
  - Public read: Endast aktiva annonser (`status = 'active'`)
  - Insert: Endast autentiserade användare (måste vara ägare)
  - Update/Delete: Endast ägare kan ändra/radera sina annonser
- **setup_deletion_logs.sql**: Ny setup-fil för deletion_logs-tabellen med RLS
  - Select/Insert: Endast ägare kan läsa/skapa sina egna loggar
  - Update/Delete: Inga policies (immutable logs)
- **setup_listing_images.sql**: Ny setup-fil för listing-images storage bucket med RLS
  - Select: Publikt läsning (public bucket)
  - Insert: Endast autentiserade användare
  - Delete: Endast ägare (baserat på path som innehåller user_id)

### ✨ Tillagt

#### Footer-uppdatering och nya sidor
- **Rensad Footer**: Tog bort alla döda länkar, behåller endast 4 essentiella länkar
  - Om oss → `/about`
  - Villkor & Säkerhet → `/terms`
  - Cookies → `/cookies`
  - Kontakt → `/contact`
  - Förenklad layout: 2 kolumner på desktop, enkel kolumn på mobil
- **Cookies-sida** (`/cookies`): Ny sida med information om cookie-användning
  - Kort text om nödvändiga cookies för inloggning och funktionalitet
  - "Vi spårar dig inte i onödan" i brand-green
- **Kontakt-sida** (`/contact`): Ny sida för användarfeedback
  - Rubrik: "Hör av dig!"
  - Uppmaning om feedback, buggar och förslag
  - "Eftersom vi är i Beta är din feedback guld värd"
  - "Kontaktformulär kommer snart!" (TODO för framtida implementering)
- **Brandnamn-konsistens**: Fixat inkonsistens mellan "Kolla här!" och "Kollahär!"
  - Alla förekomster uppdaterade till "Kolla här!" för konsistens
  - Ändrat i: `content.ts`, `page.tsx`, `annons/[id]/page.tsx`

#### Klient-sidig bildkomprimering
- **Bildkomprimering för uppladdningar**: Automatisk komprimering av bilder innan uppladdning till Supabase
  - Använder `browser-image-compression` för att säkerställa att bilder håller sig under 2MB-gränsen
  - Konfiguration: `maxSizeMB: 1.0`, `maxWidthOrHeight: 1920`, `initialQuality: 0.8`
  - Web Worker för att undvika att frysa gränssnittet under komprimering
  - Visuell feedback: "Bearbetar bild..."-indikator under komprimering
  - Fallback till originalfil om komprimering misslyckas
  - Tillämpas på både annonsbilder (`CreateListingForm`) och profilbilder (`Settings`)
  - Förbättrar användarupplevelsen genom att automatiskt optimera bilder utan att användaren behöver göra något

#### Sajtens identitet och metadata
- **Metadata-uppdatering**: Ny identitet och vision för Kolla här!
  - Title: `'Kolla här! – En gladare marknadsplats, gjord för alla'` med template `'%s | Kolla här!'`
  - Description: `'En ny sorts marknadsplats skapad för användarna. Köp och sälj prylar enkelt, i en skön miljö helt utan krångel.'`
  - Authors & Creator: `'Kolla här! Crew'`
  - Keywords: `['marknadsplats', 'loppis', 'köp och sälj', 'begagnat', 'community', 'hållbart', 'sverige']`
  - Open Graph: Konfigurerad för sociala medier med svensk locale (`sv_SE`)
  - Icons: Konfigurerad att använda `/icon.png` för favicon och Apple touch icons

### 🔧 Ändrat

#### UX-förbättringar för About, Terms och Footer
- **Textrendering**: Lagt till `antialiased` på alla text-element för bättre läsbarhet
  - Tillämpat på: `app/about/page.tsx`, `app/terms/page.tsx`, `app/components/organisms/Footer.tsx`
- **Tillgänglighet (EAA)**: Förbättrad semantisk HTML och ARIA-labels
  - Använder `<section>`, `<article>`, `<nav>` för bättre strukturerad innehåll
  - ARIA-labels: `aria-label="Kundservice"`, `aria-label="Footer navigation"`
- **Konsistent design**: Alla sidor följer samma designmönster
  - Centrerad vit container med `rounded-xl shadow-sm`
  - Brand-beige bakgrund
  - Konsekvent whitespace och typografi

### 🚀 Prestanda & UX-förbättringar

#### Listings & Sök – Server-arkitektur med Server Actions
- **Ny arkitektur-lagtext**: `ARCHITECTURE.md` definierar nu strikt separation mellan UI och datalager (feature-baserad struktur, services, Result-typer och namngivning).
- **ListingsService**: `lib/features/listings/listing-service.ts` introducerar `getListings(filters)` som Server Action med typad `ListingSearchFilters` (query, category, location, prisintervall, år, miltal, offset/limit).
- **Result-typ**: Alla services (börjat med Location & Listings) returnerar `ServiceResult<T>` (`{ success, data?, error? }`) så frontend aldrig behöver gissa om ett anrop lyckades.
- **HomePage-uppdelning**: `app/page.tsx` är nu en ren serverkomponent som läser `searchParams`, anropar `getListings` och skickar `initialListings` + ev. `initialError` till `HomePageClient`.
- **HomePageClient**: Ny client-komponent (`app/components/home/HomePageClient.tsx`) som hanterar filter-state, URL-sync, debounce för sök, server-side filtrering (kategori, plats, prisintervall m.m.) och offset-baserad “Visa fler”-paginering.
- **LocationService**: `lib/features/location/location-service.ts` kapslar RPC-anropet `get_location_stats` och levererar data i exakt det format som `mergeLocationCounts` förväntar sig, med robust felhantering.

#### OTP-verifiering prestandaoptimering
- **Hard navigation**: Använder `window.location.href` istället för `router.push` för omedelbar feedback
  - Förhindrar att Next.js "fryser" i transition-state vid långsamma nätverk
  - Ger användaren omedelbar feedback i webbläsarens laddningsbar
- **Timeout-hantering**: 15 sekunders timeout på OTP-verifiering
  - Visar meddelande: "Det tar längre tid än vanligt. Försök igen eller ladda om sidan."
  - Förhindrar hängande requests och eviga spinners
- **Success feedback**: Visar "Koden godkänd! Loggar in..." med spinner
  - Tydlig visuell feedback innan redirect
- **Loading states**: Ersatt "Loading..." text med riktiga spinners (`Loader2` från lucide-react)
  - Tillämpat på: `app/annons/[id]/page.tsx`, `app/dashboard/settings/page.tsx`
  - Bättre visuell feedback även vid långsamma laddningar

#### Dashboard loading-optimering
- **Skeleton loader för Dashboard**: Ny `app/dashboard/loading.tsx` som eliminerar "vit skärm"-problemet
  - Matchar exakt dashboard-layouten (Header, CTA-kort, flikar, annonslista)
  - Använder pulserande grå rutor (`animate-pulse bg-gray-200`) för visuell feedback
  - Visas omedelbart vid navigering till `/dashboard` för bättre perceived performance
- **Parallell datahämtning**: Dashboard hämtar nu listings, favorites och unread-meddelanden parallellt
  - Separata loading-states för varje datatyp (`isAdsLoading`, `isFavoritesLoading`, `isUnreadLoading`)
  - UI renderas direkt efter auth-check istället för att vänta på all data
  - Skeleton-loaders per sektion istället för fullskärms-"Laddar..."-text
- **Förbättrad auth-loading**: Separerad auth-check från datahämtning
  - Kortare blocking-tid för initial render
  - Dashboard-shell visas direkt efter auth-verifiering
  - Data streamas in progressivt med visuella skeletons

### ✨ Tillagt

#### Login & Registrering - Komplett ombyggnad
- **Tabs för Login/Registrering**: Ny tab-baserad design för bättre UX
  - Tabs: "Logga in" / "Skapa konto" med URL-state (`?tab=signup`)
  - Samma formulär, olika knappar baserat på vald tab
  - URL-state bevaras vid siduppdatering
- **6-siffrig OTP-verifiering**: Ny verifieringssida (`/login/verify`)
  - 6 separata input-fält med auto-focus
  - Auto-verifiering när alla 6 siffror är ifyllda
  - Auto-forward vid korrekt kod
  - Countdown-timer (15 minuter)
  - Försöksräknare (5 försök med vänliga meddelanden)
  - "Skicka ny kod"-funktion
  - Paste-stöd för 6-siffrig kod
  - Rensa fält vid fel kod
- **Välkomst-popup**: Ny popup för nya och befintliga användare
  - Modal med overlay
  - 3 knappar: Bläddra annonser, Lägg upp annons, Gå till min profil
  - Checkbox för "Visa inte detta igen" (permanent stängning)
  - Databas-spårning för UX-analys (`welcome_popup_view_count`, `welcome_popup_last_shown`, `welcome_popup_dismissed`)
  - Visas efter inloggning/verifiering (om inte stängd permanent)
- **Förbättrad felhantering**: Användarvänliga felmeddelanden
  - Översättning av Supabase-fel till svenska
  - Tydliga meddelanden för alla fel-scenarier
- **Keyboard navigation**: Enter-tangent submitar formulär
- **Visa/dölj lösenord**: Öga-ikon för att visa/dölja lösenord
- **Email-validering**: Realtidsvalidering med visuell feedback
- **Accessibility (EAA)**: ARIA-labels, focus-hantering, screen reader support

#### Databas-migrationer & profilfält
- **Migration**: `supabase/migrations/20260117000000_add_welcome_popup_tracking.sql`
  - `welcome_popup_dismissed` (boolean)
  - `welcome_popup_last_shown` (timestamptz)
  - `welcome_popup_view_count` (integer)
- **Migration**: `supabase/migrations/20260128090000_replace_website_with_location.sql`
  - Ersätter `profiles.website` med `profiles.location`
  - Användarens hemvist/ort används nu i både Settings och säljar-kort
- **Migration**: `supabase/migrations/20260128091000_setup_cascade_delete.sql`
  - Säkerställer `ON DELETE CASCADE` från `auth.users` till `profiles` och `listings`

#### Dokumentation
- **Email-template guide**: `docs/EMAIL_TEMPLATE_OTP.md` - Innehåll och konfiguration
- **Supabase email setup**: `docs/SUPABASE_EMAIL_SETUP.md` - Steg-för-steg guide
- **QA-checklista**: `docs/QA_CHECKLIST_LOGIN_UPGRADE.md` - Komplett testlista
- **QA-testrapport**: `docs/QA_TEST_REPORT.md` - Testresultat och kvarstående uppgifter

#### Footer-komponent
- **Footer-komponent**: Ny footer-komponent med responsiv design
  - Mobil: Enkel kolumn, centrerad text med Logotyp, Om Kolla här!, Kundservice, Instagram och Copyright
  - Desktop: 4 kolumner med länkar (Marknadsplatsen, Kundservice, Följ oss)
  - Bakgrund: `bg-brand-green` med vit text för hög kontrast
  - Hover-effekter: `hover:text-brand-beige` och `hover:underline` på desktop
  - Copyright uppdaterat till 2026
  - Integrerad i `app/layout.tsx` med flex-layout för att alltid hamna längst ner
  - Använder `lucide-react` för Instagram-ikon

#### Hero-sektion mobil optimering
- **Hero-text dold på mobil**: Hero-rubriken "Hitta fynd eller sälj det du inte behöver" döljs på mobil
  - Använder `hidden md:block` för att visa endast på desktop (768px+)
  - Sökfältet lyfts automatiskt upp på mobil för bättre UX
  - Mer fokus på sökfunktionen på små skärmar

#### Dashboard mobil UX/UI-förbättringar
- **Edit/Delete-knappar**: Flyttade från absolut position till flex-layout i höjd med "Aktiv"-taggen
  - Förhindrar att knappar och rubriker krockar på mobil
  - Bättre visuell hierarki och läsbarhet
- **Historia-tabellen**: Horisontell scrollbar på mobil
  - Tabellen scrollbar istället för att krocka på små skärmar
  - `whitespace-nowrap` på alla celler för att förhindra wrap
  - Minskat padding på mobil (`px-4 md:px-6`)
- **Sparade annonser grid-layout**: Matchar nu exakt samma layout som startsidan
  - 2 kolumner på mobil, 3 på tablet, 4 på desktop
  - Samma `gap-3` som startsidan
  - Annonserna är nu mindre och mer kompakta
- **"Till alla annonser"-länk**: Dold på mobil för att ge mer utrymme åt flikarna
  - Visas endast på desktop/tablet (`hidden md:inline-block`)
  - Användare kan använda loggan i headern för navigation på mobil

#### Realtid-borttagning av favoriter
- **FavoriteButton**: Stödjer nu `onFavoriteRemoved` callback
- **ListingCard**: Skickar vidare callback till FavoriteButton
- **Dashboard**: När favorit avmarkeras tas annonsen bort från listan direkt i realtid
  - Ingen siduppdatering krävs
  - Smooth UX när användare avmarkerar favoriter

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

#### Sökning och navigation
- **Bevara sökning vid navigation**: Sökning och filtrering bevaras när man navigerar tillbaka från annonsdetaljsidan
  - Använder URL-parametrar (`?q=stol&category=...`) för att bevara sökning
  - Läser från URL vid sidladdning och återställer sökningen automatiskt
  - Uppdaterar URL när sökning/kategori ändras (använder `replaceState` för att undvika extra historik-poster)
  - "Tillbaka till alla annonser"-länken behåller URL-parametrarna
  - Wrappat komponenter i `<Suspense>` för Next.js 16-kompatibilitet (`useSearchParams`)
- **ScrollToSearch-knapp**: Förenklad till enkel scroll-till-toppen-funktion
  - Visas endast när Hero inte är synlig OCH användaren scrollar uppåt
  - Scrollar till toppen av sidan (ingen fokusering på sökfält)
  - Ikon: Endast `ArrowUp` (Search-ikon borttagen)
- **Login-sida navigation**: "Tillbaka"-knapp uppdaterad
  - Text: "← Tillbaka till annonserna"
  - Navigerar alltid till startsidan (`/`) istället för `router.back()`

### 🔄 Ändrat

#### Navigation & Logout
- **Logout-redirect**: Logout redirectar nu till startsidan (`/`) istället för `/login`
  - Fixat i `app/dashboard/page.tsx`
  - `UserMenu.tsx` redirectar redan korrekt
- **Header på login-sidan**: Lagt till Header-komponent på login-sidan
  - Logotypen "Kollahär!" länkar till startsidan
  - Konsistent navigation på alla sidor
- **"Tillbaka till annonserna"-knapp**: Förbättrad event-hantering
  - Använder `router.replace()` istället för `router.push()`
  - `e.preventDefault()` och `e.stopPropagation()` för att förhindra konflikter
  - Fixar problem med att knappen krävde flera klick

#### Verifieringssida
- **Dubbel pil fixad**: Tog bort `ArrowLeft`-ikon och "←" från text
  - Nu visas endast texten "← Tillbaka" (från content.ts)
  - Tydligare och enklare design

### 🐛 Fixat

#### Login & Registrering
- **Login-sida Suspense-wrap**: `/login` är nu en lätt serverkomponent som wrapper den klientbaserade login-logiken i `Suspense`
  - Fixar Next.js 16-varningen/felet: `useSearchParams() should be wrapped in a suspense boundary at page "/login"`
  - Förhindrar build-fel på Vercel vid prerendering av login-sidan
- **Verifieringssida Suspense-wrap**: `/login/verify` följer samma mönster med en serverkomponent + `Suspense` runt klientkomponenten
  - Fixar motsvarande `useSearchParams()`-varning för verifieringssidan
  - Säkerställer stabil build och prerendering i Vercel
- **Auto-verify useEffect**: Fixat dependency-problem med `useCallback`
  - Förhindrar oändliga loopar
  - Korrekt dependency-hantering
- **Saknad invalidEmail**: Lagt till `invalidEmail` i login errors (content.ts)
- **Email-felhantering**: Förbättrad felhantering för email-utskick
  - Tydligare meddelanden om Supabase-konfiguration saknas
  - Bättre feedback till användare
- **Signup med befintlig e-post**: Förhindrar dubbelregistrering
  - Om e-post redan finns: visar tydligt felmeddelande och växlar till Login-fliken
  - Uppmanar användaren att använda \"Glömt lösenord\" istället
- **OTP-verifiering**: Korrigerad `verifyOtp`-typ för email-OTP (`magiclink`)
  - Säkerställer att 6-siffrig kod fungerar för både nya och befintliga användare
- **Reset password**: Ignorerar ofarlig Supabase-varning om nytt lösenord = gammalt
  - Loggar som varning istället för error
- **Signup-flöde härdat**: Efter lyckad `signUp` loggas användaren alltid ut innan OTP-steget
  - Förhindrar att man kan hoppa in i dashboard/header innan e-post är verifierad
- **Välkomst-popup på startsidan borttagen**: Ersatt av tydliga toasts för inloggning och utloggning
  - `/?logged_in=new` → grön "Hurra! Välkommen till Kollahär!"-toast (nyregistrerad användare)
  - `/?logged_in=returning` → grön "Välkommen tillbaka {profilnamn}!"-toast (befintlig användare)
  - `/?logged_out=true|deleted` → "Du har loggats ut." / "Ditt konto har raderats!"

#### Text-kontrast förbättringar (Dashboard & Formulär)

#### Platsfält & LocationInput
- **Hemvist-fältet**: Placeholder uppdaterad till "Fyll i din närmaste kommun" och e-postliknande värden filtreras bort visuellt.
- **LocationInput UX**: Förbättrat så att:
  - Autocomplete visas först när användaren börjar skriva (inte vid förifyllnad).
  - Val av kommun stänger listan direkt (ingen dubbelklick-bugg).
  - Förifylld plats i "Skapa annons" öppnar inte dropdown automatiskt.
  - `autoComplete="address-level2"` används för att undvika att browsern fyller i e-post i platsfältet.

#### Meddelanden / Chatt
- **Meddelandevyn**: Uppdaterad till att följa Kollahärs grafiska profil.
  - Bakgrund: `bg-brand-beige` med vita kort för inkorg och chattyta.
  - Pratbubblor: Egna meddelanden i `bg-brand-green text-white`, motparten i `bg-white text-brand-text border border-brand-green/10`.
  - Chatt-header visar nu annonsens miniatyr, titel (med `font-display`) och pris i kr.
  - Tom state: central "Välj en konversation"-vy på beige bakgrund med tydlig text.
- **Dashboard alla flikar**: Förbättrad text-synlighet på mobil (iPhone Chrome)
  - Alla `text-brand-text/60`, `/70`, `/50` ändrade till `text-brand-text`
  - Lagt till `antialiased` på text för bättre skärpa
  - Fixat i: Aktiva annonser, Sparade annonser, Historia, Messages, Settings, Edit-sidan
- **CreateListingForm**: Förbättrad text-kontrast
  - Labels och input-text använder nu `text-brand-text` med `antialiased`
  - Bättre läsbarhet på mobil
- **Messages-sidan**: Förbättrad text-kontrast
  - Alla gråa texter (`text-gray-400`, `text-gray-500`) ändrade till `text-brand-text`
  - Tidsstämplar och meddelanden är nu tydligt läsbara
  - Input-fält och konversationsrubriker använder nu `text-brand-text antialiased` för bättre läsbarhet på mobil
- **Settings-sidan**: Förbättrad text-kontrast för mobil
  - Alla labels ändrade från `text-gray-700` till `text-brand-text antialiased`
  - Alla input-fält (namn, lösenord, bekräftelse, radera konto) använder nu `text-brand-text antialiased`
  - Sektionsrubriker uppdaterade till `text-brand-text antialiased`
- **LocationInput-komponent**: Förbättrad text-kontrast
  - Input-fält använder nu `text-brand-text antialiased`
  - Dropdown-labels och select-fält uppdaterade för konsistent textkontrast
  - Matchar nu samma värden som CreateListingForm för enhetlig UX

#### Tillgänglighet och kontrast (iPhone Chrome)
- **Placeholder-text i sökfält**: Ökat kontrast för bättre synlighet på iPhone Chrome
  - Lagt till `placeholder:text-brand-text/50` på både desktop och mobil sökfält
- **Kategori-tagg på annonsdetaljsidan**: Förbättrad kontrast och synlighet
  - Ändrat från `bg-white/90` till `bg-brand-green/95 text-white` med `shadow-lg`
  - Tagg syns nu tydligt med mörkgrön bakgrund och vit text
- **Sökfält event-hantering**: Fixat `handleSearchInputChange` för att ta emot string direkt
  - Header-komponenten skickar nu string-värde istället för event-objekt
  - Mobil-sökfältet använder inline-funktion för att konvertera event till string
  - Fixar "Cannot read properties of undefined (reading 'value')"-fel
- **Z-index för hjärtknappar**: Hjärtknapparna flyter inte längre ovanför header vid scrollning
  - Hjärtknappar: `z-50` → `z-10` (fortfarande ovanför kortet)
  - Header: `z-20` → `z-50` (alltid ovanför hjärtknappar)

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

**Senast uppdaterad**: 2025-01-30 (Kategori-migration och defensiv kodning)
