import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

/** GET /api/settings
 *  Returns global site settings. Public endpoint — no auth required.
 *
 *  FAIL-CLOSED: if the table doesn't exist or the DB errors,
 *  we return live_score_visible: FALSE so the page stays hidden.
 *  This ensures the admin's OFF setting is never accidentally overridden.
 */
export async function GET() {
  const { data, error } = await db()
    .from("site_settings")
    .select("key, value");

  if (error) {
    // Table probably doesn't exist yet (migration not run).
    // Fail CLOSED: hide the live score rather than accidentally showing it.
    console.error("[settings] site_settings table error:", error.message);
    return NextResponse.json({
      settings: { live_score_visible: false },
      _warning: "site_settings table missing — run the migration SQL in Supabase",
    });
  }

  // Convert rows into a plain object: { live_score_visible: true, ... }
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    // Coerce "true"/"false" strings to booleans.
    if (row.value === "true") settings[row.key] = true;
    else if (row.value === "false") settings[row.key] = false;
    else settings[row.key] = row.value;
  }

  // If the table exists but has no row yet, default to TRUE (visible).
  // Once the admin explicitly sets it to false, that value is persisted.
  if (!("live_score_visible" in settings)) {
    settings.live_score_visible = true;
  }

  return NextResponse.json({ settings });
}
