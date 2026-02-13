'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'cookie-consent';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, [mounted]);

  const acceptCookies = async () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowBanner(false);
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.getReplay?.()?.start?.();
    } catch {
      // Replay will be enabled on reload via sentry.client.config
    }
    window.location.reload();
  };

  const declineCookies = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setShowBanner(false);
  };

  if (!mounted || !showBanner) return null;

  return (
    <div
      role="banner"
      aria-label="Cookie-samtycke"
      className="fixed z-[9999] md:bottom-6 md:right-6 md:left-auto left-4 right-4 bottom-4 md:max-w-md md:rounded-xl md:shadow-xl md:border md:border-gray-200 bg-white p-6 shadow-lg border-t border-gray-200 md:border-t-0"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-brand-text antialiased leading-relaxed">
          Vi använder cookies för att webbplatsen ska fungera och för att analysera
          tekniska problem via Sentry (felspårning och prestanda). Läs mer i vår{' '}
          <Link
            href="/cookies"
            className="text-brand-green underline hover:text-brand-green/80 font-medium"
          >
            Cookie-policy
          </Link>
          .
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={declineCookies}
            className="px-4 py-2.5 text-sm font-medium text-brand-text/70 hover:text-brand-text border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
            aria-label="Endast nödvändiga cookies"
          >
            Endast nödvändiga
          </button>
          <button
            onClick={acceptCookies}
            className="px-6 py-2.5 bg-brand-green text-white text-sm font-semibold rounded-xl hover:bg-brand-green/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
            aria-label="Acceptera alla cookies"
          >
            Acceptera alla
          </button>
        </div>
      </div>
    </div>
  );
}
