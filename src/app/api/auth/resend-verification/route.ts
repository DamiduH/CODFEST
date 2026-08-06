import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { generateOtp, otpExpiresAt, sendVerificationOtp } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

/**
 * Sends an OTP for registration verify or passwordless captain sign-in.
 * Works for both unverified and verified captain accounts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { data: user } = await db()
      .from("users")
      .select("id, name, email, email_verified, role")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ message: "If that email is registered, a new OTP was sent." });
    }

    // Admins use password login — don't OTP them unless test/checking.
    if (user.role === "admin") {
      return NextResponse.json({
        message: "Admin accounts sign in with password on the admin login form.",
        admin: true,
      });
    }

    const otp = generateOtp();
    const expires = otpExpiresAt();

    await db()
      .from("users")
      .update({ email_verify_token: otp, email_verify_expires: expires })
      .eq("id", user.id);

    let mailError: string | null = null;
    try {
      mailError = await sendVerificationOtp(user.email, user.name, otp);
    } catch (e) {
      mailError = e instanceof Error ? e.message : "Email send failed";
    }
    if (mailError) {
      return NextResponse.json({ error: `Failed to send OTP: ${mailError}` }, { status: 502 });
    }

    return NextResponse.json({
      message: user.email_verified
        ? "OTP sent. Enter the code to sign in."
        : "New OTP sent. Check your inbox.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resend failed";
    console.error("[auth/resend-verification]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
