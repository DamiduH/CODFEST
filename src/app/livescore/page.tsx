'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KillEvent {
  attacker: string;
  victim:   string;
  weapon:   string;
  time:     string;
}

interface PlayerRow {
  name:   string;
  kills:  number;
  deaths: number;
  team:   'allies' | 'axis' | 'free';
  kd:     string | number;
}

interface ScoreUpdate {
  scoreboard: PlayerRow[];
  map:        string;
  status:     string;
  time:       string;
}

interface MatchStatus {
  status: 'starting' | 'live' | 'ended';
  map:    string;
  scoreboard?: PlayerRow[];
  time:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  idle:     'WAITING',
  starting: 'STARTING',
  live:     'LIVE',
  ended:    'GAME OVER',
};

const STATUS_COLOR: Record<string, string> = {
  idle:     'text-gray-400 border-gray-600 bg-gray-800/50',
  starting: 'text-yellow-400 border-yellow-500/40 bg-yellow-900/20',
  live:     'text-green-400 border-green-500/40 bg-green-900/20',
  ended:    'text-red-400 border-red-500/40 bg-red-900/20',
};

const TEAM_COLOR: Record<string, string> = {
  allies: 'text-blue-400',
  axis:   'text-red-400',
  free:   'text-amber-400',
};

const TEAM_BG: Record<string, string> = {
  allies: 'bg-blue-500/10 border-blue-500/20',
  axis:   'bg-red-500/10 border-red-500/20',
  free:   'bg-amber-500/10 border-amber-500/20',
};

const KILL_ICON = '💀';
const WEAPON_ICON = '🔫';

// Determine if match has two teams (TDM-style)
function isTDM(scoreboard: PlayerRow[]): boolean {
  const teams = new Set(scoreboard.map(p => p.team).filter(t => t !== 'free'));
  return teams.size >= 2;
}

function TeamScore({ players, team }: { players: PlayerRow[]; team: 'allies' | 'axis' }) {
  const total = players.reduce((s, p) => s + p.kills, 0);
  const label = team === 'allies' ? '🔵 ALLIES' : '🔴 AXIS';
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${TEAM_BG[team]}`}>
      <div className={`text-xs font-mono font-bold tracking-widest ${TEAM_COLOR[team]}`}>{label}</div>
      <div className={`text-5xl font-black tabular-nums ${TEAM_COLOR[team]}`}>{total}</div>
      <div className="text-xs text-gray-500 font-mono">total kills</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LiveScorePage() {
  const [scoreboard,  setScoreboard]  = useState<PlayerRow[]>([]);
  const [killFeed,    setKillFeed]    = useState<KillEvent[]>([]);
  const [matchStatus, setMatchStatus] = useState<'idle'|'starting'|'live'|'ended'>('idle');
  const [mapName,     setMapName]     = useState<string>('—');
  const [lastUpdate,  setLastUpdate]  = useState<string>('');
  const [connected,   setConnected]   = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pusher  = getPusherClient();
    const channel = pusher.subscribe('cod4-server');

    pusher.connection.bind('connected', () => setConnected(true));
    pusher.connection.bind('disconnected', () => setConnected(false));
    pusher.connection.bind('error', () => setConnected(false));

    // Aggregated score snapshot
    channel.bind('score-update', (data: ScoreUpdate) => {
      setScoreboard(data.scoreboard ?? []);
      setMapName(data.map ?? '—');
      setMatchStatus((data.status as any) ?? 'live');
      setLastUpdate(data.time ?? '');
    });

    // Per-kill event (kill feed)
    channel.bind('kill-event', (data: KillEvent) => {
      setKillFeed(prev => [data, ...prev.slice(0, 29)]);
    });

    // Match lifecycle
    channel.bind('match-status', (data: MatchStatus) => {
      setMatchStatus(data.status);
      setMapName(data.map ?? '—');
      if (data.scoreboard) setScoreboard(data.scoreboard);
      if (data.status === 'starting') {
        setScoreboard([]);
        setKillFeed([]);
      }
    });

    // Mark connected after subscribe (fallback)
    setTimeout(() => {
      if (pusher.connection.state === 'connected') setConnected(true);
    }, 1000);

    return () => {
      pusher.unsubscribe('cod4-server');
    };
  }, []);

  // Auto-scroll kill feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [killFeed]);

  const tdm  = isTDM(scoreboard);
  const allies = scoreboard.filter(p => p.team === 'allies');
  const axis   = scoreboard.filter(p => p.team === 'axis');

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white selection:bg-red-500/30">
      {/* ── Scan-line overlay ── */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8">

        {/* ══════════ HEADER ══════════ */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">
              <span className="text-red-500">COD</span>FEST
              <span className="ml-3 text-2xl font-light text-gray-400">Live Score</span>
            </h1>
            <p className="mt-1 font-mono text-xs text-gray-500">
              Real-time match data · auto-updates via Pusher
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-mono font-bold tracking-widest transition-all duration-500 ${STATUS_COLOR[matchStatus]}`}>
              {matchStatus === 'live' && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              )}
              {matchStatus === 'starting' && (
                <span className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" />
              )}
              {STATUS_LABEL[matchStatus] ?? 'UNKNOWN'}
            </span>
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono transition-colors ${connected ? 'border-emerald-500/30 bg-emerald-900/20 text-emerald-400' : 'border-gray-700 bg-gray-800/50 text-gray-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
              {connected ? 'CONNECTED' : 'CONNECTING…'}
            </span>
          </div>
        </header>

        {/* ══════════ MAP INFO BAR ══════════ */}
        <div className="mb-6 flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500 tracking-widest">MAP</span>
            <span className="font-mono text-sm font-bold text-amber-400 uppercase">{mapName}</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500 tracking-widest">MODE</span>
            <span className="font-mono text-sm font-semibold text-gray-300">{tdm ? 'TDM' : 'FFA'}</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500 tracking-widest">PLAYERS</span>
            <span className="font-mono text-sm font-semibold text-gray-300">{scoreboard.length}</span>
          </div>
          {lastUpdate && (
            <>
              <div className="h-4 w-px bg-gray-700 ml-auto" />
              <span className="font-mono text-xs text-gray-600">Updated {lastUpdate}</span>
            </>
          )}
        </div>

        {/* ══════════ TDM TEAM SCORE CARDS ══════════ */}
        {tdm && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <TeamScore players={allies} team="allies" />
            <div className="flex items-center justify-center text-3xl font-black text-gray-600">VS</div>
            <TeamScore players={axis} team="axis" />
          </div>
        )}

        {/* ══════════ MAIN CONTENT GRID ══════════ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── SCOREBOARD ── (takes 2/3) */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden shadow-2xl shadow-black/40">
              {/* Table header */}
              <div className="grid grid-cols-12 border-b border-gray-800 bg-gray-800/60 px-4 py-2.5 font-mono text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-5">PLAYER</span>
                <span className="col-span-2 text-center text-green-500">{KILL_ICON} KILLS</span>
                <span className="col-span-2 text-center text-red-500">💀 DEATHS</span>
                <span className="col-span-2 text-center text-yellow-500">K/D</span>
              </div>

              {scoreboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="text-4xl opacity-30">🎮</div>
                  <p className="font-mono text-sm text-gray-600">Waiting for match data…</p>
                  <p className="font-mono text-xs text-gray-700">Start CoD4, then restart <code className="text-gray-500">node pusher.js</code></p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {scoreboard.map((player, idx) => (
                    <div
                      key={player.name}
                      className={`group grid grid-cols-12 items-center px-4 py-3 transition-all duration-200 hover:bg-gray-800/40 ${idx === 0 ? 'bg-amber-500/5' : ''}`}
                    >
                      {/* Rank */}
                      <div className="col-span-1 text-center">
                        {idx === 0 ? (
                          <span className="text-lg">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-lg">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="font-mono text-xs text-gray-600">{idx + 1}</span>
                        )}
                      </div>

                      {/* Name + Team */}
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <div className={`h-2 w-2 flex-shrink-0 rounded-full ${player.team === 'allies' ? 'bg-blue-500' : player.team === 'axis' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className={`truncate font-mono text-sm font-bold ${TEAM_COLOR[player.team] ?? 'text-white'}`}>
                          {player.name}
                        </span>
                        {tdm && (
                          <span className={`hidden sm:inline-block flex-shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase ${player.team === 'allies' ? 'bg-blue-900/50 text-blue-400' : 'bg-red-900/50 text-red-400'}`}>
                            {player.team}
                          </span>
                        )}
                      </div>

                      {/* Kills */}
                      <div className="col-span-2 text-center">
                        <span className={`font-mono text-lg font-black tabular-nums ${idx === 0 ? 'text-amber-400' : 'text-green-400'}`}>
                          {player.kills}
                        </span>
                      </div>

                      {/* Deaths */}
                      <div className="col-span-2 text-center">
                        <span className="font-mono text-sm font-bold tabular-nums text-red-400">
                          {player.deaths}
                        </span>
                      </div>

                      {/* K/D */}
                      <div className="col-span-2 text-center">
                        <span className={`font-mono text-sm font-bold tabular-nums ${Number(player.kd) >= 2 ? 'text-amber-400' : Number(player.kd) >= 1 ? 'text-gray-300' : 'text-gray-500'}`}>
                          {player.kd}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── KILL FEED ── (takes 1/3) */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden shadow-2xl shadow-black/40 flex flex-col h-full">
              <div className="border-b border-gray-800 bg-gray-800/60 px-4 py-2.5">
                <h2 className="font-mono text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  {WEAPON_ICON} Kill Feed
                </h2>
              </div>

              <div ref={feedRef} className="flex-1 overflow-y-auto divide-y divide-gray-800/40 max-h-[600px]">
                {killFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                    <div className="text-3xl opacity-20">⚔️</div>
                    <p className="font-mono text-xs text-gray-600">No kills yet</p>
                  </div>
                ) : (
                  killFeed.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-3 transition-all duration-300 ${idx === 0 ? 'bg-red-500/5 border-l-2 border-red-500' : 'hover:bg-gray-800/30'}`}
                      style={{ animation: idx === 0 ? 'fadeIn 0.3s ease-out' : undefined }}
                    >
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span className="font-bold text-green-400 truncate max-w-[80px]">{ev.attacker}</span>
                        <span className="text-red-500 flex-shrink-0">⚔</span>
                        <span className="font-bold text-red-400 truncate max-w-[80px]">{ev.victim}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-gray-500">{ev.weapon}</span>
                        <span className="font-mono text-[9px] text-gray-600">{ev.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {killFeed.length > 0 && (
                <div className="border-t border-gray-800 px-4 py-2 bg-gray-900/60">
                  <span className="font-mono text-[10px] text-gray-600">{killFeed.length} recent kill{killFeed.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

        </div>{/* end grid */}

        {/* ══════════ FOOTER ══════════ */}
        <footer className="mt-8 text-center font-mono text-xs text-gray-700">
          Live data from CoD4 server · Bridge: <code className="text-gray-600">node pusher.js</code>
        </footer>

      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </main>
  );
}
