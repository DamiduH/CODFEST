import { Resend } from "resend";
import crypto from "crypto";

/** Fixed OTP used when OTP_TEST_MODE / NEXT_PUBLIC_OTP_TEST_MODE is enabled. */
export const TEST_OTP = "000000";

export function isOtpTestMode(): boolean {
  const flag = process.env.OTP_TEST_MODE ?? process.env.NEXT_PUBLIC_OTP_TEST_MODE;
  return flag === "true" || flag === "1";
}

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

/** 6-digit numeric OTP (always 000000 in test/checking mode). */
export function generateOtp(): string {
  if (isOtpTestMode()) return TEST_OTP;
  return String(crypto.randomInt(100000, 1000000));
}

/** OTP valid for 15 minutes. */
export function otpExpiresAt(): string {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

/**
 * Sends the email OTP.
 * In test/checking mode, skips Resend and returns success (use OTP 000000).
 */
export async function sendVerificationOtp(to: string, name: string, otp: string): Promise<string | null> {
  if (isOtpTestMode()) {
    console.info(`[OTP_TEST_MODE] Skipping email to ${to} (${name}). Use OTP: ${TEST_OTP}`);
    return null;
  }

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const { error } = await resendClient().emails.send({
    from,
    to,
    subject: "CODFEST — Your verification code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#d4e0d4;padding:32px;border:1px solid #2a3a2a">
        <p style="color:#71e000;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 12px">CODFEST // ACCESS CLEARANCE</p>
        <h1 style="color:#8cfd30;font-size:22px;margin:0 0 16px">Your verification code</h1>
        <p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 20px">Enter this code on the registration page to activate your captain account:</p>
        <p style="margin:0 0 24px;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#8cfd30;font-family:Consolas,monospace">${otp}</p>
        <p style="margin:0;font-size:12px;color:#8a9a8a">This code expires in 15 minutes. If you did not create a CODFEST account, ignore this message.</p>
      </div>
    `,
  });

  return error?.message ?? null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
