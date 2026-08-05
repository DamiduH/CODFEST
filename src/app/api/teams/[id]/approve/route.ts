import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { emitEvent } from "@/lib/socket";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data: team, error } = await db()
    .from("teams")
    .update({ status: "approved" })
    .eq("id", params.id)
    .select("id, team_name")
    .single();

  if (error || !team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await logAudit(admin.id, "team.approved", team.id, { team_name: team.team_name });
  emitEvent("team:approved", { teamId: team.id, teamName: team.team_name });
  return NextResponse.json({ team });
}
