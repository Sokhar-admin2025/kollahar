export default function Home() {
  return (
    <div className="space-y-4">
      <header className="rounded-2xl border-2 border-black bg-white px-5 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Kollahär! Command Center
            </h1>
            <p className="text-xs font-medium text-slate-700">
              Intern superadmin-portal. Endast för Kollahär!-teamet.
            </p>
          </div>
          <p className="mt-1 inline-flex items-center gap-2 rounded-md border-2 border-black bg-yellow-300 px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            Intern miljö
            <span className="rounded-sm bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">
              Handle with care
            </span>
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <h2 className="text-sm font-black uppercase tracking-wide text-black">
            Översikt
          </h2>
          <p className="mt-2 text-xs text-slate-800">
            Här bygger vi upp dashboards, monitorering och interna verktyg för
            Kollahär!. All åtkomst loggas och är strikt intern.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <h2 className="text-sm font-black uppercase tracking-wide text-black">
            Nästa steg
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-800">
            <li>Visa inloggad användare och roll från internal_staff.</li>
            <li>
              Lägg till första Command Center-modulerna (t.ex. leads,
              monitorering).
            </li>
            <li>Finjustera RLS och loggning för interna actions.</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <h2 className="text-sm font-black uppercase tracking-wide text-black">
            Säkerhet
          </h2>
          <p className="mt-2 text-xs text-slate-800">
            Portalen körs mot samma Supabase-instans som huvudappen men är
            skyddad av internal_staff + RLS. Dela aldrig denna URL eller
            .env-filer utanför teamet.
          </p>
        </div>
      </section>
    </div>
  );
}
