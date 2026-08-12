"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TeamMark from "@/components/TeamMark";
import MatchCard from "@/components/MatchCard";
import type { Match, Player, Team } from "@/lib/types";

export default function TeamProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ team: Team; players: Player[]; matches: Match[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teams/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)));
  }, [id]);

  if (error) return <p className="mt-20 text-center text-zinc-500">{error}</p>;
  if (!data) return <p className="mt-20 text-center text-zinc-500">Loading team…</p>;

  const { team, players, matches } = data;
  const upcoming = matches.filter((m) => ["scheduled", "live"].includes(m.status));
  const history = matches.filter((m) => m.status === "finished");

  return (
    <div className="site-gutter mx-auto max-w-7xl py-10">
      <div className="card flex flex-wrap items-center justify-between gap-6 p-6">
        <TeamMark name={team.team_name} logoUrl={team.logo_url} size={64} />
        <div className="flex gap-6 text-center">
          {(
            [
              [team.points, "Points"],
              [team.wins, "Wins"],
              [team.losses, "Losses"],
              [team.draws, "Draws"],
              [`${team.maps_won}–${team.maps_lost}`, "Maps"],
            ] as const
          ).map(([v, l]) => (
            <div key={l}>
              <div className="font-display text-2xl font-bold text-white">{v}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div>
          <h2 className="section-title text-xl">Roster</h2>
          <div className="card mt-4 divide-y divide-night-800">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-semibold text-zinc-200">{p.player_name}</div>
                  <div className="text-xs text-zinc-500">ID: {p.game_id}</div>
                </div>
                {p.is_substitute && (
                  <span className="border border-night-700 bg-night-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-zinc-400">
                    Sub
                  </span>
                )}
              </div>
            ))}
            {players.length === 0 && <p className="px-4 py-6 text-sm text-zinc-500">No players listed.</p>}
          </div>
        </div>

        <div className="lg:col-span-2">
          {upcoming.length > 0 && (
            <>
              <h2 className="section-title text-xl">Upcoming</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            </>
          )}
          <h2 className={`section-title text-xl ${upcoming.length > 0 ? "mt-8" : ""}`}>Match history</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No completed matches yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {history.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
