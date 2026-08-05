import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";

/** Admin — all teams in every status, with rosters, for the approval queue. */
export async function GET() {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data } = await db()
    .from("teams")
    .select("*, captain:users!teams_captain_id_fkey(name, email), players(*)")
    .order("created_at", { ascending: false });

  return NextResponse.json({ teams: data ?? [] });
}
