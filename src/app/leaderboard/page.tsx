"use client";

import { useEffect, useState } from "react";
import TeamMark from "@/components/TeamMark";
import { useSocketEvents } from "@/hooks/useSocket";

interface Row {
  rank: number;
  id: string;
  team_name: string;
  logo_url: string | null;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  maps_won: number;
  maps_lost: number;
  win_rate: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/leaderboard");
    const json = await res.json();
    setRows(json.leaderboard ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useSocketEvents(["leaderboard:updated"], (_e, payload) => {
    if (payload?.leaderboard) {
      setRows(payload.leaderboard);
      setLoading(false);
    } else load();
  });

  return (
    <div className="site-gutter mx-auto max-w-7xl py-10">
      <h1 className="section-title">Leaderboard</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-night-700 bg-night-600 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-center">PTS</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="px-4 py-3 text-center">D</th>
              <th className="px-4 py-3 text-center">Win rate</th>
              <th className="px-4 py-3 text-center">Maps (W–L)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">No approved teams yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-night-800 font-mono last:border-0 hover:bg-night-850">
                  <td className={`px-4 py-3 font-bold ${r.rank <= 3 ? "text-ember-600" : "text-zinc-500"}`}>
                    {String(r.rank).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3"><TeamMark name={r.team_name} logoUrl={r.logo_url} size={28} /></td>
                  <td className="px-4 py-3 text-center text-lg font-bold text-white">{r.points}</td>
                  <td className="px-4 py-3 text-center text-ember-500">{r.wins}</td>
                  <td className="px-4 py-3 text-center text-red-400">{r.losses}</td>
                  <td className="px-4 py-3 text-center text-zinc-400">{r.draws}</td>
                  <td className="px-4 py-3 text-center text-zinc-300">{r.win_rate}%</td>
                  <td className="px-4 py-3 text-center text-zinc-400">{r.maps_won}–{r.maps_lost}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
