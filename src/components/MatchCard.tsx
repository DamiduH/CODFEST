"use client";

import { motion } from "framer-motion";
import StatusBadge from "@/components/StatusBadge";
import TeamMark from "@/components/TeamMark";
import { ROUND_NAMES, type Match } from "@/lib/types";

export default function MatchCard({ match, children }: { match: Match; children?: React.ReactNode }) {
  const finished = match.status === "finished";
  const live = match.status === "live";

  return (
    <motion.div
      whileHover={{ y: -3, borderColor: live ? "rgba(113, 224, 0, 1)" : "rgba(113, 224, 0, 0.6)" }}
      transition={{ duration: 0.2 }}
      className={`border bg-night-900 transition-all duration-200 ${
        live ? "border-ember-600 shadow-glow" : "border-night-700"
      }`}
    >
      {/* MATCH_ID header bar */}
      <div
        className={`flex items-center justify-between border-b px-3 py-1 ${
          live ? "border-ember-600 bg-ember-600/20" : "border-night-700 bg-night-600"
        }`}
      >
        <span className={`font-mono text-[10px] ${live ? "text-ember-600 font-bold" : "text-zinc-400"}`}>
          MATCH_ID: #{match.id.slice(0, 4).toUpperCase()} //{" "}
          {(ROUND_NAMES[match.round] ?? `ROUND ${match.round}`).toUpperCase()}
        </span>
        <StatusBadge status={match.status} />
      </div>

      <div className="space-y-2.5 p-4">
        {[
          { team: match.team1, score: match.final_score1, id: match.team1_id },
          { team: match.team2, score: match.final_score2, id: match.team2_id },
        ].map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <TeamMark
              name={row.team?.team_name}
              logoUrl={row.team?.logo_url}
              highlight={finished && match.winner_id === row.id && !!row.id}
            />
            {finished && (
              <span
                className={`font-mono text-xl font-bold ${
                  match.winner_id === row.id ? "text-ember-600" : "text-zinc-500"
                }`}
              >
                {row.score}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pb-3 font-mono text-[10px] text-zinc-500">
        <span>
          {match.map && <span className="text-olive">MAP: {match.map.toUpperCase()} // </span>}
          {match.scheduled_time
            ? new Date(match.scheduled_time).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "TIME TBA"}
        </span>
        {match.stream_url && (
          <motion.a
            whileHover={{ scale: 1.05, x: 2 }}
            href={match.stream_url}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-ember-600 hover:text-ember-400 transition-colors"
          >
            ▶ SPECTATE STREAM
          </motion.a>
        )}
      </div>

      {children && <div className="border-t border-night-700 p-3">{children}</div>}
    </motion.div>
  );
}
