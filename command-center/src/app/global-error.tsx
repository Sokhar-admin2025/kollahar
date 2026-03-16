"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error_message: error.message || "Okänt globalt fel i Command Center",
        stack_trace: error.stack || null,
        path: typeof window !== "undefined" ? window.location.pathname : null,
        source: "command-center-client",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="sv">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f0f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            border: "4px solid black",
            background: "white",
            padding: "2rem",
            boxShadow: "6px 6px 0 0 black",
            borderRadius: "1rem",
            maxWidth: "400px",
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
            Command Center kunde inte starta.
          </p>
          <p style={{ fontSize: "0.75rem", color: "#475569" }}>
            Felet har loggats i System Health. Ladda om sidan eller kontakta
            dev-teamet.
          </p>
        </div>
      </body>
    </html>
  );
}
