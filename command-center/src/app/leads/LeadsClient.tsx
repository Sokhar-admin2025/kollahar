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
  1: "Mail 1 skickat (Väckarklockan)",
  2: "Mail 2 skickat (Sniper Mode)",
  3: "Sekvens slutförd",
};

function formatStep(step: number | null | undefined) {
  if (step == null) return "Okänt steg";
  return STEP_LABELS[step] ?? `Steg ${step}`;
}

function getStatusClasses(status: LeadStatus | null | undefined) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

  switch (status) {
    case "active":
      return `${base} bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40`;
    case "unsubscribed":
      return `${base} bg-red-500/10 text-red-300 ring-1 ring-red-500/40`;
    case "paused":
      return `${base} bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/40`;
    default:
      return `${base} bg-slate-700/40 text-slate-200 ring-1 ring-slate-500/40`;
  }
}

function isOnCooldown(lastSentAt: string | null) {
  if (!lastSentAt) return false;
  const last = new Date(lastSentAt).getTime();
  if (Number.isNaN(last)) return false;
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  return now - last < threeDaysMs;
}

export function LeadsClient({ leads }: Props) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">
            Lead Management
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Hantera marketing_leads-sekvensen och manuella imports.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportDialogOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Importera Leads
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="sticky left-0 z-10 border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Företag
                </th>
                <th className="border-b border-slate-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Kontakt
                </th>
                <th className="border-b border-slate-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  E-post
                </th>
                <th className="border-b border-slate-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="border-b border-slate-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Framsteg
                </th>
                <th className="border-b border-slate-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-xs text-slate-500"
                  >
                    Inga leads ännu. Importera första batchen för att komma
                    igång.
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  const isEven = index % 2 === 0;
                  const cooldown = isOnCooldown(lead.last_sent_at);
                  return (
                    <tr
                      key={lead.id}
                      className={
                        isEven
                          ? "bg-slate-900/40"
                          : "bg-slate-900/20 hover:bg-slate-900/40"
                      }
                    >
                      <td className="whitespace-nowrap border-t border-slate-800 px-4 py-3 text-xs text-slate-100">
                        {lead.company_name || "–"}
                      </td>
                      <td className="whitespace-nowrap border-t border-slate-800 px-4 py-3 text-xs text-slate-200">
                        {lead.contact_name || "–"}
                      </td>
                      <td className="whitespace-nowrap border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
                        {lead.email || "–"}
                      </td>
                      <td className="border-t border-slate-800 px-4 py-3 text-xs">
                        <span className={getStatusClasses(lead.status)}>
                          {lead.status ?? "okänd"}
                        </span>
                      </td>
                      <td className="border-t border-slate-800 px-4 py-3 text-xs text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span>{formatStep(lead.current_step)}</span>
                          {cooldown && (
                            <span
                              className="text-[11px]"
                              aria-label="Cooldown aktiv för nästa steg"
                              title="Cooldown aktiv – nästa steg väntar"
                            >
                              ⏳
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-t border-slate-800 px-4 py-3 text-right text-xs">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              Importera Leads
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Klistra in en lista med mejladresser, en per rad. Dubbletter
              hoppar vi automatiskt över.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <span className="sr-only">Stäng</span>
            ✕
          </button>
        </div>

        <form
          action={importLeads}
          onSubmit={() => onClose()}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="block text-[11px] font-medium text-slate-300">
              Mejl-lista
            </label>
            <textarea
              name="emails"
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-500"
              placeholder={
                "lead1@example.com\nlead2@example.com\nlead3@example.com"
              }
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Vi sätter automatiskt <code>current_step = 0</code> och{" "}
              <code>status = &apos;active&apos;</code> för alla nya leads.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
        className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-800"
      >
        Åtgärder
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-44 rounded-md border border-slate-800 bg-slate-900/95 p-1 text-[11px] text-slate-100 shadow-lg">
          <form
            action={pauseLead}
            className="w-full"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="id" value={leadId} />
            <button
              type="submit"
              className="block w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-800"
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
              className="block w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-800"
            >
              Skicka nästa mail direkt (Force)
            </button>
          </form>
          <form
            action={deleteLead}
            className="w-full"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="id" value={leadId} />
            <button
              type="submit"
              className="block w-full rounded px-2 py-1.5 text-left text-[11px] text-red-300 hover:bg-red-950/40 hover:text-red-200"
            >
              Radera lead
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

