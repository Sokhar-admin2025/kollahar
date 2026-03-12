"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAIN_APP_URL =
  process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3001";

export async function impersonateUser(targetUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Du måste vara inloggad." };
  }

  // Steg 1: säkerställ superadmin i internal_staff
  const { data: staffRow, error: staffError } = await supabase
    .from("internal_staff")
    .select("id, role")
    .eq("id", user.id)
    .eq("role", "superadmin")
    .maybeSingle();

  if (staffError || !staffRow) {
    return {
      success: false,
      error: "Endast superadmin i Command Center får använda impersonation.",
    };
  }

  const admin = createAdminClient();

  try {
    // Hämta mål-användare för att få e-post
    const { data: targetUser, error: targetError } =
      await admin.auth.admin.getUserById(targetUserId);

    if (targetError || !targetUser?.user?.email) {
      return {
        success: false,
        error: "Kunde inte hitta mål-användaren eller dess e-post.",
      };
    }

    const email = targetUser.user.email;

    // Steg 2: generera magic link mot huvud-appen
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: MAIN_APP_URL,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      return {
        success: false,
        error: "Kunde inte generera inloggningslänk.",
      };
    }

    const actionLink = linkData.properties.action_link;

    // Steg 3: skriv audit-logg
    const { error: logError } = await admin
      .from("admin_audit_logs")
      .insert({
        admin_id: user.id,
        action: "impersonate_user",
        target_user_id: targetUserId,
      });

    if (logError) {
      console.error("[impersonateUser] audit-log error", logError);
    }

    // Steg 4: returnera URL
    return { success: true, url: actionLink };
  } catch (err) {
    console.error("[impersonateUser] unexpected error", err);
    return {
      success: false,
      error: "Ett oväntat fel uppstod vid impersonation.",
    };
  }
}

