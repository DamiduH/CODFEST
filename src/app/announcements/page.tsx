"use client";

import { useEffect, useState } from "react";
import { useSocketEvents } from "@/hooks/useSocket";
import type { Announcement } from "@/lib/types";

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((j) => setItems(j.announcements ?? []))
      .finally(() => setLoading(false));
  }, []);

  useSocketEvents(["announcement:new"], (_e, payload) => {
    if (payload?.announcement) setItems((prev) => [payload.announcement, ...prev]);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="section-title">Announcements</h1>
      {loading ? (
        <p className="mt-10 text-center text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-zinc-500">Nothing announced yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((a) => (
            <article key={a.id} className="card p-6">
              <time className="text-xs text-zinc-500">
                {new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
              </time>
              <h2 className="mt-1 font-display text-xl font-bold text-white">{a.title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-400">{a.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
