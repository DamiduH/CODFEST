import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { emitEvent } from "@/lib/socket";

/** Admin marks a match as live. */
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data: match } = await db()
    .from("matches").select("id, status, team1_id, team2_id").eq("id", params.id).single();
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "scheduled") {
    return NextResponse.json({ error: `Cannot start a match in "${match.status}" state` }, { status: 409 });
  }
  if (!match.team1_id || !match.team2_id) {
    return NextResponse.json({ error: "Both team slots must be filled first" }, { status: 409 });
  }

  await db().from("matches").update({ status: "live" }).eq("id", params.id);
  await logAudit(admin.id, "match.started", params.id);
  emitEvent("match:live", { matchId: params.id });
  return NextResponse.json({ ok: true });
}
