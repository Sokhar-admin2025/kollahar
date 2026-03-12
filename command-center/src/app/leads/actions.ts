"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

const LEADS_PATH = "/leads";

export async function importLeads(formData: FormData) {
  const raw = (formData.get("emails") as string | null) ?? "";
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return;
  }

  const emails = Array.from(new Set(lines.map((line) => line.toLowerCase())));

  const supabase = await createClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("marketing_leads")
    .select("email")
    .in("email", emails);

  if (existingError) {
    console.error("importLeads: failed to load existing leads", existingError);
    return;
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
    }
  }

  revalidatePath(LEADS_PATH);
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

export async function forceNextStep(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;

  const supabase = await createClient();

  const { data: lead, error: fetchError } = await supabase
    .from("marketing_leads")
    .select("current_step")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !lead) {
    console.error("forceNextStep: failed to load lead", fetchError);
    return;
  }

  const currentStep =
    typeof lead.current_step === "number" ? lead.current_step : 0;
  const nextStep = Math.min(3, currentStep + 1);

  const { error: updateError } = await supabase
    .from("marketing_leads")
    .update({
      current_step: nextStep,
      last_sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("forceNextStep: failed to update lead", updateError);
  }

  revalidatePath(LEADS_PATH);
}

