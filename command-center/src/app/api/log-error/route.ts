import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      error_message?: string;
      stack_trace?: string;
      path?: string;
      source?: string;
    } | null;

    const errorMessage = body?.error_message?.trim();
    if (!errorMessage) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { error } = await supabase.from("system_errors").insert({
      error_message: errorMessage,
      stack_trace: body?.stack_trace?.trim() || null,
      path: body?.path?.trim() || null,
      source: body?.source || "command-center-client",
      status: "open",
    });

    if (error) {
      console.error("[cc/log-error] insert failed", error.message);
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cc/log-error] unexpected error", err);
    return NextResponse.json({ success: false });
  }
}
