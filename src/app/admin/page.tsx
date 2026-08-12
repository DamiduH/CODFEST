"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import TeamMark from "@/components/TeamMark";
import { getSocket, useSocketEvents } from "@/hooks/useSocket";
import { ROUND_NAMES, type Match } from "@/lib/types";

const TABS = ["Registrations", "Fixtures", "Live Score", "Disputes", "Announcements", "Audit log"] as const;

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Registrations");
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role === "admin") getSocket().emit("join:admin");
  }, [session]);

  useSocketEvents(["admin:dispute_alert", "team:registered"], (event) => {
    setAlert(
      event === "admin:dispute_alert"
        ? "A match was just disputed — check the Disputes tab."
        : "A new team just registered — check Registrations."
    );
  });

  if (status === "loading") return <p className="mt-20 text-center text-zinc-500">Loading…</p>;
  if (session?.user?.role !== "admin") {
    return (
      <div className="site-gutter mx-auto max-w-md py-20 text-center">
        <h1 className="section-title">Admins only</h1>
        <p className="mt-3 text-zinc-400">This area requires an administrator account.</p>
        <Link href="/login" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="site-gutter mx-auto max-w-7xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-night-700 pb-4">
        <div>
          <h1 className="section-title">HQ Command</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-zinc-400">
            SYS.ADMIN // DEPT. STATUS: NOMINAL
          </p>
        </div>
        <span className="border border-ember-400 bg-ember-600/10 px-3 py-1 font-mono text-xs text-ember-400">
          CLEARANCE: ADMIN
        </span>
      </div>

      {alert && (
        <div className="mt-4 flex items-center justify-between border border-purple-500/40 bg-purple-500/10 px-4 py-3 font-mono text-xs text-purple-200">
          {alert}
          <button onClick={() => setAlert(null)} className="ml-4 text-purple-300 hover:text-white">✕</button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={tab === t ? "tab-btn-active" : "tab-btn"}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Registrations" && <RegistrationsPanel />}
        {tab === "Fixtures" && <FixturesPanel />}
        {tab === "Live Score" && <LiveScorePanel />}
        {tab === "Disputes" && <DisputesPanel />}
        {tab === "Announcements" && <AnnouncementsPanel />}
        {tab === "Audit log" && <AuditPanel />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RegistrationsPanel() {
  const [teams, setTeams] = useState<any[]>([]);
  const load = useCallback(() => {
    fetch("/api/admin/teams").then((r) => r.json()).then((j) => setTeams(j.teams ?? []));
  }, []);
  useEffect(load, [load]);

  async function act(id: string, action: "approve" | "reject") {
    await fetch(`/api/teams/${id}/${action}`, { method: "PATCH" });
    load();
  }

  const pending = teams.filter((t) => t.status === "pending");
  const others = teams.filter((t) => t.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-lg font-bold uppercase text-white">
          Pending approval ({pending.length})
        </h2>
        {pending.length === 0 && <p className="mt-3 text-sm text-zinc-500">Nothing pending.</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {pending.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center justify-between">
                <TeamMark name={t.team_name} logoUrl={t.logo_url} size={40} />
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                Captain: <span className="text-zinc-300">{t.captain?.name}</span> ({t.captain?.email})<br />
                Phone: {t.phone ?? "—"} · Discord: {t.discord || "—"}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Roster: {t.players?.map((p: any) => p.player_name).join(", ") || "—"}
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn-primary flex-1 !py-2 text-xs" onClick={() => act(t.id, "approve")}>Approve</button>
                <button className="btn-ghost flex-1 !py-2 text-xs !text-red-300 hover:!border-red-500" onClick={() => act(t.id, "reject")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold uppercase text-white">All teams</h2>
        <div className="card mt-4 divide-y divide-night-800">
          {others.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <TeamMark name={t.team_name} logoUrl={t.logo_url} size={28} />
              <div className="flex items-center gap-3">
                <StatusBadge status={t.status} />
                {t.status === "rejected" && (
                  <button className="font-mono text-xs font-bold uppercase text-ember-500 hover:text-ember-400" onClick={() => act(t.id, "approve")}>
                    Approve instead
                  </button>
                )}
              </div>
            </div>
          ))}
          {others.length === 0 && <p className="px-4 py-6 text-sm text-zinc-500">No processed teams yet.</p>}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FixturesPanel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/matches").then((r) => r.json()).then((j) => setMatches(j.matches ?? []));
  }, []);
  useEffect(load, [load]);
  useSocketEvents(["bracket:updated", "match:finished", "match:live"], () => load());

  async function generate() {
    if (!confirm("Regenerating wipes ALL existing fixtures and results. Continue?")) return;
    setBusy(true);
    const res = await fetch("/api/bracket/generate", { method: "POST" });
    const json = await res.json();
    setMsg(res.ok ? `Bracket generated with ${json.bracket.length} first-round matches.` : json.error);
    setBusy(false);
    load();
  }

  async function start(id: string) {
    const res = await fetch(`/api/matches/${id}/start`, { method: "PATCH" });
    if (!res.ok) setMsg((await res.json()).error);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : "Generate bracket from approved teams"}
        </button>
        {msg && <span className="text-sm text-zinc-400">{msg}</span>}
      </div>

      <div className="card mt-6 divide-y divide-night-800">
        {matches.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-28 text-xs font-bold uppercase text-zinc-500">
                {ROUND_NAMES[m.round] ?? `Round ${m.round}`}
              </span>
              <span className="text-zinc-200">{m.team1?.team_name ?? "TBD"}</span>
              <span className="text-zinc-600">vs</span>
              <span className="text-zinc-200">{m.team2?.team_name ?? "TBD"}</span>
              {m.status === "finished" && (
                <span className="font-display font-bold text-ember-400">
                  {m.final_score1}–{m.final_score2}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={m.status} />
              {m.status === "scheduled" && m.team1_id && m.team2_id && (
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => start(m.id)}>
                  Start match
                </button>
              )}
            </div>
          </div>
        ))}
        {matches.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            No fixtures yet — generate the bracket once teams are approved.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * LiveScorePanel — admin pushes in-progress scores from the server laptop.
 * Updates persist to the DB and Socket.IO broadcasts to every connected tab.
 */
function LiveScorePanel() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Record<string, { s1: string; s2: string }>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch("/api/matches?status=live")
      .then((r) => r.json())
      .then((j) => {
        const matches: Match[] = j.matches ?? [];
        setLiveMatches(matches);
        // Seed score inputs from whatever is already stored.
        setScores((prev) => {
          const next = { ...prev };
          matches.forEach((m: any) => {
            if (!next[m.id]) {
              next[m.id] = {
                s1: m.live_score1 != null ? String(m.live_score1) : "",
                s2: m.live_score2 != null ? String(m.live_score2) : "",
              };
            }
          });
          return next;
        });
      });
  }, []);

  useEffect(load, [load]);
  // Refresh list when a match starts or finishes.
  useSocketEvents(["match:live", "match:finished"], () => load());

  async function push(matchId: string) {
    const s = scores[matchId];
    if (!s) return;
    const score1 = parseInt(s.s1, 10);
    const score2 = parseInt(s.s2, 10);
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      setFeedback((p) => ({ ...p, [matchId]: "Enter valid non-negative scores." }));
      return;
    }
    setBusy((p) => ({ ...p, [matchId]: true }));
    const res = await fetch(`/api/matches/${matchId}/live-score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score1, score2 }),
    });
    const json = await res.json();
    setBusy((p) => ({ ...p, [matchId]: false }));
    setFeedback((p) => ({
      ...p,
      [matchId]: res.ok ? `✓ Pushed ${score1}–${score2} live!` : json.error ?? "Failed",
    }));
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded border border-night-700 bg-night-850 px-5 py-4">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
            Admin Live Score View
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-500">
            The /livescore page is restricted to admins only. Open it to see the live feed.
          </p>
        </div>
        <Link
          href="/livescore"
          target="_blank"
          className="btn-primary !px-4 !py-2 !text-xs whitespace-nowrap"
        >
          Open Live Score ↗
        </Link>
      </div>

      <div className="mb-4 border border-ember-400/30 bg-ember-600/10 px-4 py-3 font-mono text-xs text-ember-300">
        🖥️ SERVER LAPTOP — type the current in-game score and hit <strong>Push</strong>.
        All connected browsers update instantly via Socket.IO.
      </div>

      {liveMatches.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          No live matches right now. Start a match in the Fixtures tab first.
        </p>
      )}

      <div className="space-y-4">
        {liveMatches.map((m) => {
          const isBusy = busy[m.id] ?? false;
          const fb = feedback[m.id];
          const s = scores[m.id] ?? { s1: "", s2: "" };
          return (
            <div key={m.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {ROUND_NAMES[m.round] ?? `Round ${m.round}`}
                  </span>
                  <h3 className="mt-0.5 font-display text-lg font-bold text-white">
                    {m.team1?.team_name ?? "TBD"}
                    <span className="mx-2 text-zinc-500">vs</span>
                    {m.team2?.team_name ?? "TBD"}
                  </h3>
                </div>
                <span className="animate-pulse rounded bg-green-500/20 px-2 py-1 font-mono text-[10px] font-bold uppercase text-green-400">
                  ● LIVE
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-4">
                {/* Team 1 score */}
                <div>
                  <label className="label">{m.team1?.team_name ?? "Team 1"}</label>
                  <input
                    id={`s1-${m.id}`}
                    type="number"
                    min={0}
                    className="input !w-24 text-center text-xl font-bold"
                    value={s.s1}
                    onChange={(e) =>
                      setScores((p) => ({
                        ...p,
                        [m.id]: { ...p[m.id], s1: e.target.value },
                      }))
                    }
                    placeholder="0"
                    onKeyDown={(e) => e.key === "Enter" && push(m.id)}
                  />
                </div>

                <span className="mb-2 text-xl font-bold text-zinc-600">–</span>

                {/* Team 2 score */}
                <div>
                  <label className="label">{m.team2?.team_name ?? "Team 2"}</label>
                  <input
                    id={`s2-${m.id}`}
                    type="number"
                    min={0}
                    className="input !w-24 text-center text-xl font-bold"
                    value={s.s2}
                    onChange={(e) =>
                      setScores((p) => ({
                        ...p,
                        [m.id]: { ...p[m.id], s2: e.target.value },
                      }))
                    }
                    placeholder="0"
                    onKeyDown={(e) => e.key === "Enter" && push(m.id)}
                  />
                </div>

                <button
                  className="btn-primary !py-2.5"
                  onClick={() => push(m.id)}
                  disabled={isBusy}
                >
                  {isBusy ? "Pushing…" : "Push live score"}
                </button>

                {fb && (
                  <span
                    className={`font-mono text-xs ${
                      fb.startsWith("✓") ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {fb}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DisputesPanel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const load = useCallback(() => {
    fetch("/api/matches?status=disputed").then((r) => r.json()).then((j) => setMatches(j.matches ?? []));
  }, []);
  useEffect(load, [load]);
  useSocketEvents(["match:disputed", "match:finished"], () => load());

  return (
    <div className="space-y-6">
      {matches.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">No disputed matches. 🎉</p>
      )}
      {matches.map((m) => <DisputeCard key={m.id} match={m} onResolved={load} />)}
    </div>
  );
}

function DisputeCard({ match, onResolved }: { match: Match; onResolved: () => void }) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/matches/${match.id}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ final_score1: Number(s1), final_score2: Number(s2), note }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Failed to resolve");
    onResolved();
  }

  const sides = [
    { label: match.team1?.team_name ?? "Team 1", sub: match.submission_team1 },
    { label: match.team2?.team_name ?? "Team 2", sub: match.submission_team2 },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-white">
          {sides[0].label} vs {sides[1].label}
          <span className="ml-3 text-xs font-semibold uppercase text-zinc-500">
            {ROUND_NAMES[match.round] ?? `Round ${match.round}`} · {match.map}
          </span>
        </h3>
        <StatusBadge status={match.status} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sides.map((side, i) => (
          <div key={i} className="border border-night-700 bg-night-850 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {side.label} reported
            </div>
            {side.sub ? (
              <>
                <div className="mt-1 font-display text-2xl font-bold text-white">
                  {side.sub.score_own} – {side.sub.score_opponent}
                  <span className="ml-2 text-xs font-semibold text-zinc-500">(own – opponent)</span>
                </div>
                <a href={side.sub.screenshot_url} target="_blank" rel="noreferrer">
                  <img
                    src={side.sub.screenshot_url}
                    alt={`${side.label} proof`}
                    className="mt-3 max-h-56 w-full border border-night-700 object-contain"
                  />
                </a>
                <div className="mt-2 text-[11px] text-zinc-500">
                  Submitted {new Date(side.sub.submitted_at).toLocaleString("en-IN")}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No submission received.</p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={resolve} className="mt-4 flex flex-wrap items-end gap-3">
        {error && <p className="w-full rounded bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <div>
          <label className="label">{sides[0].label}</label>
          <input className="input !w-24 text-center" type="number" min={0} required value={s1} onChange={(e) => setS1(e.target.value)} />
        </div>
        <div>
          <label className="label">{sides[1].label}</label>
          <input className="input !w-24 text-center" type="number" min={0} required value={s2} onChange={(e) => setS2(e.target.value)} />
        </div>
        <div className="min-w-48 flex-1">
          <label className="label">Resolution note (goes to audit log)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Team B screenshot matches demo" />
        </div>
        <button className="btn-primary !py-2.5" disabled={busy}>
          {busy ? "Resolving…" : "Set final score"}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AnnouncementsPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Announcement published — every open tab just got it live.");
      setTitle("");
      setBody("");
    } else setMsg((await res.json()).error);
  }

  return (
    <form onSubmit={post} className="card max-w-2xl space-y-4 p-6">
      {msg && <p className="border border-night-700 bg-night-850 px-3 py-2 font-mono text-xs text-zinc-300">{msg}</p>}
      <div>
        <label className="label">Title</label>
        <input className="input" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Body</label>
        <textarea className="input min-h-32" required maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? "Publishing…" : "Publish announcement"}</button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function AuditPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/audit-logs").then((r) => r.json()).then((j) => setLogs(j.logs ?? []));
  }, []);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-night-700 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-night-800 align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                {new Date(l.created_at).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-zinc-300">{l.actor?.name ?? "system"}</td>
              <td className="px-4 py-3 font-semibold text-ember-400">{l.action}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">
                <code className="break-all">{JSON.stringify(l.details)}</code>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No audit entries yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
