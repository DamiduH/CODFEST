import { NextResponse } from "next/server";
import { getMatchWithTeams } from "@/lib/standings";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const match = await getMatchWithTeams(params.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json({ match });
}
