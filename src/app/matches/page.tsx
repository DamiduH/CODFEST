"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import MatchCard from "@/components/MatchCard";
import { useSocketEvents } from "@/hooks/useSocket";
import type { Match } from "@/lib/types";

const TABS = [
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "awaiting", label: "Awaiting scores" },
  { key: "completed", label: "Completed" },
] as const;

export default function MatchesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [tab, setTab] = useState<string>("live");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (activeTab: string) => {
    setLoading(true);
    const res = await fetch(`/api/matches?status=${activeTab}`);
    const json = await res.json();
    setMatches(json.matches ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  useSocketEvents(
    ["match:live", "match:finished", "match:disputed", "match:score_submitted", "bracket:updated", "match:live_score"],
    () => load(tab)
  );

  const tabs = isAdmin ? [...TABS, { key: "disputed", label: "Disputed" }] : [...TABS];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="section-title">Active Queue</h1>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
        // Live feed — updates in real time, no refresh needed
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? "tab-btn-active" : "tab-btn"}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-center font-mono text-sm text-zinc-500">// LOADING MATCH DATA…</p>
      ) : matches.length === 0 ? (
        <p className="mt-10 text-center font-mono text-sm text-zinc-500">// NO MATCHES IN THIS SECTOR</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
