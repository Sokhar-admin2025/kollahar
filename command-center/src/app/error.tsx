"use client";

import { useEffect } from "react";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error_message: error.message || "Okänt klientfel i Command Center",
        stack_trace: error.stack || null,
        path: window.location.pathname,
        source: "command-center-client",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="rounded-2xl border-4 border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
        <p className="text-sm font-bold text-slate-900">
          Något gick fel i Command Center.
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Felet har loggats automatiskt i System Health. Ladda om sidan.
        </p>
      </div>
    </div>
  );
}
