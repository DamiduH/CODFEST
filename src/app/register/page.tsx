"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface MemberRow {
  member_name: string;
  email: string;
  phone: string;
}

const emptyMember = (): MemberRow => ({ member_name: "", email: "", phone: "" });

/** Progress bar for the two-step flow. */
function StepBar({ step }: { step: 1 | 2 }) {
  const steps = ["[01] VERIFY EMAIL", "[02] REGISTER SQUAD"];
  return (
    <div className="mt-6 flex gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex-1">
          <p className={`font-mono text-xs ${i < step ? "text-ember-400" : "text-zinc-400"}`}>
            {label}
          </p>
          <div
            className={`mt-1 h-2 w-full ${
              i < step ? "bg-ember-400 shadow-glowSm" : "border border-night-700 bg-night-800"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Step 1 — captain identity
  const [acc, setAcc] = useState({ name: "", email: "" });

  // Step 2 — team details
  const [teamName, setTeamName] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([emptyMember()]);
  const [agreed, setAgreed] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  /* ─── Step 1: send OTP ─── */
  async function startOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(acc),
      });
      const text = await res.text();
      let json: { error?: string; needsVerification?: boolean; message?: string } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? "Unexpected server response" : `Server error (${res.status})`);
        return;
      }
      if (!res.ok && !json.needsVerification) {
        setError(json.error ?? "Could not start registration");
        return;
      }
      if (json.error && json.needsVerification) setInfo(json.error);
      else if (json.message) setInfo(json.message);
      setPendingVerify(acc.email);
      setOtp(process.env.NEXT_PUBLIC_OTP_TEST_MODE === "true" ? "000000" : "");
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Step 1: verify OTP ─── */
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingVerify) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const signed = await signIn("credentials", {
        email: pendingVerify,
        otp,
        redirect: false,
      });
      if (signed?.error) {
        const map: Record<string, string> = {
          OTP_EXPIRED: "OTP expired. Request a new code.",
          INVALID_OTP: "Invalid OTP. Check the code and try again.",
        };
        setError(map[signed.error] ?? "Invalid OTP");
        return;
      }
      setPendingVerify(null);
      router.refresh();
    } catch {
      setError("Could not verify OTP");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Step 1: resend OTP ─── */
  async function resendVerification() {
    if (!pendingVerify) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerify }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Could not resend OTP");
      else setInfo(json.message ?? "New OTP sent");
    } catch {
      setError("Could not resend OTP");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Step 2: register team ─── */
  async function registerTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) return setError("You must accept the rules and code of conduct");
    if (members.some((m) => !m.member_name)) {
      return setError("Every player needs a name");
    }
    setBusy(true);

    const payload = {
      team_name: teamName,
      phone: captainPhone,
      // use captain email as team contact email
      email: session?.user?.email ?? acc.email,
      agreed: true,
      players: members.map((m) => ({
        player_name: m.member_name,
        email: m.email,
        phone: m.phone,
        game_id: "",
        is_substitute: false,
      })),
    };

    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    if (logo) form.set("logo", logo);

    const res = await fetch("/api/teams/register", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Team registration failed");
    setDone(true);
  }

  /* ─── Loading ─── */
  if (status === "loading") {
    return <p className="mt-20 text-center text-zinc-500">Loading…</p>;
  }

  /* ─── Success screen ─── */
  if (done) {
    return (
      <div className="site-gutter mx-auto max-w-lg py-20 text-center">
        <p className="font-mono text-sm tracking-[0.1em] text-ember-400">// TRANSMISSION RECEIVED</p>
        <h1 className="section-title mt-3">Registration Submitted</h1>
        <p className="mt-3 text-zinc-400">
          Your squad is{" "}
          <strong className="text-amber-300">pending admin approval</strong>. Once approved, your
          team will appear on the Verified Squads page.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          You will be contacted via the email / phone you provided.
        </p>
      </div>
    );
  }

  /* ─── OTP verification screen ─── */
  if (pendingVerify) {
    return (
      <div className="site-gutter mx-auto max-w-md py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Verify Email</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // OTP_CLEARANCE
          </p>
        </div>
        <StepBar step={1} />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Enter the 6-digit code sent to{" "}
          <strong className="text-ember-400">{pendingVerify}</strong>
        </p>
        {process.env.NEXT_PUBLIC_OTP_TEST_MODE === "true" && (
          <p className="mt-2 text-center font-mono text-xs text-amber-300">
            CHECKING MODE — use OTP <strong>000000</strong>
          </p>
        )}
        <form onSubmit={verifyOtp} className="card mt-8 space-y-4 p-6">
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
            <label className="label">One-time password (OTP)</label>
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
          <button className="btn-primary w-full" disabled={busy || otp.length !== 6}>
            {busy ? "Verifying…" : "Verify & Continue →"}
          </button>
          <button type="button" className="btn-ghost w-full" disabled={busy} onClick={resendVerification}>
            {busy ? "Sending…" : "Resend OTP"}
          </button>
        </form>
      </div>
    );
  }

  /* ─── Step 1: captain email + OTP start ─── */
  if (!session) {
    return (
      <div className="site-gutter mx-auto max-w-md py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Squad Registration</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // TEAM LEADER — EMAIL VERIFICATION
          </p>
        </div>
        <StepBar step={1} />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Only the <strong className="text-zinc-300">team leader</strong> registers. Enter your
          name and email — we&apos;ll send a one-time code. No password required.
        </p>
        <form onSubmit={startOtp} className="card mt-8 space-y-4 p-6">
          {error && (
            <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
              {error}
            </p>
          )}
          <div>
            <label className="label">Leader&apos;s full name</label>
            <input
              className="input"
              placeholder="FULL_NAME"
              required
              minLength={2}
              value={acc.name}
              onChange={(e) => setAcc({ ...acc, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Leader&apos;s email</label>
            <input
              className="input"
              placeholder="LEADER@DOMAIN"
              type="email"
              required
              value={acc.email}
              onChange={(e) => setAcc({ ...acc, email: e.target.value })}
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Sending OTP…" : "Send OTP →"}
          </button>
        </form>
      </div>
    );
  }

  /* ─── Step 2: team + members form ─── */
  return (
    <div className="site-gutter mx-auto max-w-2xl py-12">
      <div className="border-l-4 border-l-ember-400 pl-4">
        <h1 className="section-title">Team Registration</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
          // SQUAD DETAILS
        </p>
      </div>
      <StepBar step={2} />

      <ul className="card mt-4 list-inside list-disc p-4 text-sm text-zinc-400">
        <li>Only the team leader submits this form.</li>
        <li>Team name must be unique (max 30 characters).</li>
        <li>Add all team members — name, email, and mobile number required.</li>
        <li>Real names only.</li>
      </ul>

      <form onSubmit={registerTeam} className="card mt-6 space-y-6 p-6">
        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}

        {/* ── Team basics ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Team name</label>
            <input
              className="input"
              required
              maxLength={30}
              placeholder="SQUAD_NAME"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Leader&apos;s mobile number</label>
            <input
              className="input"
              required
              placeholder="+91 XXXXX XXXXX"
              value={captainPhone}
              onChange={(e) => setCaptainPhone(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Team logo (optional, max 4 MB)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {/* ── Members ── */}
        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0">
              Team members{" "}
              <span className="text-zinc-500">(up to 5, not including you)</span>
            </label>
            {members.length < 5 && (
              <button
                type="button"
                className="text-sm font-semibold text-ember-400 hover:text-ember-500"
                onClick={() => setMembers([...members, emptyMember()])}
              >
                + Add member
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {members.map((m, i) => (
              <div
                key={i}
                className="relative rounded border border-night-700 bg-night-900 p-3"
              >
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Member {i + 1}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="label text-[11px]">Full name</label>
                    <input
                      className="input"
                      placeholder="Real name"
                      required
                      value={m.member_name}
                      onChange={(e) =>
                        setMembers(members.map((x, j) => (j === i ? { ...x, member_name: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Email address</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="member@domain"
                      value={m.email}
                      onChange={(e) =>
                        setMembers(members.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Mobile number</label>
                    <input
                      className="input"
                      placeholder="+91 XXXXX XXXXX"
                      required
                      value={m.phone}
                      onChange={(e) =>
                        setMembers(members.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
                {members.length > 1 && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 font-mono text-xs text-zinc-600 hover:text-red-400"
                    onClick={() => setMembers(members.filter((_, j) => j !== i))}
                    aria-label="Remove member"
                  >
                    ✕ remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Agreement ── */}
        <label className="flex items-start gap-3 text-sm text-zinc-400">
          <input
            type="checkbox"
            className="mt-1"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>
            We have read and agree to the tournament rules and code of conduct.
          </span>
        </label>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Submitting…" : "Submit Team Registration"}
        </button>
      </form>
    </div>
  );
}
