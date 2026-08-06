"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error ?? "Verification failed");
        return;
      }
      setStatus("ok");
      setMessage(json.message ?? "Email verified");
      setTimeout(() => router.push("/login"), 2500);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-ember-500">
        // EMAIL CLEARANCE
      </p>
      <h1 className="section-title mt-3">
        {status === "loading" ? "Verifying…" : status === "ok" ? "Verified" : "Verification Failed"}
      </h1>
      <p className={`mt-4 font-mono text-sm ${status === "error" ? "text-red-300" : "text-zinc-400"}`}>
        {message}
      </p>
      {status === "ok" && (
        <p className="mt-2 text-sm text-zinc-500">Redirecting to login…</p>
      )}
      {status === "error" && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/login" className="btn-primary">
            Back to login
          </Link>
          <Link href="/register" className="btn-ghost">
            Register again
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-zinc-500">Loading…</p>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
