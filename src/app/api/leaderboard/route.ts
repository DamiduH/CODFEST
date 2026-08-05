import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/standings";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ leaderboard: await getLeaderboard() });
}
