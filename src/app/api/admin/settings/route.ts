import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";

/**
 * PATCH /api/admin/settings
 *
 * Saves a key/value setting into the announcements table as a special
 * "__SYSTEM_SETTINGS__" row (JSON body). No new table or migration needed.
 * Body: { key: string; value: string | boolean }
 */
export async function PATCH(req: Request) {
  const admin = await requireRole("admin");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body as { key: string; value: string | boolean };

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  // 1. Read the existing settings row (if any).
  const { data: existing, error: readErr } = await db()
    .from("announcements")
    .select("id, body")
    .eq("title", "__SYSTEM_SETTINGS__")
    .maybeSingle();

  if (readErr) {
    console.error("[admin/settings PATCH] read error:", readErr.message);
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  // 2. Merge the new key/value into the existing settings object.
  let settings: Record<string, unknown> = {};
  if (existing?.body) {
    try {
      settings = JSON.parse(existing.body);
    } catch {
      // Malformed — start fresh.
    }
  }
  settings[key] = value;
  const newBody = JSON.stringify(settings);

  // 3. Update existing row or insert a new one.
  if (existing?.id) {
    const { error: updateErr } = await db()
      .from("announcements")
      .update({ body: newBody })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("[admin/settings PATCH] update error:", updateErr.message);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  } else {
    const { error: insertErr } = await db()
      .from("announcements")
      .insert({ title: "__SYSTEM_SETTINGS__", body: newBody });

    if (insertErr) {
      console.error("[admin/settings PATCH] insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, key, value });
}
