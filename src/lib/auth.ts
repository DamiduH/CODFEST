import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/supabase";
import { isOtpTestMode, TEST_OTP } from "@/lib/email";
import type { Role } from "@/lib/types";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email.toLowerCase().trim();

        // Captains / operators: OTP sign-in (no password account setup).
        if (credentials.otp) {
          const otp = credentials.otp.trim();
          const { data: user } = await db()
            .from("users")
            .select("id, name, email, role, email_verified, email_verify_token, email_verify_expires")
            .eq("email", email)
            .maybeSingle();
          if (!user) return null;

          const testBypass = isOtpTestMode() && otp === TEST_OTP;
          if (!testBypass) {
            if (user.email_verify_expires && new Date(user.email_verify_expires).getTime() < Date.now()) {
              throw new Error("OTP_EXPIRED");
            }
            if (!user.email_verify_token || user.email_verify_token !== otp) {
              throw new Error("INVALID_OTP");
            }
          }

          if (!user.email_verified || user.email_verify_token) {
            await db()
              .from("users")
              .update({
                email_verified: true,
                email_verify_token: null,
                email_verify_expires: null,
              })
              .eq("id", user.id);
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        }

        // Password login — admin only (captains use OTP).
        if (!credentials.password) return null;
        const { data: user } = await db()
          .from("users")
          .select("id, name, email, password_hash, role, email_verified")
          .eq("email", email)
          .maybeSingle();
        if (!user) return null;
        if (user.role !== "admin") {
          throw new Error("USE_OTP");
        }
        const ok = await bcrypt.compare(credentials.password, user.password_hash);
        if (!ok) return null;
        if (!user.email_verified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Returns the session user or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

/**
 * Guard for mutating routes. Returns the user if they hold one of the
 * allowed roles; otherwise null (caller responds 401/403).
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser | null> {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}
