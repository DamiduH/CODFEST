import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/standings";
import { rateLimit, rateLimited } from "@/lib/ratelimit";

/** Public read-only API (e.g. Discord bots). No PII, rate-limited. */
export async function GET(req: Request) {
  if (!rateLimit(req)) return rateLimited();
  const leaderboard = await getLeaderboard();
  return NextResponse.json({
    leaderboard: leaderboard.map(({ id, rank, team_name, points, wins, losses, draws, win_rate }) => ({
      id, rank, team_name, points, wins, losses, draws, win_rate,
    })),
  });
}
