"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    if (needsVerify) {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error ?? "Invalid OTP");
          setBusy(false);
          return;
        }
        const signed = await signIn("credentials", { email, password, redirect: false });
        setBusy(false);
        if (signed?.error) {
          setError("Email verified, but sign-in failed. Try again.");
          setNeedsVerify(false);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setBusy(false);
        setError("Could not verify OTP");
      }
      return;
    }

    setNeedsVerify(false);

    const pre = await fetch("/api/auth/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const preJson = await pre.json().catch(() => ({ ok: false, reason: "invalid" }));

    if (!preJson.ok) {
      setBusy(false);
      if (preJson.reason === "unverified") {
        setNeedsVerify(true);
        setError("Email not verified. Enter the OTP from your inbox (or resend).");
        // Auto-send a fresh OTP so they have one ready.
        void fetch("/api/auth/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).then(async (r) => {
          const j = await r.json().catch(() => ({}));
          if (r.ok) setInfo(j.message ?? "OTP sent");
        });
      } else {
        setError("Invalid email or password");
      }
      return;
    }

    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      if (res.error === "EMAIL_NOT_VERIFIED") {
        setNeedsVerify(true);
        setError("Email not verified. Enter the OTP from your inbox.");
      } else {
        setError("Invalid email or password");
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function resendVerification() {
    if (!email) return setError("Enter your email first");
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(json.error ?? "Could not resend OTP");
    else setInfo(json.message ?? "OTP sent");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="section-title text-center">Operator Login</h1>
      <p className="mt-2 text-center font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
        // AUTHORIZED PERSONNEL ONLY
      </p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}
        {info && (
          <p className="border border-ember-600/40 bg-ember-600/10 px-3 py-2 font-mono text-xs text-ember-400">
            {info}
          </p>
        )}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {needsVerify && (
          <div>
            <label className="label">Email OTP</label>
            {process.env.NEXT_PUBLIC_OTP_TEST_MODE === "true" && (
              <p className="mb-2 font-mono text-xs text-amber-300">CHECKING MODE — use OTP 000000</p>
            )}
            <input
              className="input text-center font-mono text-2xl tracking-[0.4em]"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="••••••"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy || (needsVerify && otp.length !== 6)}>
          {busy ? (needsVerify ? "Verifying…" : "Signing in…") : needsVerify ? "Verify OTP & Sign in" : "Sign in"}
        </button>
        {needsVerify && (
          <button type="button" className="btn-ghost w-full" disabled={busy} onClick={resendVerification}>
            Resend OTP
          </button>
        )}
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
