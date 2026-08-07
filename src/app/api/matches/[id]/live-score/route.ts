import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { emitEvent } from "@/lib/socket";
import { logAudit } from "@/lib/audit";

/**
 * PATCH /api/matches/:id/live-score
 *
 * Admin-only. Push an in-progress score snapshot to every connected client
 * WITHOUT finalising the match. Use this during the game to show live
 * kill/round counts on the leaderboard / bracket page.
 *
 * Body: { score1: number, score2: number }
 */

const schema = z.object({
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: match } = await db()
    .from("matches")
    .select("id, status, team1_id, team2_id")
    .eq("id", params.id)
    .single();

  if (!match)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });

  if (!["live", "awaiting_scores"].includes(match.status)) {
    return NextResponse.json(
      {
        error: `Match is "${match.status}" — can only push live scores for a running match`,
      },
      { status: 409 }
    );
  }

  const { score1, score2 } = parsed.data;

  // Persist the live snapshot so late-joining clients can read it.
  await db()
    .from("matches")
    .update({ live_score1: score1, live_score2: score2 })
    .eq("id", params.id);

  // Broadcast to every connected browser tab instantly.
  emitEvent("match:live_score", {
    matchId: params.id,
    score1,
    score2,
    updatedAt: new Date().toISOString(),
  });

  await logAudit(admin.id, "match.live_score_updated", params.id, {
    score1,
    score2,
  });

  return NextResponse.json({ ok: true, matchId: params.id, score1, score2 });
}
