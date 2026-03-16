import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://e4d2a5927dc3f18df4ae7ecb350a4d65@o4510872920522752.ingest.de.sentry.io/4510872929239120",

  tracesSampleRate: 1,

  enableLogs: true,
});
