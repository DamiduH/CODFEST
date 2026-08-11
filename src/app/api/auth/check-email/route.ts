import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/check-email?email=...
 * Returns whether an email is already registered as a team captain and
 * whether that captain already has a team submitted.
 * Used by the register page to decide which form variant to show.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").toLowerCase().trim();
  if (!email) return NextResponse.json({ exists: false, hasTeam: false });

  const { data: user } = await db()
    .from("users")
    .select("id, email_verified, role")
    .eq("email", email)
    .maybeSingle();

  if (!user) return NextResponse.json({ exists: false, hasTeam: false });

  // Check if this captain already has a team registered
  const { data: team } = await db()
    .from("teams")
    .select("id")
    .eq("captain_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    exists: true,
    verified: !!user.email_verified,
    hasTeam: !!team,
  });
}
