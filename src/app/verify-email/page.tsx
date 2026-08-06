"use client";

import Link from "next/link";

/** Old link-based verify route — OTP is entered on /register or /login. */
export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-ember-500">// EMAIL CLEARANCE</p>
      <h1 className="section-title mt-3">OTP Verification</h1>
      <p className="mt-4 text-sm text-zinc-400">
        Email verification now uses a 6-digit OTP sent to your inbox. Enter it on the register or login page.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/register" className="btn-primary">
          Register
        </Link>
        <Link href="/login" className="btn-ghost">
          Login
        </Link>
      </div>
    </div>
  );
}
