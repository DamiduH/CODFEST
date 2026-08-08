'use client';

// Tell Next.js: never statically pre-render this page.
// It is 100% client-side (live Pusher subscription) and has no server data.
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { getPusherClient } from '@/lib/pusher';

interface KillEvent {
  attacker: string;
  victim: string;
  weapon: string;
  time: string;
}

export default function ScoreboardPage() {
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);

  useEffect(() => {
    // Pusher client is only created here — safely inside useEffect (browser only).
    const pusher  = getPusherClient();
    const channel = pusher.subscribe('cod4-server');

    channel.bind('score-update', (data: KillEvent) => {
      setKillFeed((prev) => [data, ...prev.slice(0, 19)]); // keep last 20
    });

    return () => {
      pusher.unsubscribe('cod4-server');
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-wide text-red-500">
            CoD4 LIVE KILLFEED
          </h1>
          <span className="flex items-center gap-2 text-xs font-mono bg-green-900/50 text-green-400 border border-green-500/30 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            LIVE SERVER CONNECTED
          </span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-gray-800/50 border-b border-gray-800 text-xs font-mono text-gray-400 grid grid-cols-12">
            <span className="col-span-4">ATTACKER</span>
            <span className="col-span-1 text-center"></span>
            <span className="col-span-4">VICTIM</span>
            <span className="col-span-3 text-right">WEAPON / TIME</span>
          </div>

          <div className="divide-y divide-gray-800/60 font-mono text-sm">
            {killFeed.length === 0 ? (
              <p className="p-8 text-center text-gray-500 italic">
                Waiting for match events...
              </p>
            ) : (
              killFeed.map((event, index) => (
                <div
                  key={index}
                  className="p-4 grid grid-cols-12 items-center hover:bg-gray-800/30 transition-colors"
                >
                  <span className="col-span-4 font-bold text-green-400 truncate">
                    {event.attacker}
                  </span>
                  <span className="col-span-1 text-center text-red-500 font-bold">
                    ⚔️
                  </span>
                  <span className="col-span-4 font-bold text-red-400 truncate">
                    {event.victim}
                  </span>
                  <div className="col-span-3 text-right flex flex-col text-xs text-gray-400">
                    <span className="text-gray-300 font-semibold">{event.weapon}</span>
                    <span className="text-gray-500">{event.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}