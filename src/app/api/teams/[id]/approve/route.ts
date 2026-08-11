import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { emitEvent } from "@/lib/socket";
import { sendWelcomeEmail } from "@/lib/email";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data: team, error } = await db()
    .from("teams")
    .update({ status: "approved" })
    .eq("id", params.id)
    .select("id, team_name, email, captain_id, captain:users!teams_captain_id_fkey(name)")
    .single();

  if (error || !team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await logAudit(admin.id, "team.approved", team.id, { team_name: team.team_name });
  emitEvent("team:approved", { teamId: team.id, teamName: team.team_name });

  // Dispatch Welcome/Approval email to captain
  if (team.email) {
    const captainName = (team.captain as any)?.name || "Captain";
    sendWelcomeEmail({
      to: team.email,
      name: captainName,
      teamName: team.team_name,
      regId: team.id,
    }).catch((err) => console.error("[sendWelcomeEmail approve captain] error:", err));
  }

  // Dispatch Welcome email to players
  try {
    const { data: players } = await db()
      .from("players")
      .select("player_name, email")
      .eq("team_id", team.id);

    if (players) {
      for (const p of players) {
        if (p.email && p.email.toLowerCase().trim() !== team.email?.toLowerCase().trim()) {
          sendWelcomeEmail({
            to: p.email,
            name: p.player_name,
            teamName: team.team_name,
            regId: team.id,
          }).catch((err) => console.error(`[sendWelcomeEmail approve player ${p.email}] error:`, err));
        }
      }
    }
  } catch (err) {
    console.error("[fetch players for email] error:", err);
  }

  return NextResponse.json({ team });
}

