import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET() {
  console.log("Fetching DEMOO team...");
  
  const { data: teams, error: fetchError } = await db()
    .from("teams")
    .select("id")
    .eq("team_name", "DEMOO");
  
  if (fetchError) {
    return NextResponse.json({ error: "Error fetching team", details: fetchError }, { status: 500 });
  }
  
  if (!teams || teams.length === 0) {
    return NextResponse.json({ message: "No team named DEMOO found." });
  }
  
  const teamIds = teams.map((t: any) => t.id);
  
  const { error: playersError } = await db().from("players").delete().in("team_id", teamIds);
  if (playersError) {
    return NextResponse.json({ error: "Error deleting players", details: playersError }, { status: 500 });
  }
  
  const { error: teamsError } = await db().from("teams").delete().in("id", teamIds);
  if (teamsError) {
    return NextResponse.json({ error: "Error deleting teams", details: teamsError }, { status: 500 });
  }
  
  return NextResponse.json({ message: `Successfully deleted DEMOO team and its players.` });
}
