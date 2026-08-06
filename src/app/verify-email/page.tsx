"use client";

import Link from "next/link";

/** Link-based verify is retired — OTP is entered on /register or /login. */
export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-ember-500">// EMAIL CLEARANCE</p>
      <h1 className="section-title mt-3">OTP Verification</h1>
      <p className="mt-4 text-sm text-zinc-400">
        Captains verify with a 6-digit OTP — no password account setup. Use Register for new squads or
        OTP sign-in to return.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/register" className="btn-primary">
          Register team
        </Link>
        <Link href="/login" className="btn-ghost">
          OTP sign-in
        </Link>
      </div>
    </div>
  );
}
