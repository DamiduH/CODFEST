"use client";

import { useState } from "react";

const RULE_SECTIONS = [
  "Match Format",
  "Weapons & Classes",
  "Maps & Selection",
  "Technical Rules",
  "Fair Play & Penalties",
] as const;

type RuleSection = (typeof RULE_SECTIONS)[number];

const classes = [
  { name: "Assault", allowed: "AK-47, M4A1, G36c", limit: "Unlimited" },
  { name: "SMG", allowed: "AK-74u, MP5", limit: "Max 2" },
  { name: "Sniper", allowed: "M40A3, R700", limit: "Max 1" },
  { name: "Shotgun", allowed: "W1200, M1014", limit: "Max 1" },
];

const matchRules = [
  ["First to", "7 rounds wins"],
  ["Half-time", "Side swap after 6 rounds"],
  ["Round Timer", "1:45"],
  ["Bomb Fuse", "45s"],
  ["Plant", "5s"],
  ["Defuse", "7s"],
  ["Friendly Fire", "ON"],
  ["Killcam", "OFF"],
  ["3rd Person Spectating", "OFF"],
  ["Perks & Killstreak Rewards", "OFF"],
];

function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 bg-ember-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function RulesPage() {
  const [openSection, setOpenSection] = useState<RuleSection | null>("Match Format");

  const toggleSection = (section: RuleSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <div className="site-gutter mx-auto max-w-7xl py-10">
      <div>
        <h1 className="section-title">Rules and Regulations</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
          // Tournament Rules
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {RULE_SECTIONS.map((section, index) => {
          const isOpen = openSection === section;
          const panelId = `rules-panel-${index}`;
          const buttonId = `rules-button-${index}`;

          return (
            <section key={section} className="card !translate-y-0 overflow-hidden hover:!shadow-none">
              <h2>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleSection(section)}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-ember-600/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ember-600 sm:px-5"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-ember-600/60">0{index + 1}</span>
                    <span className="font-display text-lg font-bold uppercase tracking-[0.06em] text-white">
                      {section}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                  >
                    <span className="absolute left-0 top-[7px] h-px w-4 bg-ember-600" />
                    <span className="absolute left-[7px] top-0 h-4 w-px bg-ember-600" />
                  </span>
                </button>
              </h2>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                aria-hidden={!isOpen}
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-night-700 px-4 py-5 sm:px-5">
                    {section === "Match Format" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em]">
                          {["5v5", "Promod LIVE", "LAN"].map((item) => (
                            <span key={item} className="border border-ember-600/50 bg-ember-600/10 px-2.5 py-1 text-ember-400">
                              {item}
                            </span>
                          ))}
                        </div>
                        <dl className="grid gap-px overflow-hidden border border-night-700 bg-night-700 sm:grid-cols-2">
                          {matchRules.map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-3 bg-night-900 px-3 py-2.5">
                              <dt className="text-sm text-zinc-400">{label}</dt>
                              <dd className="font-mono text-xs font-bold uppercase text-ember-400">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {section === "Weapons & Classes" && (
                      <div className="space-y-5">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {classes.map((weaponClass) => (
                            <div key={weaponClass.name} className="border border-night-700 bg-night-page/40 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="font-display text-lg uppercase tracking-[0.05em] text-white">{weaponClass.name}</h3>
                                <span className="font-mono text-[10px] font-bold uppercase text-ember-400">{weaponClass.limit}</span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-400">
                                <span className="font-mono text-[10px] uppercase text-zinc-500">Allowed: </span>
                                {weaponClass.allowed}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="border-l-2 border-ember-600 bg-ember-600/5 p-4">
                          <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ember-400">Banned</h3>
                          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                            <div><dt className="font-bold text-zinc-200">Weapons</dt><dd className="mt-1 text-zinc-400">All LMGs, P90, Skorpion, Barrett .50 Cal, Dragunov</dd></div>
                            <div><dt className="font-bold text-zinc-200">Attachments</dt><dd className="mt-1 text-zinc-400">Grenade Launchers, Red Dot, ACOG, Silencers</dd></div>
                            <div><dt className="font-bold text-zinc-200">Equipment</dt><dd className="mt-1 text-zinc-400">Claymores, C4, RPGs, Stun Grenades</dd></div>
                          </dl>
                          <p className="mt-4 border-t border-ember-600/20 pt-3 text-sm text-zinc-300">
                            <strong className="text-ember-400">Additional restriction:</strong> Each player may carry only 1 Frag + 1 Flash/Smoke.
                          </p>
                        </div>
                      </div>
                    )}

                    {section === "Maps & Selection" && (
                      <div className="space-y-5">
                        <div>
                          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Map Pool</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {["Crash", "Backlot", "Strike", "District", "Crossfire"].map((map) => (
                              <span key={map} className="border border-night-700 bg-night-page/40 px-3 py-1.5 font-mono text-xs uppercase text-zinc-300">{map}</span>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <p className="border-l-2 border-ember-600 px-3 py-2 text-sm text-zinc-400"><strong className="block text-zinc-200">Coin Toss Winner</strong>Chooses the map</p>
                          <p className="border-l-2 border-ember-600 px-3 py-2 text-sm text-zinc-400"><strong className="block text-zinc-200">Coin Toss Loser</strong>Chooses the starting side (Attack / Defend)</p>
                        </div>
                      </div>
                    )}

                    {section === "Technical Rules" && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          ["Before First Blood", "Restart the round if a disconnect occurs within 30 seconds and no kills have occurred."],
                          ["After First Blood", "Complete the current round. The disconnected player may rejoin the following round."],
                          ["Macros & Scripts", "Rapid-fire macros, scripts, and scroll-wheel fire binds are strictly prohibited."],
                        ].map(([title, detail]) => (
                          <div key={title} className="border-l-2 border-ember-600/60 px-3 py-1">
                            <h3 className="font-bold text-zinc-200">{title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-400">{detail}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {section === "Fair Play & Penalties" && (
                      <div className="space-y-5">
                        <div>
                          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Prohibited</h3>
                          <RuleList items={["Elevator glitches", "Sky-walking", "Out-of-bounds exploits", "Defusing through solid walls or boxes", "Ghosting"]} />
                        </div>
                        <p className="border-l-2 border-ember-600 px-3 py-2 text-sm leading-relaxed text-zinc-400">
                          <strong className="text-zinc-200">Ghosting rule:</strong> Eliminated players may not call out enemy positions to teammates who are still alive.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="border border-ember-600/40 bg-ember-600/5 p-3"><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ember-400">1st Offense</span><strong className="mt-1 block font-display text-lg uppercase text-white">Round Forfeit</strong></div>
                          <div className="border border-ember-600 bg-ember-600/10 p-3"><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ember-400">2nd Offense</span><strong className="mt-1 block font-display text-lg uppercase text-white">Match Disqualification</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
