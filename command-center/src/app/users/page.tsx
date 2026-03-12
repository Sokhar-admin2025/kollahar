import { createClient } from "@/lib/supabase/server";
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
    <div className="py-4 md:py-6">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
        User Management
      </h1>
      <p className="mt-1 text-[11px] text-slate-600">
        Hämtar data från huvud-appens tabell{" "}
        <code className="rounded bg-slate-200 px-1 py-0.5 text-[10px]">
          profiles
        </code>
        . Endast för intern användning.
      </p>
      {error && (
        <p className="mt-2 rounded-md border-2 border-black bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          Kunde inte ladda användare just nu.
        </p>
      )}
      <UsersClient users={users} />
    </div>
  );
}

