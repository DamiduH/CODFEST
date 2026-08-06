"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Captains use OTP. Admins use password (hidden behind toggle). */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"otp" | "admin">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) return setError("Enter your email first");
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not send OTP");
        return;
      }
      if (json.admin) {
        setMode("admin");
        setInfo("Admin accounts use password sign-in.");
        return;
      }
      setOtpSent(true);
      setOtp(process.env.NEXT_PUBLIC_OTP_TEST_MODE === "true" ? "000000" : "");
      setInfo(json.message ?? "OTP sent");
    } catch {
      setError("Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otpSent) return sendOtp();
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await signIn("credentials", { email, otp, redirect: false });
    setBusy(false);
    if (res?.error) {
      const map: Record<string, string> = {
        OTP_EXPIRED: "OTP expired. Request a new code.",
        INVALID_OTP: "Invalid OTP.",
        USE_OTP: "Captains sign in with OTP only.",
      };
      setError(map[res.error] ?? "Sign-in failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      const map: Record<string, string> = {
        USE_OTP: "Captains must use OTP sign-in.",
        EMAIL_NOT_VERIFIED: "Email not verified.",
      };
      setError(map[res.error] ?? "Invalid email or password");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="section-title text-center">
        {mode === "admin" ? "Admin Access" : "Captain OTP Sign-in"}
      </h1>
      <p className="mt-2 text-center font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
        {mode === "admin" ? "// ORGANIZER ONLY" : "// NO PASSWORD — OTP ONLY"}
      </p>

      {mode === "otp" ? (
        <form onSubmit={onOtpSubmit} className="card mt-8 space-y-4 p-6">
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
            <label className="label">Captain email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {otpSent && (
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
          <button
            className="btn-primary w-full"
            disabled={busy || (otpSent && otp.length !== 6)}
          >
            {busy
              ? otpSent
                ? "Signing in…"
                : "Sending…"
              : otpSent
                ? "Verify OTP & Continue"
                : "Send OTP"}
          </button>
          {otpSent && (
            <button type="button" className="btn-ghost w-full" disabled={busy} onClick={() => sendOtp()}>
              Resend OTP
            </button>
          )}
          <p className="text-center text-sm text-zinc-500">
            New squad?{" "}
            <Link href="/register" className="font-semibold text-ember-400 hover:text-ember-500">
              Register with OTP
            </Link>
          </p>
          <button
            type="button"
            className="w-full text-center font-mono text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400"
            onClick={() => {
              setMode("admin");
              setError(null);
              setInfo(null);
            }}
          >
            Admin password login
          </button>
        </form>
      ) : (
        <form onSubmit={onAdminSubmit} className="card mt-8 space-y-4 p-6">
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
            <label className="label">Admin email</label>
            <input
              className="input"
              type="email"
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Admin sign in"}
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setMode("otp");
              setError(null);
              setInfo(null);
            }}
          >
            Back to captain OTP
          </button>
        </form>
      )}
    </div>
  );
}
