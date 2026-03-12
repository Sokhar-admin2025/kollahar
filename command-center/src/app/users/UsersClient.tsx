"use client";

import { useState, useTransition } from "react";
import { impersonateUser } from "./actions";

export interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  account_type: string | null;
}

interface UsersClientProps {
  users: UserRow[];
}

export function UsersClient({ users }: UsersClientProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleImpersonate = (userId: string) => {
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      const result = await impersonateUser(userId);
      if (!result?.success || !result.url) {
        setError(result?.error ?? "Kunde inte skapa impersonation-länk.");
        setPendingId(null);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
      setPendingId(null);
    });
  };

  return (
    <div className="mt-4 rounded-2xl border-4 border-black bg-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            User Management
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Lista över alla profiler i huvud-appen. Använd{" "}
            <span className="font-semibold">“Logga in som”</span> med försiktighet.
          </p>
        </div>
        {error && (
          <p className="max-w-xs rounded-md border-2 border-black bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            {error}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-black">
        <table className="min-w-full border-collapse bg-[#fdfdfd] text-left text-[11px]">
          <thead>
            <tr className="bg-[#f0f0f0]">
              <th className="border-b-2 border-black px-3 py-2 font-semibold">
                Namn
              </th>
              <th className="border-b-2 border-black px-3 py-2 font-semibold">
                E-post
              </th>
              <th className="border-b-2 border-black px-3 py-2 font-semibold">
                Typ
              </th>
              <th className="border-b-2 border-black px-3 py-2 font-semibold text-right">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-3 text-center text-[11px] text-slate-500"
                >
                  Inga användare hittades.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="odd:bg-white even:bg-[#f7f7f7]">
                  <td className="border-t border-black/20 px-3 py-2">
                    {u.full_name || "–"}
                  </td>
                  <td className="border-t border-black/20 px-3 py-2">
                    {u.email || "–"}
                  </td>
                  <td className="border-t border-black/20 px-3 py-2">
                    {u.account_type || "okänd"}
                  </td>
                  <td className="border-t border-black/20 px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleImpersonate(u.id)}
                      disabled={isPending && pendingId === u.id}
                      className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-orange-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-orange-300 disabled:opacity-60"
                    >
                      {isPending && pendingId === u.id
                        ? "Skapar länk…"
                        : "Logga in som"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

