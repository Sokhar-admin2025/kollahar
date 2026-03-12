import { createClient } from "@/lib/supabase/server";
import type { SystemError } from "./HealthClient";
import { HealthClient } from "./HealthClient";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_errors")
    .select("id, error_message, stack_trace, path, user_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const errors = (data ?? []) as SystemError[];

  return (
    <div className="py-4 md:py-6">
      <div className="rounded-2xl border-4 border-black bg-white p-4 md:p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              System Health
            </h1>
            <p className="text-xs text-slate-600">
              Tekniska fel från huvudappen som behöver kärleksfull felsökning.
            </p>
          </div>
          {error && (
            <p className="rounded-md border-2 border-black bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
              Kunde inte ladda systemfel just nu.
            </p>
          )}
        </header>
        <HealthClient errors={errors} />
      </div>
    </div>
  );
}

