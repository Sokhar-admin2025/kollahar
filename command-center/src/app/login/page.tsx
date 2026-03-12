"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get("redirectTo") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message || "Kunde inte logga in.");
        setLoading(false);
        return;
      }
      router.push(redirectTo);
    } catch (err) {
      console.error("login error", err);
      setError("Ett oväntat fel uppstod.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 p-6 shadow-xl ring-1 ring-slate-800">
        <h1 className="text-center text-xl font-semibold text-slate-50">
          Kollahär! Command Center
        </h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          Endast för internt team. Obefogad åtkomst förbjuden.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              E-post
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-500"
              placeholder="you@kollahar.se"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Lösenord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-500"
              required
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </form>
      </div>
    </div>
  );
}

