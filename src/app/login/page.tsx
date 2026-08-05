"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
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
    if (res?.error) setError("Invalid email or password");
    else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="section-title text-center">Operator Login</h1>
      <p className="mt-2 text-center font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
        // AUTHORIZED PERSONNEL ONLY
      </p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        {error && <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">{error}</p>}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-sm text-zinc-500">
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-ember-400 hover:text-ember-500">
            Register your team
          </Link>
        </p>
      </form>
    </div>
  );
}
