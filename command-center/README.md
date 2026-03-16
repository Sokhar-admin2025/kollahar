# Command Center – Sokhar

Internt adminverktyg för Sokhar-plattformen. Separat Next.js-app med eget Vercel-projekt.

## Funktioner

- **AI Cleaning Lab**: Redigera och rensa annonsdata med AI-stöd
- **System Health Monitor**: Övervaka plattformens hälsostatus med LLM-analys via OpenAI
- **Användarhantering**: Impersonera användare och hantera konton
- **Lead Management**: Hantera och följa upp leads

## Komma igång

```bash
npm run dev    # Utvecklingsserver
npm run build  # Produktionsbygge
npm run lint   # ESLint
```

## Projektanteckningar

- **Sentry-integration**: Felövervakning via `@sentry/nextjs` för server, edge och klient — konfigurerat i `instrumentation.ts`, `sentry.server.config.ts` och `sentry.edge.config.ts`.
