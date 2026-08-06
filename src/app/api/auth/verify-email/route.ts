import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Confirms an email via the token from the verification link. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
  }

  const { data: user } = await db()
    .from("users")
    .select("id, email, email_verified, email_verify_expires")
    .eq("email_verify_token", token)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "Invalid or already used verification link" }, { status: 400 });
  }

  if (user.email_verified) {
    return NextResponse.json({ ok: true, message: "Email already verified" });
  }

  if (user.email_verify_expires && new Date(user.email_verify_expires).getTime() < Date.now()) {
    return NextResponse.json({ error: "Verification link expired. Request a new one from the login page." }, { status: 410 });
  }

  const { error } = await db()
    .from("users")
    .update({
      email_verified: true,
      email_verify_token: null,
      email_verify_expires: null,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "user.email_verified", user.id, { email: user.email });
  return NextResponse.json({ ok: true, message: "Email verified. You can sign in now." });
}
