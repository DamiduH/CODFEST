import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { generateOtp, otpExpiresAt, sendVerificationOtp } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

/** Re-sends a verification OTP for an unverified account. */
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
      .select("id, name, email, email_verified")
      .eq("email", email)
      .maybeSingle();

    // Same response either way to avoid email enumeration.
    if (!user) {
      return NextResponse.json({ message: "If that account exists and is unverified, a new OTP was sent." });
    }

    if (user.email_verified) {
      return NextResponse.json({ message: "Email is already verified. You can sign in." });
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

    return NextResponse.json({ message: "New OTP sent. Check your inbox." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resend failed";
    console.error("[auth/resend-verification]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
