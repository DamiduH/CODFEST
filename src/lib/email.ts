import { Resend } from "resend";
import crypto from "crypto";

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

export function generateVerifyToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function verifyLink(token: string): string {
  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/verify-email?token=${token}`;
}

/** Sends the email verification link. Returns Resend error message or null on success. */
export async function sendVerificationEmail(to: string, name: string, token: string): Promise<string | null> {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const link = verifyLink(token);

  const { error } = await resendClient().emails.send({
    from,
    to,
    subject: "CODFEST — Verify your email",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#d4e0d4;padding:32px;border:1px solid #2a3a2a">
        <p style="color:#71e000;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 12px">CODFEST // ACCESS CLEARANCE</p>
        <h1 style="color:#8cfd30;font-size:22px;margin:0 0 16px">Verify your operator email</h1>
        <p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 20px">Confirm this email to activate your captain account and continue squad registration.</p>
        <a href="${link}" style="display:inline-block;background:#71e000;color:#0a0f0a;font-weight:700;text-decoration:none;padding:12px 20px;letter-spacing:0.08em;text-transform:uppercase">
          Verify Email
        </a>
        <p style="margin:24px 0 8px;font-size:12px;color:#8a9a8a">This link expires in 24 hours. If you did not create a CODFEST account, ignore this message.</p>
        <p style="margin:0;font-size:11px;color:#6a7a6a;word-break:break-all">${link}</p>
      </div>
    `,
  });

  return error?.message ?? null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
