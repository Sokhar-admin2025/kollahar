"use client";

import { useState, useTransition } from "react";
import { translateError, markResolved } from "./actions";

export interface SystemError {
  id: string;
  error_message: string;
  stack_trace: string | null;
  path: string | null;
  status: string;
  created_at: string;
}

interface HealthClientProps {
  errors: SystemError[];
}

export function HealthClient({ errors }: HealthClientProps) {
  const [selectedTranslation, setSelectedTranslation] = useState<
    Record<string, string>
  >({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTranslate = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await translateError(id);
      if (res.success && res.translated) {
        setSelectedTranslation((prev) => ({
          ...prev,
          [id]: "- " + res.translated,
        }));
      }
      setPendingId(null);
    });
  };

  const handleResolve = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await markResolved(id);
      if (res.success) {
        setSelectedTranslation((prev) => ({ ...prev, [id]: prev[id] ?? "" }));
      }
      setPendingId(null);
    });
  };

  return (
    <div className="mt-4 space-y-4">
      {errors.length === 0 ? (
        <p className="text-xs text-slate-600">
          Inga systemfel loggade ännu. 🎉
        </p>
      ) : (
        <ol className="space-y-3 border-l-4 border-black pl-3">
          {errors.map((err) => {
            const created = new Date(err.created_at).toLocaleString("sv-SE");
            const isResolved = err.status === "resolved";
            return (
              <li key={err.id} className="relative pl-3">
                <span className="absolute -left-2 top-2 h-3 w-3 rounded-full border-2 border-black bg-red-400 shadow-[2px_2px_0_0_rgba(0,0,0,1)]" />
                <div
                  className={`rounded-2xl border-4 border-black p-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${
                    isResolved ? "bg-green-50 opacity-80" : "bg-red-50"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-800">
                        {created}
                      </p>
                      {err.path && (
                        <p className="text-[11px] text-slate-700">
                          Sida:{" "}
                          <span className="font-mono text-[11px]">
                            {err.path}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTranslate(err.id)}
                        disabled={isPending && pendingId === err.id}
                        className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-yellow-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-yellow-200 disabled:opacity-60"
                      >
                        🧠 Översätt felet
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(err.id)}
                        disabled={isPending && pendingId === err.id}
                        className={`inline-flex items-center gap-1 rounded-md border-2 border-black px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                          isResolved
                            ? "bg-green-300 text-black"
                            : "bg-white text-black hover:bg-green-100"
                        } disabled:opacity-60`}
                      >
                        {isResolved ? "Löst" : "Markera som löst"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs font-mono text-slate-900">
                    {err.error_message}
                  </p>
                  {selectedTranslation[err.id] && (
                    <div className="mt-2 rounded-md border-2 border-black bg-white/80 p-2 text-[11px] text-slate-800 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                      <p className="mb-1 font-semibold">
                        Förklaring (14-årings-nivå):
                      </p>
                      <pre className="whitespace-pre-wrap text-[11px]">
                        {selectedTranslation[err.id]}
                      </pre>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

