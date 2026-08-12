import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

/** GET /api/settings
 *  Returns global site settings. Public endpoint — no auth required.
 */
export async function GET() {
  const { data, error } = await db()
    .from("site_settings")
    .select("key, value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert rows into a plain object: { live_score_visible: true, ... }
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    // Coerce "true"/"false" strings to booleans.
    if (row.value === "true") settings[row.key] = true;
    else if (row.value === "false") settings[row.key] = false;
    else settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}
