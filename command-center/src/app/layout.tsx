import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "../lib/supabase/server";
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

  if (user) {
    const { data } = await supabase
      .from("internal_staff")
      .select("id, email, name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      staff = {
        id: data.id as string,
        email: (data as any).email ?? null,
        name: (data as any).name ?? null,
        role: (data as any).role ?? null,
      };
    }
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

