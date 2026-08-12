import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

/**
 * GET /api/settings
 *
 * Reads system settings stored in the announcements table as a special
 * "__SYSTEM_SETTINGS__" row (JSON in the `body` field).
 * No extra migration or new table needed.
 */
export async function GET() {
  try {
    const { data } = await db()
      .from("announcements")
      .select("id, body")
      .eq("title", "__SYSTEM_SETTINGS__")
      .maybeSingle();

    // Default: live score is visible until admin explicitly hides it.
    const defaults: Record<string, unknown> = { live_score_visible: true };

    if (data?.body) {
      try {
        const parsed = JSON.parse(data.body);
        return NextResponse.json({ settings: { ...defaults, ...parsed } });
      } catch {
        // Body is malformed JSON — return defaults.
      }
    }

    return NextResponse.json({ settings: defaults });
  } catch (err: any) {
    console.error("[settings GET]", err?.message);
    return NextResponse.json({ settings: { live_score_visible: true } });
  }
}
