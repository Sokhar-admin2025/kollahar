"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

const LEADS_PATH = "/leads";

export type ImportResult = {
  inserted: number;
  duplicates: number;
};

export async function importLeads(
  _prevState: ImportResult | null,
  formData: FormData
): Promise<ImportResult> {
  const raw = (formData.get("emails") as string | null) ?? "";
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { inserted: 0, duplicates: 0 };
  }

  const emails = Array.from(new Set(lines.map((line) => line.toLowerCase())));

  const supabase = await createClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("marketing_leads")
    .select("email")
    .in("email", emails);

  if (existingError) {
    console.error("importLeads: failed to load existing leads", existingError);
    return { inserted: 0, duplicates: 0 };
  }

  const existingEmails = new Set(
    (existingRows ?? [])
      .map((row) => row.email)
      .filter((email): email is string => typeof email === "string" && email.length > 0)
      .map((email) => email.toLowerCase())
  );

  const toInsert = emails
    .filter((email) => !existingEmails.has(email))
    .map((email) => ({
      email,
      status: "active",
      current_step: 0,
    }));

  if (toInsert.length) {
    const { error: insertError } = await supabase
      .from("marketing_leads")
      .insert(toInsert);

    if (insertError) {
      console.error("importLeads: failed to insert leads", insertError);
      return { inserted: 0, duplicates: existingEmails.size };
    }
  }

  revalidatePath(LEADS_PATH);
  return { inserted: toInsert.length, duplicates: existingEmails.size };
}

export async function pauseLead(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_leads")
    .update({ status: "paused" })
    .eq("id", id);

  if (error) {
    console.error("pauseLead: failed to update lead", error);
  }

  revalidatePath(LEADS_PATH);
}

export async function deleteLead(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_leads")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteLead: failed to delete lead", error);
  }

  revalidatePath(LEADS_PATH);
}

// Nollställer cooldown så att leaden plockas upp vid nästa kron-körning.
// Avancerar INTE steget – mejlet skickas av kron-jobbet.
export async function resetLeadCooldown(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;

  // Sätt last_sent_at till 4 dagar sedan → omedelbart redo för nästa körning
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_leads")
    .update({ last_sent_at: fourDaysAgo })
    .eq("id", id);

  if (error) {
    console.error("resetLeadCooldown: failed to update lead", error);
  }

  revalidatePath(LEADS_PATH);
}

export type TriggerResult = {
  success: boolean;
  message: string;
};

export async function markAsOnboarded(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_leads")
    .update({ status: "onboarded" })
    .eq("id", id);

  if (error) {
    console.error("markAsOnboarded: failed to update lead", error);
  }

  revalidatePath(LEADS_PATH);
}

export async function triggerEmailQueue(): Promise<TriggerResult> {
  const mainAppUrl = process.env.MAIN_APP_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!mainAppUrl || !cronSecret) {
    return {
      success: false,
      message:
        "Funktionen är inte aktiverad ännu. Rapportera till dev-teamet: e-postkön behöver konfigureras i Command Centers inställningar (Vercel).",
    };
  }

  // DEBUG: logga första 4 tecknen + längd för att verifiera att rätt secret används
  console.log(`[triggerEmailQueue] secret: "${cronSecret.slice(0, 4)}..." längd: ${cronSecret.length}`);
  console.log(`[triggerEmailQueue] url: ${mainAppUrl}/api/cron/process-marketing`);

  try {
    const res = await fetch(`${mainAppUrl}/api/cron/process-marketing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });

    if (!res.ok) {
      return {
        success: false,
        message: `E-postjobbet svarade med ett fel (kod ${res.status}). Försök igen om en stund eller rapportera till dev-teamet om det kvarstår.`,
      };
    }

    const data = (await res.json()) as { sent?: number; skipped?: number; failed?: number };
    const sent = data.sent ?? 0;
    const skipped = data.skipped ?? 0;
    const failed = data.failed ?? 0;
    const parts: string[] = [];
    if (sent > 0) parts.push(`${sent} mejl skickade`);
    if (skipped > 0) parts.push(`${skipped} prospects behövde inget mejl just nu`);
    if (failed > 0) parts.push(`${failed} misslyckades – kontrollera Resend`);
    return {
      success: true,
      message: sent === 0 && skipped > 0
        ? "Inga mejl att skicka just nu – alla prospects väntar på sitt nästa intervall."
        : `Klart! ${parts.join(", ")}.`,
    };
  } catch (e) {
    console.error("triggerEmailQueue error", e);
    return {
      success: false,
      message:
        "Kunde inte starta e-postjobbet – tjänsten verkar otillgänglig. Försök igen eller rapportera till dev-teamet.",
    };
  }
}
