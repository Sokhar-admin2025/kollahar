import { DASHBOARD_TEXTS } from '../../lib/content'
import Link from 'next/link'

export default function Footer() {
  const t = DASHBOARD_TEXTS.landing.footer

  return (
    <footer className="bg-brand-green text-white py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Mobil: Enkel kolumn, centrerad */}
        <div className="md:hidden text-center space-y-6">
          {/* Logotyp */}
          <div>
            <h3 className="text-2xl font-display mb-2 antialiased">{t.brand}</h3>
          </div>

          {/* Om Kolla här! */}
          <section>
            <h4 className="font-semibold mb-3 antialiased">Om Kolla här!</h4>
            <p className="text-sm text-white/80 leading-relaxed max-w-xs mx-auto antialiased">
              Vi gör det enkelt att köpa och sälja tryggt. En mötesplats för både fyndjägare och säljare.
            </p>
          </section>

          {/* Länkar */}
          <nav aria-label="Footer navigation">
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-brand-beige transition-colors antialiased">
                  Om oss
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-beige transition-colors antialiased">
                  Villkor & Säkerhet
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-brand-beige transition-colors antialiased">
                  Cookies
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-beige transition-colors antialiased">
                  Kontakt
                </Link>
              </li>
            </ul>
          </nav>

          {/* Copyright */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-sm text-white/70 antialiased">{t.copyright}</p>
          </div>
        </div>

        {/* Desktop: 2 kolumner */}
        <div className="hidden md:grid md:grid-cols-2 gap-8 mb-8">
          {/* Varumärke & Info */}
          <section>
            <h3 className="text-xl font-display mb-4 antialiased">{t.brand}</h3>
            <p className="text-sm text-white/80 leading-relaxed antialiased">
              Vi gör det enkelt att köpa och sälja tryggt. En mötesplats för både fyndjägare och säljare.
            </p>
          </section>

          {/* Länkar */}
          <nav aria-label="Footer navigation">
            <h4 className="font-semibold mb-4 antialiased">Länkar</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-brand-beige hover:underline transition-colors antialiased">
                  Om oss
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-beige hover:underline transition-colors antialiased">
                  Villkor & Säkerhet
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-brand-beige hover:underline transition-colors antialiased">
                  Cookies
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-beige hover:underline transition-colors antialiased">
                  Kontakt
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Copyright - Desktop */}
        <div className="hidden md:block border-t border-white/20 pt-8 text-center text-sm text-white/70">
          <p className="antialiased">{t.copyright}</p>
        </div>
      </div>
    </footer>
  )
}