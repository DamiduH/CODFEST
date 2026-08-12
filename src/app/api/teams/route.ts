import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public — approved teams only. */
export async function GET() {
  const { data, error } = await db()
    .from("teams")
    .select("id, team_name, logo_url, points, wins, losses, draws, created_at, captain:users!teams_captain_id_fkey(name)")
    .eq("status", "approved")
    .order("team_name");

  const headers = { "Cache-Control": "no-store, max-age=0" };
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers });
  return NextResponse.json({ teams: data }, { headers });
}
