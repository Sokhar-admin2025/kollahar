import * as Sentry from "@sentry/nextjs";

// GDPR: Session Replay aktiveras endast vid explicit samtycke ('cookie-consent' === 'accepted')
const getConsent = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('cookie-consent') === 'accepted';
  } catch {
    // localStorage kan kasta på t.ex. iPhone privat läge
    return false;
  }
};

const hasConsent = getConsent();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1.0,

  // Replay: 0 om ej accepterat, annars 10% sessioner + 100% vid fel
  replaysSessionSampleRate: hasConsent ? 0.1 : 0,
  replaysOnErrorSampleRate: hasConsent ? 1.0 : 0,

  enabled: true,
});