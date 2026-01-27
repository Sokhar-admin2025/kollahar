import { DASHBOARD_TEXTS } from '../../lib/content'
import { Instagram } from 'lucide-react'

export default function Footer() {
  const t = DASHBOARD_TEXTS.landing.footer

  return (
    <footer className="bg-brand-green text-white py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Mobil: Enkel kolumn, centrerad */}
        <div className="md:hidden text-center space-y-6">
          {/* Logotyp */}
          <div>
            <h3 className="text-2xl font-display mb-2">{t.brand}</h3>
          </div>

          {/* Om Kolla här! */}
          <div>
            <h4 className="font-semibold mb-3">Om Kolla här!</h4>
            <p className="text-sm text-white/80 leading-relaxed max-w-xs mx-auto">
              Vi gör det enkelt att köpa och sälja tryggt. En mötesplats för både fyndjägare och säljare.
            </p>
          </div>

          {/* Kundservice */}
          <div>
            <h4 className="font-semibold mb-3">Kundservice</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-brand-beige transition-colors">
                  Kontakta oss
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-beige transition-colors">
                  Vanliga frågor
                </a>
              </li>
            </ul>
          </div>

          {/* Instagram */}
          <div>
            <a 
              href="#" 
              className="inline-flex items-center gap-2 hover:text-brand-beige transition-colors"
            >
              <Instagram size={20} aria-hidden="true" />
              <span>Instagram</span>
            </a>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-sm text-white/70">{t.copyright}</p>
          </div>
        </div>

        {/* Desktop: 3-4 kolumner */}
        <div className="hidden md:grid md:grid-cols-4 gap-8 mb-8">
          {/* Varumärke & Info */}
          <div>
            <h3 className="text-xl font-display mb-4">{t.brand}</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Vi gör det enkelt att köpa och sälja tryggt. En mötesplats för både fyndjägare och säljare.
            </p>
          </div>

          {/* Länkkolumner */}
          {t.columns.map((col, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link}>
                    <a 
                      href="#" 
                      className="hover:text-brand-beige hover:underline transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright - Desktop */}
        <div className="hidden md:block border-t border-white/20 pt-8 text-center text-sm text-white/70">
          <p>{t.copyright}</p>
        </div>
      </div>
    </footer>
  )
}