# bilar.kollahar.se — Syskon-sajt spec

> Status: **PLANERAD — EJ BYGGD**
> Uppdateras när bygget påbörjas. Läs `CLAUDE.md` för syskon-arkitekturregler.

---

## Översikt

| Egenskap | Värde |
|----------|-------|
| Domän | bilar.kollahar.se |
| Redirect | kollabilar.se → bilar.kollahar.se (301) |
| Repo-sökväg | `/sites/bilar/` *(ej skapad ännu)* |
| Vercel-projekt | sokhar-bilar *(ej skapat ännu)* |
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
| `organization_sites` | *(planerad)* Registrering per syskon |

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
- [ ] Eventuella bilar-specifika kolumner på `listings`
      (t.ex. registreringsnummer, besiktning — utreds i designfas)

---

## Vercel-driftsättning

Manuell checklista för att sätta upp `sokhar-bilar` i Vercel:

- [ ] Skapa nytt Vercel-projekt `sokhar-bilar`
- [ ] Sätt **Root Directory** = `sites/bilar`
- [ ] Lägg till miljövariabler från `sites/bilar/.env.example`
- [ ] Koppla domän `bilar.kollahar.se`
- [ ] Konfigurera 301-redirect: `kollabilar.se` → `bilar.kollahar.se`

---

## Design

Bilar.kollahar.se har **egen UI-identitet** — egna design-tokens, typografi och
känsla. Komponentstruktur och service-layer-mönster är samma som Main.
Se `docs/03-FRONTEND_UI.md` för komponentmönster.

**Delar inte** UI-komponenter med Main — kopiera logik eller bygg wrappers.
