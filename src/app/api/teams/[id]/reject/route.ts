import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { reason } = await req.json().catch(() => ({ reason: null }));

  const { data: team, error } = await db()
    .from("teams")
    .update({ status: "rejected" })
    .eq("id", params.id)
    .select("id, team_name")
    .single();

  if (error || !team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await logAudit(admin.id, "team.rejected", team.id, { team_name: team.team_name, reason });
  return NextResponse.json({ team });
}
