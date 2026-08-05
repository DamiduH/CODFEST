"use client";

import { useEffect, useState } from "react";
import BracketView from "@/components/BracketView";
import { useSocketEvents } from "@/hooks/useSocket";
import type { Match } from "@/lib/types";

export default function BracketPage() {
  const [bracket, setBracket] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/bracket");
    const json = await res.json();
    setBracket(json.bracket ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useSocketEvents(["bracket:updated"], (_e, payload) => {
    if (payload?.bracket) setBracket(payload.bracket);
    else load();
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="section-title">Tournament Bracket</h1>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
        // Winners auto-advance the moment a result is confirmed
      </p>
      {loading ? (
        <p className="mt-10 text-center font-mono text-sm text-zinc-500">// LOADING BRACKET DATA…</p>
      ) : (
        <BracketView bracket={bracket} />
      )}
    </div>
  );
}
