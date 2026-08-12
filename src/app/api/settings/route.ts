import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

/** GET /api/settings
 *  Returns global site settings. Public endpoint — no auth required.
 *  Falls back to safe defaults if the site_settings table doesn't exist yet.
 */
export async function GET() {
  const { data, error } = await db()
    .from("site_settings")
    .select("key, value");

  if (error) {
    // Table probably doesn't exist yet (migration not run).
    // Log it and return safe defaults so the UI doesn't break.
    console.error("[settings] site_settings table error:", error.message);
    return NextResponse.json({
      settings: { live_score_visible: true },
      _warning: "site_settings table missing — run the migration SQL",
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

  // If table exists but has no row yet, seed the default.
  if (!("live_score_visible" in settings)) {
    settings.live_score_visible = true;
  }

  return NextResponse.json({ settings });
}
