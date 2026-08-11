"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface MemberRow {
  member_name: string;
  email: string;
  phone: string;
  im_number: string;
}

const emptyMember = (): MemberRow => ({ member_name: "", email: "", phone: "", im_number: "" });

function memberFromPlayer(p: any): MemberRow {
  return {
    member_name: p.player_name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    im_number: p.im_number ?? "",
  };
}

/** Progress bar for the two-step flow. */
function StepBar({ step }: { step: 1 | 2 }) {
  const steps = ["[01] VERIFY EMAIL", "[02] REGISTER SQUAD"];
  return (
    <div className="mt-6 flex gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex-1">
          <p className={`font-mono text-xs ${i < step ? "text-ember-400" : "text-zinc-400"}`}>
            {label}
          </p>
          <div
            className={`mt-1 h-2 w-full ${
              i < step ? "bg-ember-400 shadow-glowSm" : "border border-night-700 bg-night-800"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Step 1 sub-states ────────────────────────────────────────────────────────
// "email"     → only the email field is shown (initial landing)
// "new"       → new user: show name + IM number + email (pre-filled, locked)
// "returning" → returning leader with no team: show OTP-request button only
// "otp"       → OTP entry form
type Step1State = "email" | "new" | "returning" | "otp";

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Step 1 state ──
  const [step1, setStep1] = useState<Step1State>("email");
  const [emailInput, setEmailInput] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  // Full details (name + IM) — only needed for new users
  const [leaderName, setLeaderName] = useState("");
  const [leaderIm, setLeaderIm] = useState("");
  // OTP
  const [pendingVerify, setPendingVerify] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  // ── Step 2 state ──
  const [teamName, setTeamName] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([emptyMember()]);
  const [agreed, setAgreed] = useState(false);

  // Edit mode — captain already has a team
  const [editMode, setEditMode] = useState(false);
  const [existingTeamId, setExistingTeamId] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Prevent flash: wait until we've checked the team before rendering Step 2
  const [sessionChecked, setSessionChecked] = useState(false);

  /* ─── On every page load: verify the session still has a team ─── */
  useEffect(() => {
    if (status === "loading") return; // wait for NextAuth
    if (!session) {
      setSessionChecked(true);
      return;
    }

    // Session exists — check whether this captain already submitted a team.
    fetch("/api/teams/my")
      .then((r) => r.json())
      .then(async (json) => {
        if (json.team) {
          // ✅ Team exists → stay logged in, load edit form
          setExistingTeamId(json.team.id);
          setTeamName(json.team.team_name ?? "");
          setCaptainPhone(json.team.phone ?? "");
          if (json.players?.length) {
            setMembers(json.players.map(memberFromPlayer));
          }
          setEditMode(true);
          setSessionChecked(true);
        } else {
          // ❌ No team yet — sign out and ask for OTP re-verification.
          // Pre-fill email so the leader only needs OTP (no name/IM again).
          const email = session.user?.email ?? "";
          await signOut({ redirect: false });
          if (email) {
            setEmailInput(email);
            setStep1("returning");
          }
          setSessionChecked(true);
        }
      })
      .catch(() => setSessionChecked(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);  // run once per page load (status goes loading → authenticated/unauthenticated)

  /* ─── Step 1a: check email → branch to new / returning ─── */
  async function checkEmail(e: React.FormEvent) {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setCheckingEmail(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const json = await res.json();

      if (!json.exists) {
        // Brand new — ask for name + IM number
        setStep1("new");
      } else if (json.hasTeam) {
        // Has a team already — they should just log in via email to edit
        setStep1("returning");
      } else {
        // Verified captain, no team yet — skip name/IM, just send OTP
        setStep1("returning");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setCheckingEmail(false);
    }
  }

  /* ─── Step 1b: send OTP (new user with name + IM) ─── */
  async function startOtpNew(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: leaderName, email: emailInput.trim() }),
      });
      const text = await res.text();
      let json: { error?: string; needsVerification?: boolean; message?: string } = {};
      try { json = text ? JSON.parse(text) : {}; } catch { /* ignore */ }

      if (!res.ok && !json.needsVerification) {
        setError(json.error ?? "Could not start registration");
        return;
      }
      if (json.message) setInfo(json.message);
      setPendingVerify(emailInput.trim().toLowerCase());
      setOtp(process.env.NEXT_PUBLIC_OTP_TEST_MODE === "true" ? "000000" : "");
      setStep1("otp");
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Step 1b: send OTP (returning leader — email only) ─── */
  async function startOtpReturning(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      // We pass a dummy name so the schema validates — the server ignores it for verified users
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "leader", email: emailInput.trim() }),
      });
      const text = await res.text();
      let json: { error?: string; needsVerification?: boolean; message?: string; returning?: boolean } = {};
      try { json = text ? JSON.parse(text) : {}; } catch { /* ignore */ }

      if (!res.ok && !json.needsVerification) {
        setError(json.error ?? "Could not send OTP");
        return;
      }
      if (json.message) setInfo(json.message);
      setPendingVerify(emailInput.trim().toLowerCase());
      setOtp(process.env.NEXT_PUBLIC_OTP_TEST_MODE === "true" ? "000000" : "");
      setStep1("otp");
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Step 1: verify OTP ─── */
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingVerify) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const signed = await signIn("credentials", {
        email: pendingVerify,
        otp,
        redirect: false,
      });
      if (signed?.error) {
        const map: Record<string, string> = {
          OTP_EXPIRED: "OTP expired. Request a new code.",
          INVALID_OTP: "Invalid OTP. Check the code and try again.",
        };
        setError(map[signed.error] ?? "Invalid OTP");
        return;
      }
      // Clear leader identity — never persisted across refreshes
      setEmailInput("");
      setLeaderName("");
      setLeaderIm("");
      setPendingVerify(null);
      router.refresh();
    } catch {
      setError("Could not verify OTP");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Step 1: resend OTP ─── */
  async function resendVerification() {
    if (!pendingVerify) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerify }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Could not resend OTP");
      else setInfo(json.message ?? "New OTP sent");
    } catch {
      setError("Could not resend OTP");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Step 2: register team ─── */
  async function registerTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) return setError("You must accept the rules and code of conduct");
    if (members.some((m) => !m.member_name)) return setError("Every player needs a name");
    setBusy(true);

    const payload = {
      team_name: teamName,
      phone: captainPhone,
      email: session?.user?.email ?? "",
      agreed: true,
      players: members.map((m) => ({
        player_name: m.member_name,
        email: m.email,
        phone: m.phone,
        im_number: m.im_number,
        game_id: "",
        is_substitute: false,
      })),
    };

    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    if (logo) form.set("logo", logo);

    const res = await fetch("/api/teams/register", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Team registration failed");
    setDone(true);
  }

  /* ─── Edit mode: save changes ─── */
  async function saveTeamEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!existingTeamId) return;
    setError(null);
    if (members.some((m) => !m.member_name)) return setError("Every player needs a name");
    setBusy(true);

    const body = {
      team_name: teamName,
      phone: captainPhone,
      players: members.map((m) => ({
        player_name: m.member_name,
        email: m.email,
        phone: m.phone,
        im_number: m.im_number,
        game_id: "",
        is_substitute: false,
      })),
    };

    const res = await fetch(`/api/teams/${existingTeamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not save changes");
    setEditSuccess(true);
    setError(null);
  }

  /* ───────────────── RENDER ───────────────────────────────────────────────── */

  if (status === "loading" || !sessionChecked) {
    return <p className="mt-20 text-center text-zinc-500">Loading…</p>;
  }

  /* ─── Success screen (new registration) ─── */
  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="font-mono text-sm tracking-[0.1em] text-ember-400">// TRANSMISSION RECEIVED</p>
        <h1 className="section-title mt-3">Registration Submitted</h1>
        <p className="mt-3 text-zinc-400">
          Your squad is{" "}
          <strong className="text-amber-300">pending admin approval</strong>. Once approved, your
          team will appear on the Verified Squads page.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          You will be contacted via the email / phone you provided.
        </p>
      </div>
    );
  }

  /* ─── OTP verification screen ─── */
  if (step1 === "otp" && pendingVerify) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Verify Email</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // OTP_CLEARANCE
          </p>
        </div>
        <StepBar step={1} />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Enter the 6-digit code sent to{" "}
          <strong className="text-ember-400">{pendingVerify}</strong>
        </p>
        {process.env.NEXT_PUBLIC_OTP_TEST_MODE === "true" && (
          <p className="mt-2 text-center font-mono text-xs text-amber-300">
            TEST MODE — use OTP <strong>000000</strong>
          </p>
        )}
        <form onSubmit={verifyOtp} className="card mt-8 space-y-4 p-6">
          {error && (
            <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
              {error}
            </p>
          )}
          {info && (
            <p className="border border-ember-600/40 bg-ember-600/10 px-3 py-2 font-mono text-xs text-ember-400">
              {info}
            </p>
          )}
          <div>
            <label className="label">One-time password (OTP)</label>
            <input
              className="input text-center font-mono text-2xl tracking-[0.4em]"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="••••••"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <button className="btn-primary w-full" disabled={busy || otp.length !== 6}>
            {busy ? "Verifying…" : "Verify & Continue →"}
          </button>
          <button type="button" className="btn-ghost w-full" disabled={busy} onClick={resendVerification}>
            {busy ? "Sending…" : "Resend OTP"}
          </button>
          <button
            type="button"
            className="w-full text-center font-mono text-[11px] text-zinc-600 hover:text-zinc-400"
            onClick={() => { setStep1("email"); setError(null); setInfo(null); setPendingVerify(null); }}
          >
            ← Use a different email
          </button>
        </form>
      </div>
    );
  }

  /* ─── Step 1: email-only landing (initial check) ─── */
  if (!session && step1 === "email") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Squad Registration</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // TEAM LEADER — EMAIL VERIFICATION
          </p>
        </div>
        <StepBar step={1} />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Only the <strong className="text-zinc-300">team leader</strong> registers.
          Enter your email to get started.
        </p>
        <form onSubmit={checkEmail} className="card mt-8 space-y-4 p-6">
          {error && (
            <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
              {error}
            </p>
          )}
          <div>
            <label className="label">Leader&apos;s email</label>
            <input
              className="input"
              placeholder="LEADER@DOMAIN"
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" disabled={checkingEmail}>
            {checkingEmail ? "Checking…" : "Continue →"}
          </button>
        </form>
      </div>
    );
  }

  /* ─── Step 1: new user — collect name + IM number ─── */
  if (!session && step1 === "new") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Squad Registration</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // NEW TEAM LEADER
          </p>
        </div>
        <StepBar step={1} />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Fill in your details — we&apos;ll send a one-time code to verify your email.
        </p>
        <form onSubmit={startOtpNew} className="card mt-8 space-y-4 p-6">
          {error && (
            <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
              {error}
            </p>
          )}
          {/* Email locked — already entered */}
          <div>
            <label className="label">Leader&apos;s email</label>
            <input
              className="input opacity-60 cursor-not-allowed"
              type="email"
              value={emailInput}
              readOnly
            />
          </div>
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              placeholder="FULL_NAME"
              required
              minLength={2}
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">IM Number</label>
            <input
              className="input"
              placeholder="IM_NUMBER"
              required
              value={leaderIm}
              onChange={(e) => setLeaderIm(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Sending OTP…" : "Send OTP →"}
          </button>
          <button
            type="button"
            className="w-full text-center font-mono text-[11px] text-zinc-600 hover:text-zinc-400"
            onClick={() => { setStep1("email"); setError(null); }}
          >
            ← Change email
          </button>
        </form>
      </div>
    );
  }

  /* ─── Step 1: returning leader — OTP re-login ─── */
  if (!session && step1 === "returning") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="border-l-4 border-l-ember-400 pl-4">
          <h1 className="section-title">Welcome Back</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
            // RETURNING LEADER — OTP RE-LOGIN
          </p>
        </div>
        <StepBar step={1} />

        <div className="mt-4 border border-ember-400/30 bg-ember-600/10 px-4 py-3 font-mono text-xs text-ember-300">
          ✓ Your account was found for{" "}
          <strong className="text-ember-400">{emailInput}</strong>.
          Click below to receive a sign-in code and continue your registration.
        </div>

        <form onSubmit={startOtpReturning} className="card mt-6 space-y-4 p-6">
          {error && (
            <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
              {error}
            </p>
          )}
          {info && (
            <p className="border border-ember-600/40 bg-ember-600/10 px-3 py-2 font-mono text-xs text-ember-400">
              {info}
            </p>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Sending OTP…" : "Send OTP to my email →"}
          </button>
          <button
            type="button"
            className="w-full text-center font-mono text-[11px] text-zinc-600 hover:text-zinc-400"
            onClick={() => { setStep1("email"); setError(null); setInfo(null); }}
          >
            ← Use a different email
          </button>
        </form>
      </div>
    );
  }

  /* ─── Shared team form (register OR edit) ─── */
  const isEdit = editMode && !!existingTeamId;
  const formTitle = isEdit ? "Edit Your Team" : "Team Registration";
  const formSubtitle = isEdit ? "// UPDATE SQUAD DETAILS" : "// SQUAD DETAILS";
  const submitLabel = isEdit ? "Save Changes" : "Submit Team Registration";
  const onSubmit = isEdit ? saveTeamEdit : registerTeam;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="border-l-4 border-l-ember-400 pl-4">
        <h1 className="section-title">{formTitle}</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
          {formSubtitle}
        </p>
      </div>
      {!isEdit && <StepBar step={2} />}

      {/* Edit success banner */}
      {editSuccess && (
        <div className="mt-4 border border-green-500/40 bg-green-500/10 px-4 py-3 font-mono text-xs text-green-300">
          ✓ Changes saved successfully.
        </div>
      )}

      {isEdit && !editSuccess && (
        <div className="mt-4 border border-ember-400/30 bg-ember-600/10 px-4 py-3 font-mono text-xs text-ember-300">
          ✏ You&apos;re editing your existing team. Changes take effect immediately.
        </div>
      )}

      {!isEdit && (
        <ul className="card mt-4 list-inside list-disc p-4 text-sm text-zinc-400">
          <li>Only the team leader submits this form.</li>
          <li>Team name must be unique (max 30 characters).</li>
          <li>Add all team members — name, email, mobile, and IM Number required.</li>
          <li>Real names only.</li>
        </ul>
      )}

      <form onSubmit={onSubmit} className="card mt-6 space-y-6 p-6">
        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}

        {/* ── Team basics ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Team name</label>
            <input
              className="input"
              required
              maxLength={30}
              placeholder="SQUAD_NAME"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Leader&apos;s mobile number</label>
            <input
              className="input"
              required
              placeholder="+94 XXX XXX XXXX"
              value={captainPhone}
              onChange={(e) => setCaptainPhone(e.target.value)}
            />
          </div>
          {!isEdit && (
            <div className="sm:col-span-2">
              <label className="label">Team logo (optional, max 4 MB)</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>

        {/* ── Members ── */}
        <div>
          <div className="flex items-center justify-between">
            <label className="label !mb-0">
              Team members{" "}
              <span className="text-zinc-500">(up to 5, not including you)</span>
            </label>
            {members.length < 5 && (
              <button
                type="button"
                className="text-sm font-semibold text-ember-400 hover:text-ember-500"
                onClick={() => setMembers([...members, emptyMember()])}
              >
                + Add member
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {members.map((m, i) => (
              <div
                key={i}
                className="relative rounded border border-night-700 bg-night-900 p-3"
              >
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Member {i + 1}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="label text-[11px]">Full name</label>
                    <input
                      className="input"
                      placeholder="Real name"
                      required
                      value={m.member_name}
                      onChange={(e) =>
                        setMembers(members.map((x, j) => (j === i ? { ...x, member_name: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Email address</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="member@domain"
                      value={m.email}
                      onChange={(e) =>
                        setMembers(members.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Mobile number</label>
                    <input
                      className="input"
                      placeholder="+94 XXX XXX XXXX"
                      required
                      value={m.phone}
                      onChange={(e) =>
                        setMembers(members.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">IM Number</label>
                    <input
                      className="input"
                      placeholder="IM_NUMBER"
                      required
                      value={m.im_number}
                      onChange={(e) =>
                        setMembers(members.map((x, j) => (j === i ? { ...x, im_number: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
                {members.length > 1 && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 font-mono text-xs text-zinc-600 hover:text-red-400"
                    onClick={() => setMembers(members.filter((_, j) => j !== i))}
                    aria-label="Remove member"
                  >
                    ✕ remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Agreement (new registration only) ── */}
        {!isEdit && (
          <label className="flex items-start gap-3 text-sm text-zinc-400">
            <input
              type="checkbox"
              className="mt-1"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              We have read and agree to the tournament rules and code of conduct.
            </span>
          </label>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? (isEdit ? "Saving…" : "Submitting…") : submitLabel}
        </button>
      </form>
    </div>
  );
}
