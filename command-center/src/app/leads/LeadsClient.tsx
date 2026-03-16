"use client";

import { useState } from "react";
import { importLeads, pauseLead, deleteLead, forceNextStep } from "./actions";

type LeadStatus = "active" | "unsubscribed" | "paused" | string;

export type Lead = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  status: LeadStatus | null;
  current_step: number | null;
  last_sent_at: string | null;
};

type Props = {
  leads: Lead[];
};

const STEP_LABELS: Record<number, string> = {
  0: "Väntar i kö",
  1: "Mail 1 skickat",
  2: "Mail 2 skickat",
  3: "Sekvens klar",
};

function formatStep(step: number | null | undefined) {
  if (step == null) return "–";
  return STEP_LABELS[step] ?? `Steg ${step}`;
}

function StatusBadge({ status }: { status: LeadStatus | null | undefined }) {
  const base =
    "inline-flex items-center rounded-sm border-2 border-black px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)]";

  switch (status) {
    case "active":
      return <span className={`${base} bg-green-300 text-black`}>Aktiv</span>;
    case "unsubscribed":
      return <span className={`${base} bg-red-300 text-black`}>Avprenumererad</span>;
    case "paused":
      return <span className={`${base} bg-yellow-300 text-black`}>Pausad</span>;
    default:
      return (
        <span className={`${base} bg-[#f0f0f0] text-slate-700`}>
          {status ?? "okänd"}
        </span>
      );
  }
}

function isOnCooldown(lastSentAt: string | null) {
  if (!lastSentAt) return false;
  const last = new Date(lastSentAt).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last < 3 * 24 * 60 * 60 * 1000;
}

export function LeadsClient({ leads }: Props) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setImportDialogOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-green-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-green-300"
        >
          + Importera Leads
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse bg-white text-left text-[11px]">
            <thead>
              <tr className="bg-black text-white">
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                  Företag
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                  Kontakt
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                  E-post
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                  Status
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide">
                  Framsteg
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-right">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[11px] text-slate-500"
                  >
                    Inga leads ännu. Importera första batchen för att komma igång.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const cooldown = isOnCooldown(lead.last_sent_at);
                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-black/20 odd:bg-white even:bg-[#f5f5f5] hover:bg-yellow-50"
                    >
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        {lead.company_name || "–"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {lead.contact_name || "–"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {lead.email || "–"}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <span className="flex items-center gap-1">
                          {formatStep(lead.current_step)}
                          {cooldown && (
                            <span
                              title="Cooldown aktiv – nästa steg väntar"
                              aria-label="Cooldown aktiv"
                            >
                              ⏳
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <RowActionsDropdown leadId={lead.id} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {importDialogOpen && (
        <ImportDialog onClose={() => setImportDialogOpen(false)} />
      )}
    </div>
  );
}

type ImportDialogProps = {
  onClose: () => void;
};

function ImportDialog({ onClose }: ImportDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-black">
              Importera Leads
            </h2>
            <p className="mt-1 text-[11px] text-slate-600">
              Klistra in en lista med mejladresser, en per rad. Dubbletter
              hoppar vi automatiskt över.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-black bg-[#f0f0f0] px-2 py-1 text-[11px] font-bold text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-red-100"
          >
            ✕
          </button>
        </div>

        <form
          action={importLeads}
          onSubmit={() => onClose()}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-800">
              Mejl-lista
            </label>
            <textarea
              name="emails"
              rows={8}
              className="mt-1.5 w-full rounded-xl border-2 border-black bg-[#fafafa] px-3 py-2 font-mono text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-black focus:ring-2 focus:ring-yellow-300"
              placeholder={"lead1@example.com\nlead2@example.com\nlead3@example.com"}
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Sätter automatiskt <code>current_step = 0</code> och{" "}
              <code>status = active</code> för alla nya leads.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t-2 border-black pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border-2 border-black bg-[#f0f0f0] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-slate-200"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="rounded-md border-2 border-black bg-green-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-green-300"
            >
              Importera
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type RowActionsDropdownProps = {
  leadId: string;
};

function RowActionsDropdown({ leadId }: RowActionsDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-[#f0f0f0] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-yellow-200"
      >
        Åtgärder <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-48 rounded-xl border-2 border-black bg-white p-1 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <form
            action={pauseLead}
            className="w-full"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="id" value={leadId} />
            <button
              type="submit"
              className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-slate-800 hover:bg-yellow-100"
            >
              Pausa sekvens
            </button>
          </form>
          <form
            action={forceNextStep}
            className="w-full"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="id" value={leadId} />
            <button
              type="submit"
              className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-slate-800 hover:bg-yellow-100"
            >
              Skicka nästa mail (Force)
            </button>
          </form>
          <div className="my-1 border-t border-black/20" />
          <form
            action={deleteLead}
            className="w-full"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="id" value={leadId} />
            <button
              type="submit"
              className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-red-700 hover:bg-red-50"
            >
              Radera lead
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
