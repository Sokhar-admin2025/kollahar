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
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border-2 border-black bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <table className="min-w-full border-collapse bg-white text-left text-[11px]">
          <thead>
            <tr className="bg-black text-white">
              <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                Namn
              </th>
              <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                E-post
              </th>
              <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                Typ
              </th>
              <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-right">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-[11px] text-slate-500"
                >
                  Inga användare hittades.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-black/20 odd:bg-white even:bg-[#f5f5f5] hover:bg-yellow-50"
                >
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    {u.full_name || "–"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {u.email || "–"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-sm border border-black/30 bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                      {u.account_type || "okänd"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleImpersonate(u.id)}
                      disabled={isPending && pendingId === u.id}
                      className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-orange-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-orange-300 disabled:opacity-50"
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
