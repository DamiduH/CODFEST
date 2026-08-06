/**
 * Creates (or promotes) an admin account.
 * Usage: node scripts/seed-admin.js admin@codfest.gg "StrongPassword123" "Admin Name"
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const [email, password, name = "Admin"] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/seed-admin.js <kiboxonleena2004@gmail.com> <20040620Kiyu@> ["Kiboxson"]');
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const password_hash = bcrypt.hashSync(password, 10);
  const { data: existing } = await db.from("users").select("id").eq("email", email).maybeSingle();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required (publishable key cannot bypass RLS).");
    process.exit(1);
  }

  const { error } = existing
    ? await db.from("users").update({ role: "admin", password_hash, email_verified: true }).eq("id", existing.id)
    : await db.from("users").insert({ name, email, password_hash, role: "admin", email_verified: true });

  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
  console.log(`Admin ready: ${email}`);
})();
