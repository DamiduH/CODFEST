import { NextResponse } from "next/server";
import { getBracket } from "@/lib/bracket";
import { rateLimit, rateLimited } from "@/lib/ratelimit";

export async function GET(req: Request) {
  if (!rateLimit(req)) return rateLimited();
  const bracket = await getBracket();
  return NextResponse.json({
    bracket: bracket.map((m) => ({
      id: m.id,
      round: m.round,
      slot: m.bracket_slot,
      team1: m.team1?.team_name ?? null,
      team2: m.team2?.team_name ?? null,
      status: m.status,
      final_score: m.status === "finished" ? [m.final_score1, m.final_score2] : null,
    })),
  });
}
