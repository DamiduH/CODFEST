"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PlayerRow {
  player_name: string;
  game_id: string;
  is_substitute: boolean;
}

const emptyPlayer = (sub = false): PlayerRow => ({ player_name: "", game_id: "", is_substitute: sub });

/** [01] AUTH / [02] SQUAD progress indicator. */
function StepBar({ step }: { step: 1 | 2 }) {
  const steps = ["[01] AUTH", "[02] SQUAD"];
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

  // Step 1 — captain account
  const [acc, setAcc] = useState({ name: "", email: "", password: "" });
  // Step 2 — team details
  const [team, setTeam] = useState({ team_name: "", phone: "", email: "", discord: "", whatsapp: "" });
  const [players, setPlayers] = useState<PlayerRow[]>([emptyPlayer()]);
  const [substitute, setSubstitute] = useState<PlayerRow | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<string | null>(null);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(acc),
      });
      const text = await res.text();
      let json: { error?: string; needsVerification?: boolean } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? "Unexpected server response" : `Server error (${res.status}). Check SUPABASE_SERVICE_ROLE_KEY and Resend env vars.`);
        return;
      }
      if (!res.ok && !json.needsVerification) {
        setError(json.error ?? "Registration failed");
        return;
      }
      // Do not auto-login — email must be verified first.
      setPendingVerify(acc.email);
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!pendingVerify) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerify }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) setError(json.error ?? "Could not resend email");
      else setError(null);
    } catch {
      setError("Could not resend email");
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
    const json = await res.json();
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
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="font-mono text-sm tracking-[0.1em] text-ember-400">// VERIFY OPERATOR EMAIL</p>
        <h1 className="section-title mt-3">Check your inbox</h1>
        <p className="mt-3 text-zinc-400">
          We sent a verification link to{" "}
          <strong className="text-ember-400">{pendingVerify}</strong>. Open it to activate
          your captain account, then sign in to finish squad registration.
        </p>
        {error && (
          <p className="mt-4 border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/login" className="btn-primary">
            Go to login
          </Link>
          <button type="button" className="btn-ghost" disabled={busy} onClick={resendVerification}>
            {busy ? "Sending…" : "Resend email"}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: not signed in → create captain account
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Command Center</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // DEPARTMENTAL_REGISTRATION_HUB
          </p>
        </div>
        <StepBar step={1} />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Create your <strong className="text-zinc-300">captain account</strong> first. Only the
          team captain should register.
        </p>
        <form onSubmit={createAccount} className="card mt-8 space-y-4 p-6">
          {error && <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">{error}</p>}
          <div>
            <label className="label">Commanding Officer (real name)</label>
            <input className="input" placeholder="REAL_NAME" required minLength={2} value={acc.name}
              onChange={(e) => setAcc({ ...acc, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" placeholder="OPERATOR@DOMAIN" type="email" required value={acc.email}
              onChange={(e) => setAcc({ ...acc, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Password (min 8 characters)</label>
            <input className="input" placeholder="********" type="password" required minLength={8} value={acc.password}
              onChange={(e) => setAcc({ ...acc, password: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating account…" : "Next_Step →"}
          </button>
        </form>
      </div>
    );
  }

  // Step 2: signed in → team registration form
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
        {error && <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Team name</label>
            <input className="input" required maxLength={30} value={team.team_name}
              onChange={(e) => setTeam({ ...team, team_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Team logo (optional, max 4 MB)</label>
            <input className="input" type="file" accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="label">Captain phone</label>
            <input className="input" required value={team.phone}
              onChange={(e) => setTeam({ ...team, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Team contact email</label>
            <input className="input" type="email" required value={team.email}
              onChange={(e) => setTeam({ ...team, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Discord</label>
            <input className="input" placeholder="username" value={team.discord}
              onChange={(e) => setTeam({ ...team, discord: e.target.value })} />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input className="input" placeholder="+91…" value={team.whatsapp}
              onChange={(e) => setTeam({ ...team, whatsapp: e.target.value })} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0">Players (up to 5, plus you as captain)</label>
            {players.length < 5 && (
              <button type="button" className="text-sm font-semibold text-ember-400 hover:text-ember-500"
                onClick={() => setPlayers([...players, emptyPlayer()])}>
                + Add player
              </button>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {players.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" placeholder={`Player ${i + 1} real name`} value={p.player_name}
                  onChange={(e) => setPlayers(players.map((x, j) => (j === i ? { ...x, player_name: e.target.value } : x)))} />
                <input className="input" placeholder="In-game ID" value={p.game_id}
                  onChange={(e) => setPlayers(players.map((x, j) => (j === i ? { ...x, game_id: e.target.value } : x)))} />
                {players.length > 1 && (
                  <button type="button" className="px-2 text-zinc-500 hover:text-red-400"
                    onClick={() => setPlayers(players.filter((_, j) => j !== i))} aria-label="Remove player">
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
            <button type="button" className="text-sm font-semibold text-ember-400 hover:text-ember-500"
              onClick={() => setSubstitute(substitute ? null : emptyPlayer(true))}>
              {substitute ? "Remove substitute" : "+ Add substitute"}
            </button>
          </div>
          {substitute && (
            <div className="mt-2 flex gap-2">
              <input className="input" placeholder="Substitute real name" value={substitute.player_name}
                onChange={(e) => setSubstitute({ ...substitute, player_name: e.target.value })} />
              <input className="input" placeholder="In-game ID" value={substitute.game_id}
                onChange={(e) => setSubstitute({ ...substitute, game_id: e.target.value })} />
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 text-sm text-zinc-400">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            We have read and agree to the tournament rules, code of conduct and the
            dual-submission score verification procedure.
          </span>
        </label>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Submitting…" : "Submit team registration"}
        </button>
      </form>
    </div>
  );
}
