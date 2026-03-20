# bilar.kollahar.se — Syskon-sajt spec

> Status: **v1 KOMPLETT — driftsatt (2026-03-21)**
> Läs `CLAUDE.md` för syskon-arkitekturregler.

---

## Översikt

| Egenskap | Värde |
|----------|-------|
| Domän | bilar.kollahar.se |
| Redirect | kollabilar.se → bilar.kollahar.se (301) |
| Repo-sökväg | `/sites/bilar/` |
| Vercel-projekt | sokhar-bilar |
| Syfte | B2B-marknadsplats för bilhandlare |
| source_site-värde | `'bilar'` |

---

## Målgrupp

Registrerade bilhandlare med `account_type = 'company'`. Privatpersoner
hänvisas till Main (www.kollahar.se).

---

## Databasregler

### source_site
Alla annonser och leads skapade på bilar.kollahar.se får `source_site = 'bilar'`.
Kolumnen finns på `listings` och `leads` sedan migration
`20260319100000_listings_leads_source_site.sql`.

Main visar annonser från **alla** source_site. Bilar filtrerar på `source_site = 'bilar'`.

### Tabeller som används (delade med Main)
| Tabell | Användning |
|--------|-----------|
| `profiles` | Samma konton via SSO |
| `organizations` | Dealer-entiteter |
| `listings` | Filtreras på `source_site = 'bilar'` |
| `leads` | Filtreras på `source_site = 'bilar'` |
| `lead_messages` | LeadOS intern chatt |
| `listing_views` | Visningsstatistik |
| `listing_sales` | Säljhistorik |
| `analytics_events` | Eventspårning |
| `organization_sites` | Registrering per syskon — i bruk |

### Tabeller som INTE används
- `conversations` / `messages` — B2C-chatt används ej på bilar (endast B2B-leads)
- `favorites` — ej relevant för bilhandlare

---

## Auth & SSO

Ett konto (auth.users) gäller alla sajter via SSO (delad cookie på `.kollahar.se`).
`company`-konton kräver aktiv registrering på bilar.kollahar.se — spåras i
`organization_sites` när den tabellen är byggd.

Onboarding-flöde visas när en inloggad company-användare besöker bilar.kollahar.se
utan aktiv registrering.

---

## Referensimplementation i Main

Följande routes i Main kan användas som referens:

| Feature | Route i Main |
|---------|-------------|
| Dealer analytics | `app/dashboard/dealer/` |
| LeadOS seller-vy | `app/dashboard/seller/` |
| Skapa annons | `app/dashboard/create/` |
| Redigera annons | `app/dashboard/edit/[id]/` |
| Import (CSV) | `app/dashboard/import/` |

Service-layer: `lib/features/leados/`, `lib/features/dealer/`, `lib/features/listings/`

---

## Migrationskrav innan bygget startar

- [x] `source_site` på `listings` och `leads`
      (`20260319100000_listings_leads_source_site.sql`)
- [x] `organization_sites`-tabellen (spårning av syskon-registrering)
      (`20260319110000_organization_sites.sql`)
- [x] `organizations.address/city` och `profiles.profile_completed/reminder_count`
      (`20260320100000_organizations_address_profiles_completion.sql`)
- [ ] Eventuella bilar-specifika kolumner på `listings`
      (t.ex. registreringsnummer, besiktning — utreds i designfas)

---

## Vercel-driftsättning

Manuell checklista för att sätta upp `sokhar-bilar` i Vercel:

- [x] Skapa nytt Vercel-projekt `sokhar-bilar`
- [x] Sätt **Root Directory** = `sites/bilar`
- [x] Lägg till miljövariabler från `sites/bilar/.env.example`
- [ ] Koppla domän `bilar.kollahar.se`
- [ ] Konfigurera 301-redirect: `kollabilar.se` → `bilar.kollahar.se`

---

## Design

Bilar.kollahar.se har **egen UI-identitet** — egna design-tokens, typografi och
känsla. Komponentstruktur och service-layer-mönster är samma som Main.
Se `docs/03-FRONTEND_UI.md` för komponentmönster.

**Delar inte** UI-komponenter med Main — kopiera logik eller bygg wrappers.

- **Typografi:** Urbanist (Google Fonts), CSS-variabel `--font-urbanist`
- **Brand:** Blå accent `#2563EB`, mörk sidebar `#0F172A`, ljus bakgrund `#F7F8FA`
- **Design-tokens spec:** `docs/sites/bilar-design-tokens.md`
- **Tailwind v4:** Tokens definieras i `src/app/globals.css` via `@theme` — ej i `tailwind.config.ts`

---

## Byggt och driftsatt (v1 — 2026-03-20)

### Infrastruktur
- `sites/bilar/vercel.json` — Vercel-konfiguration
- `sites/bilar/.vercelignore` — exkluderar Sentry/instrumentation från repo-roten
- `sites/bilar/src/proxy.ts` — Next.js 16 proxy-konvention med 5 guards
- `sites/bilar/postcss.config.mjs` + `globals.css` — Tailwind v4-konfiguration

### Auth & registreringsflöde
| Route | Beskrivning |
|-------|-------------|
| `/registrera` | Steg 1: Kontouppgifter — e-post, lösenord, webbplats med domänvalidering |
| `/registrera/verifiera` | Steg 2: OTP-verifiering — 6 separata sifferfält, auto-submit, 5 max försök |
| `/registrera/profil` | Steg 3: Företagsprofil — namn, org-nummer, adress, stad |
| `/login` | Magic Link-inloggning för befintliga handlare |
| `/inte-foretag` | Informationssida för privatpersoner |

### Proxy-guards
| Guard | Trigger | Redirect |
|-------|---------|----------|
| 1 — Auth | Ej inloggad + `/dashboard/*` | `/login` |
| 2 — account_type | Inloggad privatperson | `/inte-foretag` |
| 3 — organization_sites | Company utan bilar-registrering | `/registrera` |
| 4 — profile_completed | Org registrerad men namn tomt | `/registrera/profil` |
| 5 — Pass through | Övriga requests | — |

### Dashboard
| Route | Status |
|-------|--------|
| `/dashboard` | Klar — KPI-kort, senaste leads, senaste annonser |
| `/dashboard/annonser` | Klar — inventory, skapa, redigera annons |
| `/dashboard/leads` | Klar — lista, detalj med LeadChat, Commander-omfördelning |
| `/dashboard/analytics` | Placeholder |
| `/dashboard/installningar` | Placeholder |

### Publika routes
| Route | Status |
|-------|--------|
| `/` | Klar — hero-sök, filter, 5-kols annons-grid, ladda mer |
| `/bil/[id]` | Klar — galleri, specs, utrustning, handlarkort, lead-modal, finansiering |
| `/handlare/[slug]` | Klar — stats, filtrerbart annons-grid, ladda mer |

### Komponenter (public)
- `BilarPublicHeader` — Logo, sök, auth-knappar (Suspense-wrappat)
- `BilarListingCard` — Annons-kort med optimistiskt favorithjärta
- `BilarDualRangeSlider` — Prisintervall-slider (bilar-blue `#2563EB`)
- `BilarHomeClient` — Publik startsida med filter och grid
- `BilarListingDetailClient` — Annonsdetaljsida tvåkolumn-layout
- `BilarLeadModal` — GDPR-kompatibel lead-förfrågan med samtycke
- `BilarDealerProfileClient` — Handlarprofil med stats och annons-grid

### Komponenter (dashboard)
- `BilarListingForm` — Skapa/redigera annons med bilduppladdning
- `BilarCarMakeModelFields` — Märke/modell-dropdown
- `BilarYearInput` — Årsvalidering

### Service-lager
- `src/lib/features/bilar-dashboard-service.ts` — `getDashboardKpis()`, `getRecentLeads()`, `getRecentListings()`
- `src/lib/features/bilar-listings-service.ts` — `createListing()`, `getListing()`, `updateListing()`
- `src/lib/features/bilar-leads-service.ts` — `getLeads()`, `getLead()`, `updateLeadStatus()`, `assignLead()`, `createLeadMessage()`
- `src/lib/features/bilar-public-service.ts` — `getPublicListings()`, `getPublicListing()`, `getRelatedListings()`, `getFeaturedMakes()`, `getFavoriteIds()`, `logView()`, `getOrganizationBySlug()`, `getOrganizationListings()`
- `src/lib/supabase/check-profile-complete.ts` — Guard 4-hjälpfunktion
- `src/lib/email/resend.ts` — Resend-wrapper (villkorlig init)
- `src/lib/email/remind-incomplete-profile.ts` — Påminnelsemejl (max 3)
- Alla service-funktioner använder `supabaseAdmin` (service role) — aldrig på klienten

### Migrationer i produktion
| Fil | Beskrivning |
|-----|-------------|
| `20260319100000_listings_leads_source_site.sql` | `source_site`-kolumn på listings och leads |
| `20260319110000_organization_sites.sql` | Ny tabell för syskon-registrering |
| `20260320100000_organizations_address_profiles_completion.sql` | address/city på organizations, profile_completed/reminder_count på profiles |
| `20260320200000_organizations_show_financing.sql` | `show_financing`-kolumn på organizations (finansieringsmodul per handlare) |
