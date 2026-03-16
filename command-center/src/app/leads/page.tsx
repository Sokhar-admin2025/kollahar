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
    <div className="rounded-2xl border-4 border-black bg-white p-4 md:p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Lead Management
          </h1>
          <p className="text-xs text-slate-600">
            Hämtar data från Supabase-tabellen <code className="rounded bg-slate-200 px-1 py-0.5 text-[10px]">marketing_leads</code>.
          </p>
        </div>
        {error && (
          <p className="rounded-md border-2 border-black bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            Kunde inte ladda leads just nu.
          </p>
        )}
      </header>

      <LeadsClient leads={leads} />
    </div>
  );
}

