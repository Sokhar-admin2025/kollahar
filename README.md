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
