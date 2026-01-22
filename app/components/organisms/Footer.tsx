import { DASHBOARD_TEXTS } from '../../lib/content'

export default function Footer() {
  const t = DASHBOARD_TEXTS.landing.footer

  return (
    <footer className="bg-brand-green text-white py-12 border-t border-brand-green/20">
      <div className="max-w-6xl mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Varumärke & Info */}
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-white text-lg font-display mb-4">{t.brand}</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Vi gör det enkelt att köpa och sälja tryggt. En mötesplats för både fyndjägare och säljare.
            </p>
          </div>

          {/* Länkkolumner */}
          {t.columns.map((col, index) => (
            <div key={index}>
              <h4 className="text-white font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-white/70">
          <p>{t.copyright}</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span>Made with ❤️ by Sokhar</span>
          </div>
        </div>
      </div>
    </footer>
  )
}