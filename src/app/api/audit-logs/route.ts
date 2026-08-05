import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Admin — full audit trail, newest first. */
export async function GET() {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data } = await db()
    .from("audit_logs")
    .select("*, actor:users!audit_logs_actor_id_fkey(name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ logs: data ?? [] });
}
