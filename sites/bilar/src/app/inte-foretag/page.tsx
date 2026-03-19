import Link from 'next/link'

export default function InteForetagPage() {
  return (
    <main className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">

        {/* Logotyp */}
        <div className="mb-8">
          <span className="text-2xl font-bold text-brand-blue tracking-tight">
            Kolla<span className="text-text-primary">Bilar</span>
          </span>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-standard" style={{ padding: '18px' }}>
          <h1 className="text-xl font-bold text-text-primary mb-3">
            Den här sidan är för bilhandlare
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            KollaBilar är en plattform för professionella bilhandlare.
            Om du letar efter en bil hittar du våra annonser på kollahar.se.
          </p>

          <a
            href="https://www.kollahar.se"
            className="block w-full py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-semibold rounded-lg transition text-center mb-4"
          >
            Gå till kollahar.se
          </a>

          <Link
            href="/registrera"
            className="text-sm text-brand-blue hover:underline font-medium"
          >
            Är du bilhandlare? Registrera dig här
          </Link>
        </div>
      </div>
    </main>
  )
}
