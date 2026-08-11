import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Returns the logged-in captain's own team + players (or 404 if none). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: team } = await db()
    .from("teams")
    .select("*")
    .eq("captain_id", user.id)
    .maybeSingle();

  if (!team) return NextResponse.json({ team: null, players: [] });

  const { data: players } = await db()
    .from("players")
    .select("*")
    .eq("team_id", team.id)
    .order("is_substitute");

  return NextResponse.json({ team, players: players ?? [] });
}
