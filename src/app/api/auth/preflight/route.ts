import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Password-gated status check used by the login page so we can show a
 * clear "verify your email" message (NextAuth collapses authorize errors).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { data: user } = await db()
    .from("users")
    .select("password_hash, email_verified")
    .eq("email", email)
    .maybeSingle();

  if (!user) return NextResponse.json({ ok: false, reason: "invalid" });

  const match = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!match) return NextResponse.json({ ok: false, reason: "invalid" });

  if (!user.email_verified) {
    return NextResponse.json({ ok: false, reason: "unverified" });
  }

  return NextResponse.json({ ok: true, reason: "ok" });
}
