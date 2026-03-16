import { createClient } from "../../lib/supabase/server";
import { UsersClient, type UserRow } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, account_type")
    .order("full_name", { ascending: true });

  const users = (data ?? []) as UserRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-black">
          User Management
        </h1>
        <p className="text-xs font-medium text-slate-600">
          Alla profiler i huvud-appen. Använd impersonation med försiktighet.
        </p>
      </div>
      {error && (
        <p className="rounded-md border-2 border-black bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          Kunde inte ladda användare just nu.
        </p>
      )}
      <UsersClient users={users} />
    </div>
  );
}
