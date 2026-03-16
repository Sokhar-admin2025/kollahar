"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Skicka till Sentry (för dev-teamet)
    Sentry.captureException(error);

    // Logga till system_errors (för adminen)
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error_message: error.message || "Okänt klientfel",
        stack_trace: error.stack || null,
        path: window.location.pathname,
        source: "main-app-client",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">
          Något gick fel. Vänligen ladda om sidan.
        </p>
      </div>
    </div>
  );
}
