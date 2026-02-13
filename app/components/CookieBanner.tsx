'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link'; // Lägg till Link

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    window.location.reload(); 
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 shadow-2xl z-[9999]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-sm text-gray-600">
          <p>
            Vi använder cookies för att webbplatsen ska fungera och för att analysera eventuella tekniska problem via Sentry. 
            Läs mer i vår{' '}
            <Link href="/cookies" className="underline hover:text-blue-600">
              Cookie-policy
            </Link>.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <button 
            onClick={declineCookies}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Endast nödvändiga
          </button>
          <button 
            onClick={acceptCookies}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-md hover:bg-slate-800 transition-colors"
          >
            Acceptera alla
          </button>
        </div>
      </div>
    </div>
  );
}