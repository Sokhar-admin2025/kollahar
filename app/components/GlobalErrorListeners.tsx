"use client";

import { useEffect } from "react";
import { logErrorToDashboard } from "@/lib/error-logger";

export function GlobalErrorListeners({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event?.error instanceof Error) {
        logErrorToDashboard(event.error, event.filename);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason instanceof Error) {
        logErrorToDashboard(reason);
      } else {
        const err = new Error(`Unhandled rejection: ${String(reason)}`);
        logErrorToDashboard(err);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return <>{children}</>;
}

