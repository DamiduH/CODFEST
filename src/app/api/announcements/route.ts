import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { emitEvent } from "@/lib/socket";

export async function GET() {
  const { data } = await db()
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ announcements: data ?? [] });
}

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: announcement, error } = await db()
    .from("announcements").insert(parsed.data).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(admin.id, "announcement.posted", announcement.id, { title: announcement.title });
  emitEvent("announcement:new", { announcement });
  return NextResponse.json({ announcement }, { status: 201 });
}
