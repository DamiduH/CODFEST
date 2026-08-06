import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { generateVerifyToken, sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

/** Re-sends a verification email for an unverified account. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { data: user } = await db()
    .from("users")
    .select("id, name, email, email_verified")
    .eq("email", email)
    .maybeSingle();

  // Same response either way to avoid email enumeration.
  if (!user) {
    return NextResponse.json({ message: "If that account exists and is unverified, a new email was sent." });
  }

  if (user.email_verified) {
    return NextResponse.json({ message: "Email is already verified. You can sign in." });
  }

  const token = generateVerifyToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await db()
    .from("users")
    .update({ email_verify_token: token, email_verify_expires: expires })
    .eq("id", user.id);

  const mailError = await sendVerificationEmail(user.email, user.name, token);
  if (mailError) {
    return NextResponse.json({ error: `Failed to send email: ${mailError}` }, { status: 502 });
  }

  return NextResponse.json({ message: "Verification email sent. Check your inbox." });
}
