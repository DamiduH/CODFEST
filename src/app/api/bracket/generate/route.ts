import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { generateBracket } from "@/lib/bracket";
import { logAudit } from "@/lib/audit";

/** Admin — wipes fixtures and seeds a fresh single-elimination bracket from approved teams. */
export async function POST() {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const bracket = await generateBracket();
    await logAudit(admin.id, "bracket.generated", null, { matches: bracket.length });
    return NextResponse.json({ bracket }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
