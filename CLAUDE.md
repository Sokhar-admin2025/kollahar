# CLAUDE.md — Sokhar / kollahar.se

> Denna fil läses automatiskt av Claude Code vid varje session.
> Läs hela filen innan du rör någon kod. Avvikelser från reglerna här
> kräver explicit motivering.

---

## Projektöversikt

**Projektnamn:** sokhar
**Varumärke:** Kollahär ("Kolla här!")
**Primär domän:** www.kollahar.se
**Stack:** Next.js 16 (App Router), TypeScript strict, Supabase, Tailwind CSS v4
**Deploy:** Vercel — ett projekt per app
**Språk:** UI-text och kommentarer på svenska. Kod (funktioner, typer, variabler) på engelska.

---

## Appar i ekosystemet

| App | Domän | Repo-sökväg | Vercel-projekt | Syfte |
|-----|-------|-------------|----------------|-------|
| Main | www.kollahar.se | `/` (root) | sokhar | B2C marknadsplats + B2B dealer-dashboard |
| Command Center | admin.kollahar.se | `/command-center/` | sokhar-admin | Internt ops-verktyg för medarbetare |
| Bilar | bilar.kollahar.se | `/sites/bilar/` | sokhar-bilar | B2B syskon för bilhandlare |
| Båtar *(planerad)* | batar.kollahar.se | `/sites/batar/` | sokhar-batar | B2B syskon för båthandlare |
| Lokaler *(planerad)* | lokaler.kollahar.se | `/sites/lokaler/` | sokhar-lokaler | B2B syskon för fastighetsföretag |

**Redirect-domäner (köpta, pekar på subdomän via 301):**
- `kollabilar.se` → `bilar.kollahar.se`
- `kollabatar.se` → `batar.kollahar.se`
- `kollalokaler.se` → `lokaler.kollahar.se`

**Syskon-sajter är ännu inte byggda.** Arbetet sker stegvis och dokumenteras i
`docs/sites/` per syskon. Rör inte syskon-kod innan respektive site-spec är godkänd.

---

## Arkitekturprinciper (läs ARCHITECTURE.md för fullständig spec)

1. **Server Components first** — datahämtning på servern där det är möjligt
2. **Service layer** — UI får aldrig anropa Supabase direkt; all DB-access går via
   `lib/features/<feature>/<feature>-service.ts`
3. **Server Actions för mutationer** — `app/actions/`
4. **Type safety** — strict mode, ingen `any`, Zod för Supabase-responses
5. **Security first** — RLS på alla tabeller, auth-check innan känsliga operationer

---

## Mappstruktur — Main App

```
sokhar/                              ← Repo-rot
├── CLAUDE.md                        ← Den här filen (läs alltid först)
├── ARCHITECTURE.md                  ← Kodstandard och separation of concerns
├── vercel.json
├── proxy.ts                         ← Next.js proxy (tidigare middleware.ts)
├── instrumentation.ts               ← Sentry server/edge
├── instrumentation-client.ts        ← Sentry klient
├── sentry.client.config.ts
├── sentry.edge.config.ts
├── sentry.server.config.ts
├── scripts/
│   ├── load-env.ts
│   └── test-marketing.ts
├── utils/
│   └── supabase/middleware.ts
├── components/                      ← Top-level komponenter (ej app/components/)
│   ├── listings/filters/            ← Listningsfilter
│   └── ui/                          ← shadcn: button, input, dialog m.fl.
├── docs/
│   ├── 00-START_HERE.md
│   ├── 01-SYSTEM_ARCHITECT.md
│   ├── 02-BACKEND_DATABASE.md       ← Tabeller, RLS, migrationer
│   ├── 03-FRONTEND_UI.md            ← Designsystem, komponenter
│   ├── 04-CHANGELOG.md
│   ├── 05-ROADMAP.md
│   ├── DEALER_PRODUCT_ROADMAP.md    ← B2B-features och prioritering
│   ├── ENVIRONMENTS.md
│   ├── FLOWS_COMPANY_SIGNUP_UPGRADE.md
│   ├── GO_LIVE_CHECKLIST.md
│   ├── RLS_AUDIT_REPORT.md
│   ├── TROUBLESHOOTING_DELETE_LISTING.md
│   ├── [+ 15 övriga spec/QA/release-dokument]
│   └── sites/                       ← Spec per syskon-sajt (skapas löpande)
│       ├── _template.md
│       ├── bilar.md
│       ├── batar.md
│       └── lokaler.md
├── app/                             ← Next.js App Router
│   ├── actions/                     ← Server Actions (mutationer)
│   ├── api/                         ← Route handlers (cron, import, admin m.m.)
│   ├── annons/[id]/                 ← Publik annonsdetaljsida
│   ├── about/, contact/, cookies/, terms/, villkor/  ← Statiska sidor
│   ├── emails/                      ← React-mailmallar (MarketingMail1/2/3.tsx)
│   ├── login/
│   │   └── verify/                  ← OTP-steg
│   ├── reset-password/
│   ├── profil/[id]/                 ← Publik säljarprofil / handlarprofil
│   ├── lib/content.ts               ← SOURCE OF TRUTH för alla UI-texter
│   ├── services/                    ← Tom (legacy, ej använd)
│   ├── types/                       ← Projekt-gemensamma TypeScript-typer
│   ├── components/
│   │   ├── atoms/                   ← Button m.fl.
│   │   ├── layout/                  ← CookieConsent, LayoutWithHeader
│   │   ├── organisms/               ← Header, Footer
│   │   ← ListingCard, CreateListingForm, DashboardClient,
│   │   ← FavoriteButton, ErrorBoundary, InboxClient m.fl. (platta)
│   ├── context/                     ← HeaderOptionsContext, FavoritLoginToastContext
│   └── dashboard/                   ← Skyddad — kräver auth
│       ├── _components/             ← Scoped: LeadChat.tsx m.fl.
│       ├── create/                  ← Skapa annons
│       ├── dealer/                  ← Dealer analytics
│       ├── edit/[id]/               ← Redigera annons
│       ├── favorites/               ← Sparade favoriter
│       ├── import/                  ← Bulk-import (endast company-konton)
│       ├── messages/                ← B2C-chatt (conversations + messages)
│       ├── seller/                  ← LeadOS seller-vy (leads-lista)
│       └── settings/                ← Kontoinställningar
├── lib/
│   ├── supabase/
│   │   ├── client.ts                ← Browser (createBrowserClient)
│   │   ├── server.ts                ← SSR (createServerClient)
│   │   └── admin.ts                 ← Service role — ENDAST server, aldrig klient
│   ├── email/
│   │   ├── resend.ts
│   │   ├── lead-notification.ts
│   │   ├── new-message-notification.ts
│   │   └── marketing-mail1/2/3.ts
│   ├── import/
│   │   ├── smistabil-csv-parser.ts
│   │   ├── equipment-parser.ts
│   │   └── image-fetcher.ts
│   ├── security/
│   │   └── session-step-up.ts       ← hasRecentSignIn (15 min) för känsliga åtgärder
│   ├── validators/
│   │   └── listing-schema.ts        ← Zod-schema för annonser
│   ├── types/
│   │   └── result.ts                ← Result<T> = { ok: true; data: T } | { ok: false; error }
│   ├── features/
│   │   ├── analytics/               ← analytics-service.ts
│   │   ├── dealer/                  ← dealer-analytics-service.ts
│   │   ├── leads/                   ← lead-service.ts (separat från leados/)
│   │   ├── leados/                  ← leados-sla-check.ts
│   │   ├── listings/                ← listing-service.ts
│   │   ├── location/                ← location-service.ts
│   │   ├── messages/                ← message-service.ts
│   │   └── profiles/                ← profile-service.ts
│   ← car-data.ts, car-colors.ts, categories.ts, constants.ts,
│   ← image-utils.ts, swedish-locations.ts, utils.ts, types.ts,
│   ← error-logger.ts, error-ref.ts  (platta lib-filer)
├── supabase/
│   └── migrations/                  ← ALLA DB-migrationer här, aldrig manuella ändringar i prod
└── command-center/                  ← Separat Next.js-app (se nedan)
```

---

## Supabase — kärnmodell

### Primära tabeller

| Tabell | Syfte | Viktiga fält |
|--------|-------|--------------|
| `auth.users` | Supabase Auth | id, email |
| `profiles` | Användarprofil | id, full_name, account_type, org_number, is_company_verified, phone, email_notifications |
| `organizations` | Företagsentitet | id, name, slug (NOT NULL UNIQUE), logo_url, created_at — relationen är `profiles.organization_id → organizations.id` |
| `listings` | Annonser (alla sajter) | id, user_id, organization_id, category, seller_type, make, model, year, price, attributes (jsonb), status, contact_via_chat, show_phone, show_email |
| `listing_views` | Sidvisningar | listing_id (nullable), seller_id, viewer_id |
| `listing_sales` | Bekräftade försäljningar | listing_id, lead_id, views_count, leads_count, favorites_count, sold_via, sold_at, sold_by_profile_id, sold_by_role, organization_id, listing_title, price_at_sale, sla_within_15m |
| `conversations` | B2C-chatt (privatpersoner) | id, listing_id, buyer_id, seller_id |
| `messages` | Meddelanden i conversations | conversation_id, sender_id, content, is_read |
| `leads` | B2B-kontakter (företag) | id, listing_id, organization_id, seller_id, buyer_id, buyer_email, status, assigned_to, first_response_at, is_guest, source, internal_note |
| `lead_messages` | Intern LeadOS-chatt per lead | id, lead_id, organization_id, author_profile_id, role (seller\|owner\|system), content, created_at — aldrig exponerad mot köpare |
| `favorites` | Sparade annonser | user_id, listing_id |
| `analytics_events` | Plattformshändelser | — |
| `import_logs` | Logg för bulk-import | — |
| `equipment_mappings` | Datanormalisering vid import | — |
| `admin_audit_logs` | Adminåtgärdslogg | — |
| `system_errors` | Systemfellog | — |
| `user_hidden_conversations` | Soft-delete av chattar per användare | — |
| `marketing_leads` | Prospects för e-postsekvens | email, status: `active` (default) \| `onboarded` (sätts av trigger vid registrering) \| `unsubscribed` |
| `internal_staff` | Command Center-åtkomst | id, email, full_name, role (superadmin\|admin\|sales\|support), access_level (int 1–10), created_at |
| `deletion_logs` | Kontoraderingslogg | user_id, reason |

### Roller och account_type

- `private` — privatperson, max 3 annonser, max 5 bilder, 30 dagars annonstid. **Får aldrig tillgång till dealer-dashboard eller syskon-sajternas företagsflöden.**
- `company` — företag, obegränsat, löpande, tillgång till dealer-dashboard och LeadOS. **Får aldrig lägga upp privatannonser i Main — styrs till rätt syskon via middleware-guard.**

### organization_id-regeln (kritisk)

- Privatannonser: `organization_id = NULL`
- Företagsannonser: `organization_id` sätts automatiskt via trigger från profil
- RLS-policies för org-scope får **aldrig** påverka privatflödet
- Se guardrail-checklistan i `docs/02-BACKEND_DATABASE.md` vid alla ändringar

### source_site

Kolumnen `source_site` finns på `listings` och `leads` — anger ursprungssajt.
Migration: `20260319100000_listings_leads_source_site.sql`

- Allowed values: `'main'` | `'bilar'` | `'batar'` | `'lokaler'`
- Default: `'main'` — befintliga rader backfillades vid migrationen
- Main visar annonser från **alla** source_site. Syskon-sajter filtrerar på sin egen.

### organization_sites — PLANERAD, EJ IMPLEMENTERAD

Syfte: spåra vilka syskon ett företag är registrerat på, för fakturering och support i Command Center.

**Planerad struktur:**
- `organization_id` FK → `organizations.id`
- `site` CHECK IN (`'bilar'`, `'batar'`, `'lokaler'`)
- `status` default `'active'`
- `created_at`

Migrationen skapas när första syskon-sajten börjar byggas.

### Auth & SSO — regler tvärs ekosystemet

- **Ett konto gäller alla sajter** via SSO (delad cookie på `.kollahar.se`).
- `company` ger **inte** automatisk tillgång till alla syskon — kräver aktiv registrering per syskon (spåras i `organization_sites` när det är byggt).
- **Onboarding-flöde** visas när en inloggad company-användare besöker ett syskon de inte är registrerade på.
- `private` får **aldrig** tillgång till syskon-sajternas företagsflöden.

---

## Kontaktkanaler per annons

Varje annons styr sina egna kontaktkanaler:
- `contact_via_chat` — chatt via plattformen
- `show_phone` + `contact_phone` — visa telefonnummer
- `show_email` — visa e-post

**Constraint:** minst en kanal måste vara aktiv per annons.

---

## LeadOS — B2B lead-hantering

LeadOS är dealer-systemet i Main (`/dashboard` för company-konton).

- **15-minuters SLA:** cron `GET/POST /api/cron/check-sla` — kräver `CRON_SECRET`
- **Auto-assign:** lead tilldelas säljare vid första interna svar
- **Commander-vy:** omfördelning av leads inom organisation
- **lead_messages:** intern chatt per lead — aldrig exponerad mot köpare
- **Statusflöde:** `new` → `contacted` → `qualified` → `sold` → `archived`
- **listing_sales:** skrivs vid "Bekräfta försäljning" — bevarar historik

---

## Supabase Admin-klient (service role)

`lib/supabase/admin.ts` — **ENDAST på server, aldrig i klientkod.**

Används för: dealer-analytics, lead-notiser, meddelandenotiser, radera annons,
radera konto. Alla queries filtrerar strikt på verifierad user_id/org.

---

## Designsystem — Main App

- **Display font:** Knewave (rubriker)
- **Body font:** DM Sans
- **Brand colors:** `--color-brand-green: #2C4638`, `--color-brand-beige: #F4F3F0`
- **Stil:** Minimalistisk, mobile-first, mycket whitespace ("Vimla-stil")
- **Ikoner:** `lucide-react` — inga andra ikonbibliotek

**Syskon-sajter har unik UI per sajt** — egna design-tokens, egen känsla och
typografi, men samma komponentstruktur och service-layer-mönster.
Se `docs/sites/<syskon>.md` och `docs/03-FRONTEND_UI.md` för detaljer.

---

## Command Center

Separat Next.js-app i `/command-center/src/`. **Viktiga regler:**

- **Aldrig `@/`-alias** — alltid relativa imports (kraschar Vercel annars)
- Kommunikation med Main sker via Supabase eller explicit URL (`MAIN_APP_URL`)
- **Planerat:** när syskon-sajter lanseras behöver `MAIN_APP_URL` ersättas med
  en `SITE_URLS`-konfiguration som täcker alla sajter i ekosystemet

### Funktioner idag
- Marketing Automation (3-stegs e-postsekvens via Resend)
- AI Cleaning Lab (rensa annonsdata med AI)
- System Health Monitor (fel från Main + CC med LLM-analys)
- Användarhantering (impersonering, kontoadmin)

### Auth i Command Center
- Proxy (Edge Runtime) för cookie-refresh
- Staff-kontroll mot `internal_staff`-tabellen i layout (Node.js runtime)

---

## Arbetsprocess — Cursor + Claude Code

All kod skrivs i **Cursor** med **Claude Code** (inte Cursor AI).

- **Migrationsfiler** skrivs av Claude Code och körs manuellt i Supabase Dashboard (SQL Editor).
- Claude Code presenterar SQL tydligt och explicit för manuell körning — kör aldrig SQL automatiskt mot databasen.
- **Migrationsloggen** i `docs/02-BACKEND_DATABASE.md` uppdateras alltid i samma commit som migrationsfilen.

---

## Kritiska regler — läs innan du skriver kod

1. **Ingen Supabase direkt i UI** — alltid via `lib/features/<feature>/<feature>-service.ts`
2. **Ingen `any`** — använd specifika typer eller `unknown` + guard
3. **Ingen `@/` i command-center** — relativa imports
4. **RLS på alla nya tabeller** — utan undantag
5. **organization_id = NULL för privat** — alltid, kontrollera i service-lager
6. **Dashboard centralisering** — alla användarspecifika vyer är tabs i `/dashboard`,
   inga separata routes utan explicit motivering
7. **Migrationsfiler i `supabase/migrations/`** — aldrig manuella SQL-ändringar i prod
8. **Migrationslogg:** uppdatera `docs/02-BACKEND_DATABASE.md` med filnamn och beskrivning i samma commit som migrationsfilen
9. **Efter manuell SQL i prod:** kör `NOTIFY pgrst, 'reload schema';`
10. **Expert gate** — vid ändringar i RLS, organization_id, FK eller auth-kopplad
    access: se checklistan i `docs/02-BACKEND_DATABASE.md`

---

## Dokumentationsregler

> Dokumentation är en del av leveransen — inte ett efterarbete.

- **Vid ny feature:** uppdatera relevant doc-fil i `docs/` i samma commit
- **Vid databasändring:** uppdatera migrationsloggen i `docs/02-BACKEND_DATABASE.md` i samma commit — aldrig efteråt
- **Vid ny syskon-sajt:** skapa `docs/sites/<namn>.md` från `docs/sites/_template.md`
- **Vid arkitekturbeslut:** dokumentera beslutet och motivering i relevant doc
- **README.md `## Projektanteckningar`:** lägg till en rad per användarvänlig förändring

Format för README-anteckning:
```markdown
- **Funktionsnamn**: Kort beskrivning på svenska av vad som ändrades eller tillkom.
```

---

## Läs mer

- `ARCHITECTURE.md` — kodstandard, separation of concerns, namngivning
- `docs/01-SYSTEM_ARCHITECT.md` — dataflöden, ERD, komponenthierarki
- `docs/02-BACKEND_DATABASE.md` — tabeller, RLS, migrationer, guardrails
- `docs/03-FRONTEND_UI.md` — designsystem, komponenter, sidstruktur
- `docs/DEALER_PRODUCT_ROADMAP.md` — B2B-features, prioritering (52 uppgifter)
- `docs/sites/bilar.md` — spec för bilar.kollahar.se
- `docs/sites/batar.md` — spec för batar.kollahar.se
- `docs/sites/lokaler.md` — spec för lokaler.kollahar.se
