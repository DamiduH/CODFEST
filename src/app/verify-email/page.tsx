import { redirect } from "next/navigation";

/** Retired — OTP verification is now inline on /register. */
export default function VerifyEmailPage() {
  redirect("/register");
}
