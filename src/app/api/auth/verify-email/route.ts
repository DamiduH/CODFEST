import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

/** Confirms an email with the 6-digit OTP from the verification email. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email and 6-digit OTP" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const otp = parsed.data.otp.trim();

    const { data: user } = await db()
      .from("users")
      .select("id, email, email_verified, email_verify_token, email_verify_expires")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "Invalid email or OTP" }, { status: 400 });
    }

    if (user.email_verified) {
      return NextResponse.json({ ok: true, message: "Email already verified" });
    }

    if (user.email_verify_expires && new Date(user.email_verify_expires).getTime() < Date.now()) {
      return NextResponse.json({ error: "OTP expired. Request a new code." }, { status: 410 });
    }

    if (!user.email_verify_token || user.email_verify_token !== otp) {
      return NextResponse.json({ error: "Invalid OTP. Check the code and try again." }, { status: 400 });
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
    return NextResponse.json({ ok: true, message: "Email verified. You can continue." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    console.error("[auth/verify-email]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
