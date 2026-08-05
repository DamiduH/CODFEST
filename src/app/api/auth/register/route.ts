import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

/** Creates a captain account. Team registration is a separate step. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { data: existing } = await db().from("users").select("id").eq("email", email).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const { data: user, error } = await db()
    .from("users")
    .insert({ name: parsed.data.name, email, password_hash: passwordHash, role: "team_captain" })
    .select("id, name, email, role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "user.registered", user.id, { email });
  return NextResponse.json({ user }, { status: 201 });
}
