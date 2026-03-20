# Kolla här! – Marknadsplats

En modern marknadsplats (Blocket-stil) byggd med Next.js, Supabase och Tailwind.

## Miljöer

| Miljö | Beskrivning |
|-------|-------------|
| **Dev** | Lokal utveckling (`npm run dev`) |
| **Preview** | Vercel Preview (PR-deployments) |
| **Production** | Live webbplats |

Se `docs/ENVIRONMENTS.md` för konfiguration av Dev/Preview/Production.

## Getting Started

1. Kopiera `.env.example` till `.env.local` och fyll i Supabase-variabler
2. Kör utvecklingsservern:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Projektanteckningar

- **organization_sites (syskon-registrering)**: Ny tabell som spårar vilka syskon-sajter ett företag är registrerat på — grund för SSO-onboarding-flöde och CC-fakturering.
- **source_site (grund för syskon-arkitektur)**: Kolumnen `source_site` är nu lagd på `listings` och `leads` med allowed values `main/bilar/batar/lokaler`. Möjliggör per-sajt-filtrering när syskon-sajterna byggs.
- **Publik sök – bilar**: Sökfiltret för bilar använder nu separata fält för märke och modell (matchar flödet i “Skapa annons”) och synkar fortsatt mot URL-parametrar (`make`, `model`).
- **Legacy image-backfill**: Admin-funktionen för att backfilla externa bilder är nu städad bort ur dashboard-UI och kvarstår endast som bakomliggande API-funktionalitet vid behov.
- **bilar.kollahar.se — registreringsflöde**: Tre-stegs onboarding för bilhandlare: kontouppgifter (med domänvalidering), OTP-verifiering och företagsprofil. Upsert i `organization_sites` vid verifiering.
- **bilar.kollahar.se — proxy-guards**: Fem guards i `src/proxy.ts` skyddar dashboard: auth, account_type, organization_sites, profile_completed och pass-through. Next.js 16 proxy-konvention.
- **bilar.kollahar.se — dashboard v1**: Sidebar med fem routes, KPI-översikt (aktiva annonser, visningar, leads, konvertering, försäljningar), senaste leads och senaste annonser. Service-lager i `bilar-dashboard-service.ts` med `supabaseAdmin`.
- **bilar.kollahar.se — Tailwind v4**: Design-tokens definierade via `@theme` i `globals.css` (CSS-first). Urbanist-typsnitt via `next/font/google`. Spec i `docs/sites/bilar-design-tokens.md`.
- **bilar.kollahar.se — leads-sida**: Leads-lista med statusfilter, lead-detalj med intern LeadChat (`lead_messages`) och Commander-vy för omfördelning av leads inom organisationen.
- **bilar.kollahar.se — annonser-sida**: Inventory-lista, skapa annons och redigera annons med bilduppladdning (browser-image-compression), utrustningschips och kontaktkanalsvalidering.
- **bilar.kollahar.se — påminnelse-cron**: Daglig cron (09:00 UTC) skickar max 3 påminnelsemejl via Resend till handlare med ofullständiga profiler (`profile_completed = false`).
- **bilar.kollahar.se — publik startsida**: Hero-sökning, filterrad (märke/modell/drivmedel/växellåda/pris/år), 5-kols annons-grid med optimistiska favoriter och Server Action för ladda mer.
- **bilar.kollahar.se — annonsdetaljsida**: Bildgalleri, specifikationer, utrustningskort, handlarkort, lead-modal med GDPR-samtycke, finansieringsmodul (annuitet) och visningslogg med sessionStorage-dedup.
- **bilar.kollahar.se — publik handlarprofil**: Stats (aktiva annonser, sålda bilar, betyg), filtrerbart annons-grid med märkesfilter och prisintervall, ladda mer via Server Action.
- **bilar.kollahar.se — v1 komplett**: Alla planerade v1-routes driftsatta. Se `docs/sites/bilar.md` och `docs/04-CHANGELOG.md` v1.5.0 för fullständig dokumentation.
