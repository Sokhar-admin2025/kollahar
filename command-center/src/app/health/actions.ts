"use server";

import { createClient } from "../../lib/supabase/server";
import { getOpenAIClient } from "../../lib/llm";

export async function translateError(errorId: string) {
  const supabase = await createClient();

  // Säkerhetskontroll: endast internal_staff får använda LLM
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      translated: "Du måste vara inloggad för att översätta fel.",
    };
  }

  const { data: staffRow } = await supabase
    .from("internal_staff")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!staffRow) {
    return {
      success: false,
      translated:
        "Endast interna användare i Command Center får använda AI-översättaren.",
    };
  }

  const { data, error } = await supabase
    .from("system_errors")
    .select("id, error_message, stack_trace, path, created_at")
    .eq("id", errorId)
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      translated:
        "Kunde inte hämta felet för översättning. Kontrollera loggarna manuellt.",
    };
  }

  const message = (data as any).error_message as string;
  const stack = (data as any).stack_trace as string | null;
  const path = (data as any).path as string | null;

  let translated = "";

  try {
    const client = getOpenAIClient();
    const prompt = [
      "Du är en pedagogisk teknisk support för bilplattformen Kollahär!.",
      "Översätt detta tekniska fel till enkel svenska som en 14-åring förstår.",
      "Förklara:",
      "1. Vad hände?",
      "2. Varför hände det?",
      "3. Hur fixar vi det?",
      "Svara i korta bullet points med en touch av humor.",
      "",
      `Sida/path: ${path ?? "(okänd)"}`,
      "",
      "Felmeddelande:",
      message,
      "",
      "Stack trace (om finns):",
      stack ?? "(ingen stack trace)",
    ].join("\n");

    const completion = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    const content = completion.output[0].content[0];
    if (content && (content as any).type === "output_text") {
      translated = (content as any).text;
    } else {
      // fallback om svaret är i annat format
      translated = JSON.stringify(completion.output);
    }
  } catch (err) {
    console.error("[translateError] LLM error", err);
    return {
      success: false,
      translated:
        "Kunde inte kontakta AI-översättaren just nu. Försök igen senare eller läs loggarna manuellt.",
    };
  }

  return { success: true, translated };
}

export async function markResolved(errorId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("system_errors")
    .update({ status: "resolved" })
    .eq("id", errorId);

  if (error) {
    return { success: false };
  }

  return { success: true };
}

