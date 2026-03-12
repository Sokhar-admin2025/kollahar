import { createClient } from "../../lib/supabase/server";
import { LeadsClient, type Lead } from "./LeadsClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_leads")
    .select(
      "id, company_name, contact_name, email, status, current_step, last_sent_at"
    )
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as Lead[];

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-950 px-4 py-8">
      <main className="w-full max-w-5xl rounded-2xl bg-slate-900/80 p-6 shadow-xl ring-1 ring-slate-800">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-emerald-400">
              Lead Management-modul
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Hämtar data från Supabase-tabellen <code>marketing_leads</code>.
            </p>
          </div>
          {error && (
            <p className="rounded-md bg-red-950/40 px-3 py-1.5 text-[11px] text-red-300">
              Kunde inte ladda leads just nu.
            </p>
          )}
        </div>

        <LeadsClient leads={leads} />
      </main>
    </div>
  );
}

