// CoD4 Log-Parser Bridge → Pusher
// Watches games_mp.log for:
//   • K;        → kill events (kill-event + aggregated score-update)
//   • InitGame  → match start  (match-status: starting)
//   • ShutdownGame → match end (match-status: ended)
//   • ClientUserinfoChanged → player roster (name, team)
// Run with: node pusher.js

require("dotenv").config({ path: ".env.local" });

const Pusher = require("pusher");
const Tail   = require("tail").Tail;
const fs     = require("fs");
const path   = require("path");

// ─── Validate environment ─────────────────────────────────────────────────────
const required = ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"];
const missing  = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[ERROR] Missing env vars: ${missing.join(", ")}`);
  console.error("  → Add them to .env.local and re-run.");
  process.exit(1);
}

const LOG_PATH   = process.env.LOG_PATH || "F:/mycod/Call of duty 4 Multiplayer/main/games_mp.log";
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
  m40a3:             "M40A3",
  ak47:              "AK-47",
  ak47_gl:           "AK-47 w/ GL",
  m16:               "M16A4",
  m16_gl:            "M16A4 w/ GL",
  mp5:               "MP5",
  usp:               "USP .45",
  deserteagle:       "Desert Eagle",
  deserteagle_xmags: "Desert Eagle Extended",
  m1014:             "M1014",
  w1200:             "W1200",
  barrett:           "Barrett .50cal",
  dragunov:          "Dragunov",
  rpg:               "RPG-7",
  m203_stand_mp:     "M203",
  claymore_mp:       "Claymore",
  frag:              "Frag Grenade",
  flash_grenade:     "Flash Grenade",
  smoke_grenade:     "Smoke Grenade",
  stun_grenade:      "Stun Grenade",
  minigun:           "Minigun",
  none:              "Unknown",
};

function formatWeaponName(raw) {
  if (!raw || raw === "none") return "Unknown";
  const lower = raw.toLowerCase().replace(/_mp$/i, "").trim();
  return WEAPON_ALIASES[lower] ?? raw.replace(/_mp$/i, "").replace(/_/g, " ").toUpperCase();
}

// ─── State ────────────────────────────────────────────────────────────────────
// players: { [num]: { name, team } }
// scores:  { [name]: { kills, deaths, team } }
let players    = {};
let scores     = {};
let currentMap = "Unknown";
let matchStatus = "idle"; // idle | live | ended

function resetMatch() {
  players    = {};
  scores     = {};
}

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Build a sorted scoreboard snapshot from current state
function buildScoreboard() {
  const rows = Object.entries(scores).map(([name, s]) => ({
    name,
    kills:  s.kills,
    deaths: s.deaths,
    team:   s.team ?? "free",
    kd: s.deaths === 0 ? s.kills : (s.kills / s.deaths).toFixed(2),
  }));
  rows.sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  return rows;
}

// ─── Line parsers ─────────────────────────────────────────────────────────────

// Strip leading timestamp "  1234:56 " from CoD4 log lines
function stripTimestamp(line) {
  return line.replace(/^\s*\d+:\d+\s+/, "").trim();
}

// InitGame → "InitGame: \sv_hostname\...\mapname\mp_crash\..."
function parseInitGame(line) {
  const stripped = stripTimestamp(line);
  if (!stripped.startsWith("InitGame:")) return false;

  const mapMatch = stripped.match(/\\mapname\\([^\\]+)/);
  currentMap  = mapMatch ? mapMatch[1] : "Unknown";
  matchStatus = "live";
  resetMatch();

  console.log(`[MATCH START] Map: ${currentMap}`);
  return true;
}

// ShutdownGame
function parseShutdownGame(line) {
  const stripped = stripTimestamp(line);
  if (!stripped.startsWith("ShutdownGame:")) return false;

  matchStatus = "ended";
  console.log(`[MATCH END] Map: ${currentMap}`);
  return true;
}

// ClientUserinfoChanged — keeps player name/team roster up-to-date
// Format: "ClientUserinfoChanged: 0 n\PlayerName\t\2\..."
//   team: 1 = Free/Spectator, 2 = Allies, 3 = Axis
function parseClientUserinfo(line) {
  const stripped = stripTimestamp(line);
  if (!stripped.startsWith("ClientUserinfoChanged:")) return false;

  const numMatch  = stripped.match(/ClientUserinfoChanged:\s*(\d+)/);
  const nameMatch = stripped.match(/\\n\\([^\\]+)/);
  const teamMatch = stripped.match(/\\t\\(\d+)/);

  if (!numMatch || !nameMatch) return false;

  const num  = numMatch[1];
  const name = nameMatch[1].trim();
  const teamNum = teamMatch ? parseInt(teamMatch[1], 10) : 1;
  const team = teamNum === 2 ? "allies" : teamNum === 3 ? "axis" : "free";

  players[num] = { name, team };

  // Ensure the player has a score entry
  if (!scores[name]) {
    scores[name] = { kills: 0, deaths: 0, team };
  } else {
    scores[name].team = team; // update team if changed
  }

  return false; // don't push a Pusher event for this
}

// K; line — kill event + update aggregated scores
// K;<attacker_num>;<attacker_score>;<attacker_team>;<attacker_name>;
//   <victim_num>;<victim_score>;<victim_team>;<victim_name>;<weapon>;<damage>;<mod>;<hitloc>
function parseKillLine(line) {
  const stripped = stripTimestamp(line);
  if (!stripped.startsWith("K;")) return null;

  const parts = stripped.split(";");
  if (parts.length < 10) return null;

  const attackerName = parts[4]  ?? "Unknown";
  const victimName   = parts[8]  ?? "Unknown";
  const weapon       = parts[9]  ?? "none";
  const mod          = parts[11] ?? "";

  const displayWeapon =
    weapon === "none" ? formatWeaponName(mod) : formatWeaponName(weapon);

  // Determine teams from the parsed K; fields directly (more reliable than roster)
  const attackerTeamRaw = parts[3] ?? "free";
  const victimTeamRaw   = parts[7] ?? "free";
  const mapTeam = (t) => t === "allies" ? "allies" : t === "axis" ? "axis" : "free";

  // Update aggregated scores
  if (!scores[attackerName]) {
    scores[attackerName] = { kills: 0, deaths: 0, team: mapTeam(attackerTeamRaw) };
  }
  if (!scores[victimName]) {
    scores[victimName]   = { kills: 0, deaths: 0, team: mapTeam(victimTeamRaw) };
  }

  // Suicide / world kill: attacker === victim
  if (attackerName === victimName) {
    scores[victimName].deaths += 1;
  } else {
    scores[attackerName].kills  += 1;
    scores[victimName].deaths   += 1;
  }

  if (matchStatus === "idle") matchStatus = "live"; // auto-detect live if no InitGame seen

  return {
    attacker: attackerName,
    victim:   victimName,
    weapon:   displayWeapon,
    time:     nowTime(),
  };
}

// ─── Tail the log file ────────────────────────────────────────────────────────
console.log(`[CoD4 Bridge] Watching: ${resolvedLog}`);
console.log(`[CoD4 Bridge] Pushing to Pusher channel: cod4-server`);
console.log(`[CoD4 Bridge] Events: kill-event | score-update | match-status`);
console.log("─".repeat(60));

const tail = new Tail(resolvedLog, {
  encoding:       "utf-8",
  flushAtEOF:     true,
  useWatchFile:   true,   // works better on Windows (NTFS)
  fsWatchOptions: { interval: 200 },
});

tail.on("line", async (line) => {
  // ── Match lifecycle ──
  if (parseInitGame(line)) {
    try {
      await pusher.trigger("cod4-server", "match-status", {
        status: "starting",
        map:    currentMap,
        time:   nowTime(),
      });
    } catch (err) { console.error("[Pusher Error]", err.message); }
    return;
  }

  if (parseShutdownGame(line)) {
    try {
      await pusher.trigger("cod4-server", "match-status", {
        status:    "ended",
        map:       currentMap,
        scoreboard: buildScoreboard(),
        time:      nowTime(),
      });
    } catch (err) { console.error("[Pusher Error]", err.message); }
    return;
  }

  // ── Player roster ──
  parseClientUserinfo(line);

  // ── Kill events ──
  const killEvent = parseKillLine(line);
  if (!killEvent) return;

  console.log(`[KILL] ${killEvent.attacker} → ${killEvent.victim} (${killEvent.weapon}) at ${killEvent.time}`);

  const scoreboard = buildScoreboard();

  try {
    // 1) Per-kill event (for kill feed)
    await pusher.trigger("cod4-server", "kill-event", killEvent);

    // 2) Full scoreboard snapshot (for live score panel)
    await pusher.trigger("cod4-server", "score-update", {
      scoreboard,
      map:    currentMap,
      status: matchStatus,
      time:   killEvent.time,
    });
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
