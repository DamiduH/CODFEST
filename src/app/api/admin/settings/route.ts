import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";

/** PATCH /api/admin/settings
 *  Allows admins to toggle site-wide settings.
 *  Body: { key: string; value: string | boolean }
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

  const stringValue = String(value);

  const { error } = await db()
    .from("site_settings")
    .upsert({ key, value: stringValue }, { onConflict: "key" });

  if (error) {
    console.error("[admin/settings] upsert error:", error.message);
    // Return a descriptive error so the admin toggle shows it
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "site_settings table not found — please run the migration SQL in Supabase first."
          : error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, key, value: stringValue });
}
