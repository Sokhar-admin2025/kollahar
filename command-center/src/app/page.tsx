import Link from "next/link";

const modules = [
  {
    href: "/leads",
    label: "Lead Management",
    short: "LD",
    color: "bg-green-300",
    description: "Hantera marketing_leads-sekvensen, importera och följ upp prospects.",
  },
  {
    href: "/cleaning",
    label: "AI Cleaning Lab",
    short: "CL",
    color: "bg-yellow-300",
    description: "Städa och validera utrustningssträngar med heuristik och LLM.",
  },
  {
    href: "/users",
    label: "User Management",
    short: "US",
    color: "bg-orange-300",
    description: "Visa alla profiler i huvud-appen och logga in som användare (impersonation).",
  },
  {
    href: "/health",
    label: "System Health",
    short: "SH",
    color: "bg-red-300",
    description: "Övervaka tekniska fel från huvud-appen och lös dem med LLM-analys.",
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black">
            Kollahär! Command Center
          </h1>
          <p className="text-xs font-medium text-slate-600">
            Intern superadmin-portal. Endast för Kollahär!-teamet.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border-2 border-black bg-yellow-300 px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          Intern miljö
          <span className="rounded-sm bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">
            Handle with care
          </span>
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`rounded-sm border-2 border-black ${m.color} px-2 py-0.5 text-[11px] font-black uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}
              >
                {m.short}
              </span>
              <span className="text-xs font-black uppercase tracking-wide text-black">
                {m.label}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-700">
              {m.description}
            </p>
            <span className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400 group-hover:text-black">
              Öppna →
            </span>
          </Link>
        ))}
      </section>

      <div className="rounded-xl border-2 border-black/20 bg-black/5 px-4 py-3 text-[11px] text-slate-600">
        <span className="font-bold text-black">Säkerhet:</span> Portalen körs mot samma Supabase-instans som huvud-appen men är skyddad av{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 text-[10px]">internal_staff</code> + RLS.
        Alla känsliga actions loggas. Dela aldrig denna URL eller{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 text-[10px]">.env</code>-filer utanför teamet.
      </div>
    </div>
  );
}
