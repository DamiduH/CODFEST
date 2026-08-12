'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// Tell Next.js to not statically render this
export const dynamic = 'force-dynamic';

interface Player {
  slot: number;
  name: string;
  score: number;
  ping: number;
  team: string;
  kills: number;
  deaths: number;
}

interface ServerInfo {
  online: boolean;
  map?: string;
  hostname?: string;
  allies_score?: number;
  axis_score?: number;
  players?: Player[];
  error?: string;
}

export default function LiveServerPage() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/rcon?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setInfo(data);
        }
      } catch (err) {
        console.error("Error fetching live server info:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2500); // Poll every 2.5s
    return () => clearInterval(interval);
  }, []);

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0c10]">
        <span className="font-mono text-xs text-gray-600 animate-pulse">Loading…</span>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0c10] text-white px-4 text-center">
        {/* Scan-line overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)' }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="text-5xl opacity-30">🛡️</div>
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-red-500">ADMIN</span> ONLY
          </h1>
          <div className="rounded-full border border-red-900/50 bg-red-900/20 px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-red-400">
            Access Denied
          </div>
          <p className="max-w-xs font-mono text-sm text-gray-600">
            The live server page is restricted to tournament administrators.
          </p>
        </div>
      </main>
    );
  }

  const allies = info?.players?.filter((p) => p.team === 'allies') || [];
  const axis = info?.players?.filter((p) => p.team === 'axis') || [];

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-2xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              MAIN SERVER (S&D)
            </h1>
            {info?.online ? (
              <p className="text-gray-400 font-mono mt-1">Map: <span className="text-gray-200 font-bold">{info.map}</span></p>
            ) : (
              <p className="text-red-500 font-mono mt-1">Status: Offline / Unreachable</p>
            )}
          </div>
          
          {info?.online && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">Allies</span>
                <span className="text-5xl font-black text-blue-500">{info.allies_score}</span>
              </div>
              <span className="text-gray-600 font-bold text-xl">VS</span>
              <div className="flex flex-col items-center">
                <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">Axis</span>
                <span className="text-5xl font-black text-red-500">{info.axis_score}</span>
              </div>
            </div>
          )}
        </div>

        {/* Player Grids */}
        {info?.online && (
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Allies Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-blue-900/20 border-b border-blue-900/50 p-4">
                <h2 className="text-xl font-bold text-blue-400 text-center uppercase tracking-widest">Team 1 (Allies)</h2>
              </div>
              
              <div className="grid grid-cols-12 p-3 bg-gray-800/50 text-xs font-mono text-gray-400 font-bold">
                <div className="col-span-4">PLAYER</div>
                <div className="col-span-2 text-center">K</div>
                <div className="col-span-2 text-center">D</div>
                <div className="col-span-2 text-center">SCORE</div>
                <div className="col-span-2 text-right">PING</div>
              </div>
              
              <div className="divide-y divide-gray-800/60 font-mono text-sm">
                {allies.length === 0 ? (
                  <p className="text-center p-6 text-gray-500 italic">No players</p>
                ) : (
                  allies.map(p => (
                    <div key={p.slot} className="grid grid-cols-12 p-4 items-center hover:bg-gray-800/30 transition-colors">
                      <div className="col-span-4 font-bold truncate">{p.name}</div>
                      <div className="col-span-2 text-center text-green-400">{p.kills}</div>
                      <div className="col-span-2 text-center text-red-400">{p.deaths}</div>
                      <div className="col-span-2 text-center font-bold text-yellow-400">{p.score}</div>
                      <div className="col-span-2 text-right text-gray-400">{p.ping}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Axis Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-red-900/20 border-b border-red-900/50 p-4">
                <h2 className="text-xl font-bold text-red-400 text-center uppercase tracking-widest">Team 2 (Axis)</h2>
              </div>
              
              <div className="grid grid-cols-12 p-3 bg-gray-800/50 text-xs font-mono text-gray-400 font-bold">
                <div className="col-span-4">PLAYER</div>
                <div className="col-span-2 text-center">K</div>
                <div className="col-span-2 text-center">D</div>
                <div className="col-span-2 text-center">SCORE</div>
                <div className="col-span-2 text-right">PING</div>
              </div>
              
              <div className="divide-y divide-gray-800/60 font-mono text-sm">
                {axis.length === 0 ? (
                  <p className="text-center p-6 text-gray-500 italic">No players</p>
                ) : (
                  axis.map(p => (
                    <div key={p.slot} className="grid grid-cols-12 p-4 items-center hover:bg-gray-800/30 transition-colors">
                      <div className="col-span-4 font-bold truncate">{p.name}</div>
                      <div className="col-span-2 text-center text-green-400">{p.kills}</div>
                      <div className="col-span-2 text-center text-red-400">{p.deaths}</div>
                      <div className="col-span-2 text-center font-bold text-yellow-400">{p.score}</div>
                      <div className="col-span-2 text-right text-gray-400">{p.ping}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
