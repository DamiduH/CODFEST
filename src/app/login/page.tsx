"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/** Admin-only password sign-in. Captains register teams via /register (OTP flow). */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      const map: Record<string, string> = {
        USE_OTP: "Captains register teams at /register — admin password required here.",
        EMAIL_NOT_VERIFIED: "Email not verified.",
      };
      setError(map[res.error] ?? "Invalid email or password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="border-l-4 border-l-ember-400 pl-4">
        <h1 className="section-title">Admin Access</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
          // ORGANIZER ONLY — DO NOT SHARE
        </p>
      </div>

      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}
        <div>
          <label className="label">Admin email</label>
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-700">
        Not an admin? Team registration is at{" "}
        <a href="/register" className="text-zinc-500 hover:text-zinc-300">
          /register
        </a>
      </p>
    </div>
  );
}
