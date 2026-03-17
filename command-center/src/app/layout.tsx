import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import "./globals.css";
import { createClient } from "../lib/supabase/server";
import { createAdminClient } from "../lib/supabase/admin";
import { CommandShell, type StaffUser } from "./command-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kollahär! Command Center",
  description: "Intern superadmin-portal för Kollahär!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let staff: StaffUser | null = null;

  // Staff-kontroll körs bara om användaren är inloggad.
  // Proxy hanterar redirect till /login för oinloggade – vi gör det inte
  // här eftersom layouten även wrapprar /login och /access-denied.
  if (user) {
    const adminClient = createAdminClient();
    const { data: staffData } = await adminClient
      .from("internal_staff")
      .select("id, email, name, role")
      .eq("id", user.id)
      .in("role", ["superadmin", "admin"])
      .maybeSingle();

    if (!staffData) {
      await supabase.auth.signOut();
      redirect("/access-denied");
    }

    staff = {
      id: staffData.id as string,
      email: (staffData as any).email ?? null,
      name: (staffData as any).name ?? null,
      role: (staffData as any).role ?? null,
    };
  }

  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#f0f0f0] text-slate-900 antialiased`}
      >
        <CommandShell staff={staff}>{children}</CommandShell>
      </body>
    </html>
  );
}

