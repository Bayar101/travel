"use client";

import { useState, type FormEvent } from "react";
import { clearCache } from "@/lib/store";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 204) {
        await clearCache(); // fresh session: refetch instead of trusting old offline data
        location.replace("/");
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Login failed");
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-8">
      <form onSubmit={submit} className="w-full space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-center text-2xl font-semibold">🇯🇵 Japan Trip</h1>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-400 focus:border-red-500 focus:outline-none"
        />
        {error && <p role="alert" className="text-base text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-lg bg-red-500 text-base font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
