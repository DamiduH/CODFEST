import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { generateVerifyToken, sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

/** Creates a captain account and emails a verification link. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { data: existing } = await db().from("users").select("id, email_verified").eq("email", email).maybeSingle();
  if (existing?.email_verified) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }
  if (existing && !existing.email_verified) {
    return NextResponse.json(
      { error: "Account already created but not verified. Check your inbox or resend the verification email.", needsVerification: true },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const token = generateVerifyToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: user, error } = await db()
    .from("users")
    .insert({
      name: parsed.data.name,
      email,
      password_hash: passwordHash,
      role: "team_captain",
      email_verified: false,
      email_verify_token: token,
      email_verify_expires: expires,
    })
    .select("id, name, email, role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mailError = await sendVerificationEmail(email, user.name, token);
  if (mailError) {
    // Keep the account so they can resend; surface the mail failure clearly.
    return NextResponse.json(
      {
        error: `Account created but verification email failed: ${mailError}`,
        needsVerification: true,
        user: { id: user.id, email: user.email },
      },
      { status: 201 }
    );
  }

  await logAudit(user.id, "user.registered", user.id, { email });
  return NextResponse.json(
    {
      message: "Account created. Check your email to verify before signing in.",
      needsVerification: true,
      user: { id: user.id, email: user.email },
    },
    { status: 201 }
  );
}
