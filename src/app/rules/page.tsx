"use client";

import { useState } from "react";
import { MAP_POOL } from "@/lib/types";

const TABS = ["Code of Conduct", "General Rules", "Boys' Rules", "Girls' Rules", "Disputes & Penalties"] as const;

export default function RulesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Code of Conduct");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Rules of Engagement</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
            // Ignorance of the rules is not a defence
          </p>
        </div>
        <a href="/rulebook.pdf" download className="btn-ghost !px-4 !py-2 text-xs">
          ⬇ Download rulebook (PDF)
        </a>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={tab === t ? "tab-btn-active" : "tab-btn"}>
            {t}
          </button>
        ))}
      </div>

      <div className="card prose-invert mt-6 space-y-4 p-6 text-sm leading-relaxed text-zinc-300">
        {tab === "Code of Conduct" && (
          <>
            <h2 className="font-display text-xl font-bold text-white">Code of Conduct</h2>
            <ul className="list-inside list-disc space-y-2 text-zinc-400">
              <li><strong className="text-zinc-200">Sportsmanship:</strong> treat opponents, teammates and organizers with respect at all times — in-game, on Discord and on stream chat.</li>
              <li><strong className="text-zinc-200">Anti-cheat:</strong> wallhacks, aimbots, macro scripts, modified game files or any external assistance means immediate disqualification of the entire team and a permanent ban.</li>
              <li><strong className="text-zinc-200">Harassment policy:</strong> zero tolerance for hate speech, threats, doxxing or targeted harassment. First offence: match forfeit. Second offence: team removal.</li>
              <li><strong className="text-zinc-200">Penalty rights:</strong> admins may issue warnings, round deductions, map forfeits, match forfeits or disqualification. Admin decisions after dispute review are final.</li>
              <li><strong className="text-zinc-200">Honest reporting:</strong> knowingly submitting a false score or doctored screenshot is treated as cheating.</li>
            </ul>
          </>
        )}

        {tab === "General Rules" && (
          <>
            <h2 className="font-display text-xl font-bold text-white">General Rules</h2>
            <ul className="list-inside list-disc space-y-2 text-zinc-400">
              <li><strong className="text-zinc-200">Format:</strong> 5v5 Search &amp; Destroy, CoD4 Promod LIVE, single-elimination bracket. All rounds Bo1; the Grand Final is Bo3.</li>
              <li><strong className="text-zinc-200">Team composition:</strong> 5 players + 1 captain (captain may also play) + 1 optional substitute. Only rostered players may participate.</li>
              <li><strong className="text-zinc-200">Map pool:</strong> {MAP_POOL.join(", ")}. Maps are assigned per fixture and shown on the match card.</li>
              <li><strong className="text-zinc-200">Weapon restrictions:</strong> Promod standard — no grenade launchers, no Martyrdom, no Last Stand, no Juggernaut. Sniper limit: 1 per team per round.</li>
              <li><strong className="text-zinc-200">Punctuality:</strong> teams get a 15-minute grace period after scheduled time. A no-show is a forfeit.</li>
              <li><strong className="text-zinc-200">Disconnects:</strong> if a player disconnects in the first 30 seconds of a round with no kills, the round is replayed once per map. Otherwise play continues; the player may rejoin.</li>
              <li><strong className="text-zinc-200">Score proof:</strong> both captains must screenshot the final scoreboard before leaving the server. No screenshot = your report cannot be verified.</li>
            </ul>
          </>
        )}

        {tab === "Boys' Rules" && (
          <>
            <h2 className="font-display text-xl font-bold text-white">Boys&apos; Bracket Rules</h2>
            <ul className="list-inside list-disc space-y-2 text-zinc-400">
              <li>All General Rules apply.</li>
              <li>Match length: MR12 (first to 13 rounds).</li>
              <li>Knife-round for side selection; the winner picks Attack or Defence.</li>
              <li>One 5-minute tactical pause per team per map.</li>
            </ul>
          </>
        )}

        {tab === "Girls' Rules" && (
          <>
            <h2 className="font-display text-xl font-bold text-white">Girls&apos; Bracket Rules</h2>
            <ul className="list-inside list-disc space-y-2 text-zinc-400">
              <li>All General Rules apply.</li>
              <li>Match length: MR10 (first to 11 rounds).</li>
              <li>Knife-round for side selection; the winner picks Attack or Defence.</li>
              <li>One 5-minute tactical pause per team per map.</li>
              <li>Mixed rosters may compete in the girls&apos; bracket only if at least 4 of 5 active players are female.</li>
            </ul>
          </>
        )}

        {tab === "Disputes & Penalties" && (
          <>
            <h2 className="font-display text-xl font-bold text-white">Dispute / Protest Procedure</h2>
            <ol className="list-inside list-decimal space-y-2 text-zinc-400">
              <li>After the match, <strong className="text-zinc-200">both captains submit the final score with a screenshot</strong> from their team dashboard.</li>
              <li>If both submissions agree, the result confirms automatically and the bracket updates instantly. No admin needed.</li>
              <li>If the submissions conflict, the match is flagged <strong className="text-purple-300">Disputed</strong> and locked. Admins review both screenshots side by side and set the final score. Their ruling is final.</li>
              <li>Protests about anything else (cheating, roster violations, conduct) must reach an admin on Discord within 30 minutes of the match ending, with evidence.</li>
              <li>Submitting a fake screenshot is cheating: team disqualified, results voided.</li>
            </ol>
            <h3 className="font-display text-lg font-bold text-white">Penalty ladder</h3>
            <ul className="list-inside list-disc space-y-1 text-zinc-400">
              <li>Warning → round deduction → map forfeit → match forfeit → disqualification.</li>
              <li>Cheating and fake evidence skip straight to disqualification.</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
