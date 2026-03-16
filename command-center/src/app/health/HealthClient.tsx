"use client";

import { useState, useTransition } from "react";
import { translateError, markResolved } from "./actions";

export interface SystemError {
  id: string;
  error_message: string;
  stack_trace: string | null;
  path: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

interface HealthClientProps {
  errors: SystemError[];
}

type SourceKey = "main-app" | "main-app-client" | "command-center" | "command-center-client";

const SOURCE_LABELS: Record<SourceKey, { label: string; color: string }> = {
  "main-app":             { label: "Huvud-appen – server",  color: "bg-blue-300" },
  "main-app-client":      { label: "Huvud-appen – klient",  color: "bg-blue-200" },
  "command-center":       { label: "Command Center – server", color: "bg-orange-300" },
  "command-center-client":{ label: "Command Center – klient", color: "bg-orange-200" },
};

function SourceBadge({ source }: { source: string | null }) {
  const key = (source ?? "main-app") as SourceKey;
  const meta = SOURCE_LABELS[key] ?? { label: source ?? "Okänd källa", color: "bg-slate-200" };
  return (
    <span
      className={`inline-flex items-center rounded-sm border-2 border-black ${meta.color} px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}
    >
      {meta.label}
    </span>
  );
}

export function HealthClient({ errors }: HealthClientProps) {
  const [selectedTranslation, setSelectedTranslation] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTranslate = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await translateError(id);
      if (res.success && res.translated) {
        setSelectedTranslation((prev) => ({ ...prev, [id]: res.translated! }));
      }
      setPendingId(null);
    });
  };

  const handleResolve = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      await markResolved(id);
      setPendingId(null);
    });
  };

  if (errors.length === 0) {
    return (
      <div className="rounded-xl border-2 border-black bg-green-100 px-4 py-6 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <p className="text-sm font-bold text-black">Inga aktiva fel – allt ser bra ut!</p>
        <p className="mt-1 text-xs text-slate-600">System Health loggar fel från huvud-appen och Command Center automatiskt.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {errors.map((err) => {
        const created = new Date(err.created_at).toLocaleString("sv-SE");
        const isResolved = err.status === "resolved";
        const translation = selectedTranslation[err.id];

        return (
          <li key={err.id} className={`rounded-2xl border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${isResolved ? "bg-green-50 opacity-75" : "bg-white"}`}>

            {/* Header-rad: source + tid + knappar */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={err.source} />
                <span className="text-[11px] font-semibold text-slate-600">{created}</span>
                {err.path && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                    {err.path}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTranslate(err.id)}
                  disabled={isPending && pendingId === err.id}
                  className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-yellow-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-yellow-200 disabled:opacity-50"
                >
                  🧠 Förklara felet
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve(err.id)}
                  disabled={isPending && pendingId === err.id}
                  className={`inline-flex items-center gap-1 rounded-md border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-50 ${isResolved ? "bg-green-300" : "bg-white hover:bg-green-100"}`}
                >
                  {isResolved ? "✓ Löst" : "Markera som löst"}
                </button>
              </div>
            </div>

            {/* Felmeddelande */}
            <p className="rounded-lg border border-black/10 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900">
              {err.error_message}
            </p>

            {/* LLM-förklaring */}
            {translation && (
              <div className="mt-3 rounded-xl border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-700">
                  Förklaring (enkel svenska):
                </p>
                <pre className="whitespace-pre-wrap text-xs text-slate-900 leading-relaxed">
                  {translation}
                </pre>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
