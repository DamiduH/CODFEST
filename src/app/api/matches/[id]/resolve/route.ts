import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { finalizeMatch } from "@/lib/bracket";
import { getMatchWithTeams } from "@/lib/standings";

const schema = z.object({
  final_score1: z.number().int().min(0),
  final_score2: z.number().int().min(0),
  note: z.string().max(500).optional(),
});

/** Admin manually resolves a disputed (or drawn) match after reviewing both screenshots. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const match = await getMatchWithTeams(params.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (!["disputed", "awaiting_scores", "finished", "live"].includes(match.status)) {
    return NextResponse.json({ error: `Cannot resolve a match in "${match.status}" state` }, { status: 409 });
  }

  const { final_score1, final_score2, note } = parsed.data;
  const winnerId = await finalizeMatch(match, final_score1, final_score2, admin.id);

  await logAudit(admin.id, "match.resolved", params.id, {
    final_score: [final_score1, final_score2],
    winner_id: winnerId,
    note: note ?? null,
    previous_status: match.status,
  });

  return NextResponse.json({ status: "finished", winnerId });
}
