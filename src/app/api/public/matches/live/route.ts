import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { rateLimit, rateLimited } from "@/lib/ratelimit";

export async function GET(req: Request) {
  if (!rateLimit(req)) return rateLimited();
  const { data } = await db()
    .from("matches")
    .select(
      "id, round, map, stream_url, status, team1:teams!matches_team1_id_fkey(team_name), team2:teams!matches_team2_id_fkey(team_name)"
    )
    .eq("status", "live");
  return NextResponse.json({ matches: data ?? [] });
}
