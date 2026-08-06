"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface PlayerRow {
  player_name: string;
  game_id: string;
  is_substitute: boolean;
}

const emptyPlayer = (sub = false): PlayerRow => ({ player_name: "", game_id: "", is_substitute: sub });

/** [01] OTP / [02] SQUAD progress indicator. */
function StepBar({ step }: { step: 1 | 2 }) {
  const steps = ["[01] OTP", "[02] SQUAD"];
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

  const [acc, setAcc] = useState({ name: "", email: "" });
  const [team, setTeam] = useState({ team_name: "", phone: "", email: "", discord: "", whatsapp: "" });
  const [players, setPlayers] = useState<PlayerRow[]>([emptyPlayer()]);
  const [substitute, setSubstitute] = useState<PlayerRow | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState<string | null>(null);

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
      setTeam((t) => ({ ...t, email: t.email || acc.email }));
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setBusy(false);
    }
  }

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

  async function registerTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) return setError("You must accept the rules and code of conduct");
    if (players.some((p) => !p.player_name || !p.game_id)) {
      return setError("Every player needs a name and an in-game ID");
    }
    setBusy(true);

    const payload = {
      ...team,
      agreed: true,
      players: [
        ...players.map((p) => ({ ...p, is_substitute: false })),
        ...(substitute && substitute.player_name ? [{ ...substitute, is_substitute: true }] : []),
      ],
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

  if (status === "loading") {
    return <p className="mt-20 text-center text-zinc-500">Loading…</p>;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="font-mono text-sm tracking-[0.1em] text-ember-400">// TRANSMISSION RECEIVED</p>
        <h1 className="section-title mt-3">Registration Submitted</h1>
        <p className="mt-3 text-zinc-400">
          Your squad is <strong className="text-amber-300">pending admin approval</strong>. Once
          approved, your team dashboard unlocks and you&apos;ll appear on the Verified Squads page.
        </p>
        <button className="btn-primary mt-8" onClick={() => router.push("/dashboard")}>
          Go to team dashboard
        </button>
      </div>
    );
  }

  if (pendingVerify) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
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

  // Not signed in → name + email only (no password / login setup)
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Squad Registration</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // OTP + TEAM ONLY
          </p>
        </div>
        <StepBar step={1} />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Only the <strong className="text-zinc-300">team captain</strong> registers. We verify your
          email with an OTP — no password account to create.
        </p>
        <form onSubmit={startOtp} className="card mt-8 space-y-4 p-6">
          {error && (
            <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
              {error}
            </p>
          )}
          <div>
            <label className="label">Captain real name</label>
            <input
              className="input"
              placeholder="REAL_NAME"
              required
              minLength={2}
              value={acc.name}
              onChange={(e) => setAcc({ ...acc, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              placeholder="OPERATOR@DOMAIN"
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

  // Signed in → team registration
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="border-l-4 border-l-ember-400 pl-4">
        <h1 className="section-title">Squad Authorization</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
          // DEPARTMENTAL_REGISTRATION_HUB
        </p>
      </div>
      <StepBar step={2} />
      <ul className="card mt-4 list-inside list-disc p-4 text-sm text-zinc-400">
        <li>Only the captain submits this form.</li>
        <li>Keep the team name short (max 30 characters).</li>
        <li>Use a valid phone number — organizers will contact you on it.</li>
        <li>Real names only for all players.</li>
      </ul>

      <form onSubmit={registerTeam} className="card mt-6 space-y-5 p-6">
        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Team name</label>
            <input
              className="input"
              required
              maxLength={30}
              value={team.team_name}
              onChange={(e) => setTeam({ ...team, team_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Team logo (optional, max 4 MB)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="label">Captain phone</label>
            <input
              className="input"
              required
              value={team.phone}
              onChange={(e) => setTeam({ ...team, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Team contact email</label>
            <input
              className="input"
              type="email"
              required
              value={team.email}
              onChange={(e) => setTeam({ ...team, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Discord</label>
            <input
              className="input"
              placeholder="username"
              value={team.discord}
              onChange={(e) => setTeam({ ...team, discord: e.target.value })}
            />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input
              className="input"
              placeholder="+91…"
              value={team.whatsapp}
              onChange={(e) => setTeam({ ...team, whatsapp: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0">Players (up to 5, plus you as captain)</label>
            {players.length < 5 && (
              <button
                type="button"
                className="text-sm font-semibold text-ember-400 hover:text-ember-500"
                onClick={() => setPlayers([...players, emptyPlayer()])}
              >
                + Add player
              </button>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {players.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  placeholder={`Player ${i + 1} real name`}
                  value={p.player_name}
                  onChange={(e) =>
                    setPlayers(players.map((x, j) => (j === i ? { ...x, player_name: e.target.value } : x)))
                  }
                />
                <input
                  className="input"
                  placeholder="In-game ID"
                  value={p.game_id}
                  onChange={(e) =>
                    setPlayers(players.map((x, j) => (j === i ? { ...x, game_id: e.target.value } : x)))
                  }
                />
                {players.length > 1 && (
                  <button
                    type="button"
                    className="px-2 text-zinc-500 hover:text-red-400"
                    onClick={() => setPlayers(players.filter((_, j) => j !== i))}
                    aria-label="Remove player"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0">Substitute (optional)</label>
            <button
              type="button"
              className="text-sm font-semibold text-ember-400 hover:text-ember-500"
              onClick={() => setSubstitute(substitute ? null : emptyPlayer(true))}
            >
              {substitute ? "Remove substitute" : "+ Add substitute"}
            </button>
          </div>
          {substitute && (
            <div className="mt-2 flex gap-2">
              <input
                className="input"
                placeholder="Substitute real name"
                value={substitute.player_name}
                onChange={(e) => setSubstitute({ ...substitute, player_name: e.target.value })}
              />
              <input
                className="input"
                placeholder="In-game ID"
                value={substitute.game_id}
                onChange={(e) => setSubstitute({ ...substitute, game_id: e.target.value })}
              />
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 text-sm text-zinc-400">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            We have read and agree to the tournament rules, code of conduct and the dual-submission
            score verification procedure.
          </span>
        </label>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Submitting…" : "Submit team registration"}
        </button>
      </form>
    </div>
  );
}
