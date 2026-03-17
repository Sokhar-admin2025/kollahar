import Link from "next/link";
import { createAdminClient } from "../lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createAdminClient();

  const [errorsRes, leadsRes, usersRes] = await Promise.all([
    supabase
      .from("system_errors")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("marketing_leads").select("status, current_step, last_sent_at"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const openErrors = errorsRes.count ?? 0;
  const totalUsers = usersRes.count ?? 0;

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const leadsData = leadsRes.data ?? [];
  const activeLeads = leadsData.filter((r) => r.status === "active").length;
  const onboardedLeads = leadsData.filter((r) => r.status === "onboarded").length;
  const droppedLeads = leadsData.filter(
    (r) =>
      r.status === "active" &&
      r.current_step === 3 &&
      r.last_sent_at &&
      Date.now() - new Date(r.last_sent_at).getTime() > THREE_DAYS_MS
  ).length;

  const modules = [
    {
      href: "/leads",
      label: "Marketing Automation",
      short: "MA",
      color: "bg-green-300",
      stat: activeLeads,
      statLabel: `${onboardedLeads} har blivit kunder · ${droppedLeads} svarade ej`,
      description: "3-stegs e-postsekvens för prospects. Importera och följ upp.",
      alert: false,
    },
    {
      href: "/cleaning",
      label: "AI Cleaning Lab",
      short: "CL",
      color: "bg-yellow-300",
      stat: null as number | null,
      statLabel: null as string | null,
      description: "Städa och validera utrustningssträngar med heuristik och LLM.",
      alert: false,
    },
    {
      href: "/users",
      label: "User Management",
      short: "US",
      color: "bg-orange-300",
      stat: totalUsers,
      statLabel: "registrerade användare",
      description: "Visa alla profiler i huvud-appen och logga in som användare.",
      alert: false,
    },
    {
      href: "/health",
      label: "System Health",
      short: "SH",
      color: openErrors > 0 ? "bg-red-400" : "bg-red-300",
      stat: openErrors,
      statLabel: openErrors > 0 ? "öppna fel – kräver åtgärd" : "inga aktiva fel",
      description: "Övervaka tekniska fel från huvud-appen och Command Center.",
      alert: openErrors > 0,
    },
  ];

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
            className={`group flex flex-col rounded-2xl border-2 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] ${m.alert ? "bg-red-50" : "bg-white"}`}
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

            {m.stat !== null && (
              <div className="mb-2">
                <span className={`text-3xl font-black tabular-nums ${m.alert ? "text-red-700" : "text-black"}`}>
                  {m.stat}
                </span>
                {m.statLabel && (
                  <p className={`mt-0.5 text-[11px] font-medium ${m.alert ? "text-red-600" : "text-slate-600"}`}>
                    {m.statLabel}
                  </p>
                )}
              </div>
            )}

            <p className="mt-auto text-[11px] leading-relaxed text-slate-600">
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
