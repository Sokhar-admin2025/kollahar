import { createClient } from "../../lib/supabase/server";
import { LeadsClient, type Lead } from "./LeadsClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_leads")
    .select(
      "id, company_name, contact_name, email, status, current_step, last_sent_at, created_at"
    )
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as Lead[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black">
            Marketing Automation
          </h1>
          <p className="text-xs font-medium text-slate-600">
            3-stegs e-postsekvens för prospects. Importera, följ upp och se konverteringar.
          </p>
        </div>
        {error && (
          <p className="rounded-md border-2 border-black bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            Kunde inte ladda leads just nu.
          </p>
        )}
      </div>
      <LeadsClient leads={leads} />
    </div>
  );
}
