import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath?: string; routeType: string }
) => {
  // Skicka till Sentry (för dev-teamet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Sentry.captureRequestError(err, request as any, context as any);

  const error = err as Error & { digest?: string };

  // Filtrera bort väntade Next.js-fel
  if (error?.digest === "NEXT_REDIRECT") return;
  if (error?.digest === "NEXT_NOT_FOUND") return;

  const message = error?.message || String(error);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await supabase.from("system_errors").insert({
      error_message: message,
      stack_trace: error?.stack || null,
      path: context?.routePath || request?.path || null,
      source: "main-app",
      status: "open",
    });
  } catch (e) {
    console.error("[instrumentation] kunde inte logga fel till system_errors", e);
  }
};
