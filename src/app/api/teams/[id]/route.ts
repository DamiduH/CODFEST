import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { MATCH_SELECT } from "@/lib/standings";

/** Public team profile: roster, stats and match history. Contact PII is stripped for non-owners. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data: team } = await db()
    .from("teams")
    .select("*, captain:users!teams_captain_id_fkey(name)")
    .eq("id", params.id)
    .single();

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const user = await currentUser();
  const isOwner = user && (user.id === team.captain_id || user.role === "admin");
  if (!isOwner) {
    delete team.phone;
    delete team.email;
    delete team.whatsapp;
  }

  const [{ data: players }, { data: matches }] = await Promise.all([
    db().from("players").select("*").eq("team_id", params.id).order("is_substitute"),
    db()
      .from("matches")
      .select(MATCH_SELECT)
      .or(`team1_id.eq.${params.id},team2_id.eq.${params.id}`)
      .order("round"),
  ]);

  return NextResponse.json({ team, players: players ?? [], matches: matches ?? [] });
}

const rosterSchema = z.object({
  discord: z.string().max(60).optional(),
  whatsapp: z.string().max(20).optional(),
  players: z
    .array(
      z.object({
        player_name: z.string().min(1).max(50),
        game_id: z.string().min(1).max(50),
        is_substitute: z.boolean().default(false),
      })
    )
    .min(1)
    .max(7)
    .optional(),
});

/** Captain edits their own roster/contact info. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: team } = await db().from("teams").select("id, captain_id").eq("id", params.id).single();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.captain_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "You can only edit your own team" }, { status: 403 });
  }

  const parsed = rosterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { players, ...fields } = parsed.data;
  if (Object.keys(fields).length) {
    await db().from("teams").update(fields).eq("id", params.id);
  }
  if (players) {
    await db().from("players").delete().eq("team_id", params.id);
    await db().from("players").insert(players.map((p) => ({ ...p, team_id: params.id })));
  }

  await logAudit(user.id, "team.roster_updated", params.id, { fields: Object.keys(parsed.data) });
  return NextResponse.json({ ok: true });
}
