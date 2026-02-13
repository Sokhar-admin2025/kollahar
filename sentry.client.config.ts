import * as Sentry from "@sentry/nextjs";

// Vi kollar om användaren har gett samtycke
const hasConsent = typeof window !== 'undefined' && localStorage.getItem('cookie-consent') === 'accepted';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Traces är oftast okej för prestanda, men vi kan vara strikta
  tracesSampleRate: 1.0,

  // Session Replay aktiveras ENDAST om samtycke finns
  replaysSessionSampleRate: hasConsent ? 0.1 : 0,
  replaysOnErrorSampleRate: hasConsent ? 1.0 : 0,
  
  // Detta gör att Sentry inte skickar data förrän vi säger till om vi vill vara extra säkra
  enabled: true, 
});