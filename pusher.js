// CoD4 Log-Parser Bridge → Pusher
// Watches games_mp.log for kill events (K; lines) and pushes them to Pusher.
// Run with: node pusher.js

require("dotenv").config({ path: ".env.local" });

const Pusher = require("pusher");
const Tail = require("tail").Tail;
const fs = require("fs");
const path = require("path");

// ─── Validate environment ─────────────────────────────────────────────────────
const required = ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[ERROR] Missing env vars: ${missing.join(", ")}`);
  console.error("  → Add them to .env.local and re-run.");
  process.exit(1);
}

const LOG_PATH = process.env.LOG_PATH || "F:/mycod/Call of duty 4 Multiplayer/main/games_mp.log";
const resolvedLog = path.resolve(LOG_PATH);

if (!fs.existsSync(resolvedLog)) {
  console.error(`[ERROR] Log file not found: ${resolvedLog}`);
  console.error("  → Make sure CoD4 is running and LOG_PATH is correct in .env.local");
  process.exit(1);
}

// ─── Pusher server client ─────────────────────────────────────────────────────
const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

// ─── Weapon name formatter ────────────────────────────────────────────────────
const WEAPON_ALIASES = {
  m40a3:          "M40A3",
  ak47:           "AK-47",
  ak47_gl:        "AK-47 w/ GL",
  m16:            "M16A4",
  m16_gl:         "M16A4 w/ GL",
  mp5:            "MP5",
  usp:            "USP .45",
  deserteagle:    "Desert Eagle",
  deserteagle_xmags: "Desert Eagle Extended",
  m1014:          "M1014",
  w1200:          "W1200",
  barrett:        "Barrett .50cal",
  dragunov:       "Dragunov",
  rpg:            "RPG-7",
  m203_stand_mp:  "M203",
  claymore_mp:    "Claymore",
  frag:           "Frag Grenade",
  flash_grenade:  "Flash Grenade",
  smoke_grenade:  "Smoke Grenade",
  stun_grenade:   "Stun Grenade",
  minigun:        "Minigun",
  none:           "Unknown",
  // add more as needed
};

function formatWeaponName(raw) {
  if (!raw || raw === "none") return "Unknown";
  const lower = raw.toLowerCase().replace(/_mp$/i, "").trim();
  return WEAPON_ALIASES[lower] ?? raw.replace(/_mp$/i, "").replace(/_/g, " ").toUpperCase();
}

// ─── Kill-line parser ─────────────────────────────────────────────────────────
// CoD4 K; line format:
// K;<attacker_num>;<attacker_score>;<attacker_team>;<attacker_name>;<victim_num>;<victim_score>;<victim_team>;<victim_name>;<weapon>;<damage>;<means_of_death>;<hitloc>
function parseKillLine(line) {
  // Strip leading timestamp if present (e.g. " 1234:56 K;...")
  const stripped = line.replace(/^\s*\d+:\d+\s+/, "").trim();
  if (!stripped.startsWith("K;")) return null;

  const parts = stripped.split(";");
  // Minimum: K + 12 fields = index 0..12
  if (parts.length < 10) return null;

  const attacker = parts[4]  ?? "Unknown";
  const victim   = parts[8]  ?? "Unknown";
  const weapon   = parts[9]  ?? "none";
  // means of death is parts[11] — useful for "Suicide", "Falling" etc.
  const mod      = parts[11] ?? "";

  // Determine display weapon: if it's a world/environment kill, use the MOD
  const displayWeapon =
    weapon === "none" ? formatWeaponName(mod) : formatWeaponName(weapon);

  const now = new Date();
  const time = now.toLocaleTimeString("en-IN", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return { attacker, victim, weapon: displayWeapon, time };
}

// ─── Tail the log file ────────────────────────────────────────────────────────
console.log(`[CoD4 Bridge] Watching: ${resolvedLog}`);
console.log(`[CoD4 Bridge] Pushing to Pusher channel: cod4-server / score-update`);
console.log("─".repeat(60));

const tail = new Tail(resolvedLog, {
  encoding:     "utf-8",
  flushAtEOF:   true,
  useWatchFile: true,   // works better on Windows (NTFS)
  fsWatchOptions: { interval: 200 },
});

tail.on("line", async (line) => {
  const event = parseKillLine(line);
  if (!event) return;

  console.log(`[KILL] ${event.attacker} → ${event.victim} (${event.weapon}) at ${event.time}`);

  try {
    await pusher.trigger("cod4-server", "score-update", event);
  } catch (err) {
    console.error("[Pusher Error]", err.message);
  }
});

tail.on("error", (err) => {
  console.error("[Tail Error]", err);
});

process.on("SIGINT", () => {
  console.log("\n[CoD4 Bridge] Stopped.");
  tail.unwatch();
  process.exit(0);
});
