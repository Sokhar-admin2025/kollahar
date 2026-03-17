# Command Center – Sokhar

Internt adminverktyg för Sokhar-plattformen. Separat Next.js-app med eget Vercel-projekt.

## Funktioner

- **Marketing Automation**: 3-stegs e-postsekvens för prospects via Resend — importera leads, följ upp konverteringar och trigga utskick manuellt
- **AI Cleaning Lab**: Redigera och rensa annonsdata med AI-stöd
- **System Health Monitor**: Övervaka tekniska fel från huvud-appen och Command Center med LLM-analys
- **Användarhantering**: Impersonera användare och hantera konton

## Komma igång

```bash
npm run dev    # Utvecklingsserver
npm run build  # Produktionsbygge
npm run lint   # ESLint
```

## Miljövariabler

| Variabel | Beskrivning |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-projektets URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publik Supabase-nyckel |
| `SUPABASE_SERVICE_ROLE_KEY` | Hemlig Supabase-nyckel (server/admin) |
| `CRON_SECRET` | Samma värde som i huvud-appens Vercel-projekt |
| `MAIN_APP_URL` | Huvud-appens URL, t.ex. `https://www.kollahar.se` (obs: www) |

## Projektanteckningar

- **Sentry-integration**: Felövervakning via `@sentry/nextjs` för server, edge och klient — konfigurerat i `instrumentation.ts`, `sentry.server.config.ts` och `sentry.edge.config.ts`.
- **Marketing Automation**: Dashboard visar live-statistik (aktiva leads, konverterade, ej konverterade). Import av e-postlistor med dubbletthantering och toast-feedback. "Kör e-postkö nu" triggar huvud-appens cron-endpoint direkt.
- **Konverteringstrigger**: Supabase DB-trigger `on_auth_user_created_mark_marketing_lead` sätter automatiskt `status = onboarded` i `marketing_leads` när en prospect registrerar sig på plattformen.
- **Auth-arkitektur**: Proxy (Edge Runtime) hanterar enbart cookie-refresh. Staff-kontroll mot `internal_staff`-tabellen sker i layout (Node.js runtime) för att undvika Edge Runtime-begränsningar i Next.js 16.
- **System Health**: Loggar fel från huvud-appen och Command Center (server + klient) automatiskt via `instrumentation.ts` och `onRequestError`. Fel visas med källmärkning och kan förklaras med LLM.
