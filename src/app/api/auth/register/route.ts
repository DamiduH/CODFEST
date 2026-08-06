import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { generateOtp, otpExpiresAt, sendVerificationOtp } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

/** Creates a captain account and emails a 6-digit OTP. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { data: existing, error: lookupError } = await db()
      .from("users")
      .select("id, email_verified")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        {
          error: lookupError.message.includes("email_verified")
            ? "Database is missing email verification columns. Run supabase/migration-email-verification.sql in the Supabase SQL editor."
            : lookupError.message,
        },
        { status: 500 }
      );
    }

    if (existing?.email_verified) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const otp = generateOtp();
    const expires = otpExpiresAt();
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    // Unverified account already exists → refresh OTP instead of creating a duplicate.
    if (existing && !existing.email_verified) {
      await db()
        .from("users")
        .update({
          name: parsed.data.name,
          password_hash: passwordHash,
          email_verify_token: otp,
          email_verify_expires: expires,
        })
        .eq("id", existing.id);

      const { data: user } = await db()
        .from("users")
        .select("id, name, email")
        .eq("id", existing.id)
        .single();

      let mailError: string | null = null;
      try {
        mailError = await sendVerificationOtp(email, parsed.data.name, otp);
      } catch (e) {
        mailError = e instanceof Error ? e.message : "Email send failed";
      }

      return NextResponse.json(
        {
          message: mailError
            ? `Account found. OTP email failed: ${mailError}`
            : "OTP sent to your email. Enter the code to continue.",
          needsVerification: true,
          error: mailError ?? undefined,
          user: user ? { id: user.id, email: user.email } : { email },
        },
        { status: mailError ? 201 : 200 }
      );
    }

    const { data: user, error } = await db()
      .from("users")
      .insert({
        name: parsed.data.name,
        email,
        password_hash: passwordHash,
        role: "team_captain",
        email_verified: false,
        email_verify_token: otp,
        email_verify_expires: expires,
      })
      .select("id, name, email, role")
      .single();

    if (error) {
      const hint = error.message.includes("row-level security")
        ? " SUPABASE_SERVICE_ROLE_KEY is missing or wrong in Vercel/.env.local (publishable key cannot insert)."
        : error.message.includes("email_verified") || error.message.includes("email_verify")
          ? " Run supabase/migration-email-verification.sql in the Supabase SQL editor."
          : "";
      return NextResponse.json({ error: `${error.message}${hint}` }, { status: 500 });
    }

    let mailError: string | null = null;
    try {
      mailError = await sendVerificationOtp(email, user.name, otp);
    } catch (e) {
      mailError = e instanceof Error ? e.message : "Email send failed";
    }

    if (mailError) {
      return NextResponse.json(
        {
          error: `Account created but OTP email failed: ${mailError}`,
          needsVerification: true,
          user: { id: user.id, email: user.email },
        },
        { status: 201 }
      );
    }

    await logAudit(user.id, "user.registered", user.id, { email });
    return NextResponse.json(
      {
        message: "Account created. Enter the OTP sent to your email.",
        needsVerification: true,
        user: { id: user.id, email: user.email },
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed";
    console.error("[auth/register]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
