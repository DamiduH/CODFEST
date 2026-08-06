import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Detects when someone pasted the publishable/anon key into
 * SUPABASE_SERVICE_ROLE_KEY — that key is subject to RLS and will fail inserts.
 */
function assertServiceRoleKey(key: string) {
  if (key.startsWith("sb_publishable_") || key.startsWith("sb_anon_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is set to the publishable/anon key. " +
        "Use the service_role secret from Supabase → Project Settings → API instead."
    );
  }

  // Legacy JWT keys: payload must claim role=service_role
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      const payload = JSON.parse(json) as { role?: string };
      if (payload.role && payload.role !== "service_role") {
        throw new Error(
          `SUPABASE_SERVICE_ROLE_KEY has role "${payload.role}", expected "service_role". ` +
            "Copy the service_role key (secret) from the Supabase API settings."
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("service_role")) throw e;
    }
  }
}

/**
 * Server-side Supabase client.
 * MUST use the service role key — RLS is enabled with no public policies,
 * so the publishable/anon key cannot insert/select anything.
 * Never import this from client components.
 */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    }
    if (!serviceKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing. " +
          "Copy it from Supabase Dashboard → Project Settings → API → service_role (secret), " +
          "then add it to .env.local and Vercel env vars. The publishable key cannot bypass RLS."
      );
    }

    assertServiceRoleKey(serviceKey);

    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
