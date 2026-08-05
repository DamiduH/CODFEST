import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { MATCH_SELECT } from "@/lib/standings";
import { MAP_POOL } from "@/lib/types";

const STATUS_FILTERS: Record<string, string[]> = {
  live: ["live"],
  upcoming: ["scheduled"],
  awaiting: ["awaiting_scores"],
  disputed: ["disputed"],
  completed: ["finished"],
};

/** Public — list matches, optional ?status=live|upcoming|awaiting|disputed|completed */
export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status");
  let query = db().from("matches").select(MATCH_SELECT).order("round").order("bracket_slot");
  if (status && STATUS_FILTERS[status]) query = query.in("status", STATUS_FILTERS[status]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: data });
}

const createSchema = z.object({
  round: z.number().int().min(1).max(6).default(1),
  bracket_slot: z.number().int().min(0).default(0),
  team1_id: z.string().uuid(),
  team2_id: z.string().uuid(),
  map: z.enum(MAP_POOL as [string, ...string[]]).optional(),
  scheduled_time: z.string().datetime({ offset: true }).optional(),
  stream_url: z.string().url().optional(),
});

/** Admin — create a single fixture manually. */
export async function POST(req: Request) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.team1_id === parsed.data.team2_id) {
    return NextResponse.json({ error: "A team cannot play itself" }, { status: 400 });
  }

  const { data: match, error } = await db()
    .from("matches")
    .insert({ ...parsed.data, status: "scheduled" })
    .select(MATCH_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(admin.id, "match.created", match.id, parsed.data);
  return NextResponse.json({ match }, { status: 201 });
}
